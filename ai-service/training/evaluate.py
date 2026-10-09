"""Evaluación real de checkpoints sobre validation o test reservado."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from app.model_registry import ModelRegistry, RegistryValidationError, WeightsUnavailableError

from .checkpoints import CheckpointContractError, file_sha256, load_checkpoint
from .config import TrainingConfigError, load_training_config
from .dataset_loader import DatasetContractError, load_manifest_records
from .engine import build_data_loader, build_loss, measure_model_latency, run_epoch
from .modeling import build_efficientnet_b0, build_transforms
from .runtime import (
    TrainingDependencyError,
    require_training_dependencies,
    seed_everything,
    select_device,
    utc_now,
    write_json_atomic,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="python -m training.evaluate")
    parser.add_argument("--crop", required=True, choices=("CORN", "RED_BEAN", "ORANGE"))
    parser.add_argument("--model-version", required=True)
    parser.add_argument("--config", type=Path, default=Path("training/config.yaml"))
    parser.add_argument("--device", choices=("auto", "cpu", "cuda"), default="auto")
    parser.add_argument("--split", choices=("validation", "test"), default="validation")
    parser.add_argument(
        "--confirm-final-test",
        action="store_true",
        help="Obligatorio para consumir test como evaluación final",
    )
    parser.add_argument("--verify-hashes", action="store_true")
    parser.add_argument("--output", type=Path)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        evaluate(args)
    except (
        TrainingConfigError,
        DatasetContractError,
        TrainingDependencyError,
        RegistryValidationError,
        WeightsUnavailableError,
        CheckpointContractError,
        FileNotFoundError,
        RuntimeError,
        ValueError,
    ) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    return 0


def evaluate(args: argparse.Namespace) -> None:
    if args.split == "test" and not args.confirm_final_test:
        raise ValueError("Para evaluar test debes añadir --confirm-final-test explícitamente")
    config = load_training_config(args.config)
    crop = config.crop(args.crop)
    registry = ModelRegistry(config.outputs.registry)
    checkpoint_path = registry.require_checkpoint(crop.crop_type, args.model_version)
    registry_entry = registry.find(crop.crop_type, args.model_version)
    torch, torchvision = require_training_dependencies()
    device = select_device(torch, args.device)
    seed_everything(torch, config.training.seed)
    payload = load_checkpoint(
        checkpoint_path,
        map_location=device,
        torch_module=torch,
        expected_crop_type=crop.crop_type,
        expected_class_names=list(crop.class_names),
        expected_dataset_version=config.dataset.version,
    )
    records = load_manifest_records(
        config.dataset.root,
        config.dataset.manifest,
        crop.crop_type,
        args.split,
        crop.class_names,
        args.verify_hashes,
    )
    _, evaluation_transform = build_transforms(config.model)
    data_loader = build_data_loader(
        torch_module=torch,
        records=records,
        class_names=crop.class_names,
        transform=evaluation_transform,
        batch_size=config.training.batch_size,
        num_workers=config.training.num_workers,
        seed=config.training.seed,
        shuffle=False,
        pin_memory=device.type == "cuda",
    )
    model, _, _ = build_efficientnet_b0(len(crop.class_names), pretrained=False)
    model.load_state_dict(payload["modelState"])
    model.to(device)
    criterion = build_loss(
        torch,
        records,
        crop.class_names,
        device,
        "none",
        0.0,
    )
    metrics = run_epoch(
        torch_module=torch,
        model=model,
        data_loader=data_loader,
        criterion=criterion,
        device=device,
        class_names=crop.class_names,
    )
    first_images, _ = next(iter(data_loader))
    latency = measure_model_latency(
        torch_module=torch,
        model=model,
        sample=first_images,
        device=device,
    )
    report = {
        "schemaVersion": "1.0",
        "modelId": registry_entry["modelId"],
        "modelVersion": args.model_version,
        "architecture": config.model.architecture,
        "cropType": crop.crop_type,
        "classNames": list(crop.class_names),
        "datasetVersion": config.dataset.version,
        "split": args.split,
        "checkpointPath": checkpoint_path.as_posix(),
        "checkpointChecksum": file_sha256(checkpoint_path),
        "device": str(device),
        "frameworkVersion": {"torch": torch.__version__, "torchvision": torchvision.__version__},
        "metrics": metrics,
        "latency": latency,
        "evaluatedAt": utc_now(),
    }
    output = args.output or (
        config.outputs.reports / crop.crop_type / args.model_version / f"evaluation-{args.split}.json"
    )
    write_json_atomic(output, report)
    registry.record_evaluation(
        model_id=str(registry_entry["modelId"]),
        model_version=args.model_version,
        split=args.split,
        metrics={"classification": metrics, "latency": latency},
    )
    print(f"Evaluación {args.split} completada: {output}")


if __name__ == "__main__":
    raise SystemExit(main())

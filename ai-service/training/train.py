"""Entrenamiento en dos etapas de EfficientNet-B0 por cultivo."""

from __future__ import annotations

import argparse
import random
import sys
from pathlib import Path
from typing import Any

from app.model_registry import ModelRegistry

from .checkpoints import build_checkpoint_payload, load_checkpoint, save_checkpoint
from .config import TrainingConfig, TrainingConfigError, load_training_config
from .dataset_loader import DatasetContractError, assert_manifest_no_leakage, load_manifest_records
from .engine import EarlyStopping, build_data_loader, build_loss, run_epoch
from .modeling import (
    build_efficientnet_b0,
    build_transforms,
    freeze_feature_extractor,
    unfreeze_last_feature_blocks,
)
from .runtime import (
    TrainingDependencyError,
    require_training_dependencies,
    seed_everything,
    select_device,
    utc_now,
    write_json_atomic,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="python -m training.train")
    parser.add_argument("--crop", required=True, choices=("CORN", "RED_BEAN", "ORANGE"))
    parser.add_argument("--model-version", required=True)
    parser.add_argument("--config", type=Path, default=Path("training/config.yaml"))
    parser.add_argument("--device", choices=("auto", "cpu", "cuda"), default="auto")
    parser.add_argument("--resume", type=Path)
    parser.add_argument("--verify-hashes", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        train(args)
    except (
        TrainingConfigError,
        DatasetContractError,
        TrainingDependencyError,
        FileNotFoundError,
        RuntimeError,
        ValueError,
    ) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    return 0


def train(args: argparse.Namespace) -> None:
    config = load_training_config(args.config)
    crop = config.crop(args.crop)
    torch, torchvision = require_training_dependencies()
    device = select_device(torch, args.device)
    seed_everything(torch, config.training.seed)
    mixed_precision = _mixed_precision_enabled(config, device)

    train_records = load_manifest_records(
        config.dataset.root,
        config.dataset.manifest,
        crop.crop_type,
        "train",
        crop.class_names,
        args.verify_hashes,
    )
    validation_records = load_manifest_records(
        config.dataset.root,
        config.dataset.manifest,
        crop.crop_type,
        "validation",
        crop.class_names,
        args.verify_hashes,
    )
    assert_manifest_no_leakage([*train_records, *validation_records])
    train_transform, validation_transform = build_transforms(config.model)
    train_generator = torch.Generator()
    train_generator.manual_seed(config.training.seed)
    train_loader = build_data_loader(
        torch_module=torch,
        records=train_records,
        class_names=crop.class_names,
        transform=train_transform,
        batch_size=config.training.batch_size,
        num_workers=config.training.num_workers,
        seed=config.training.seed,
        shuffle=True,
        pin_memory=device.type == "cuda",
        generator=train_generator,
    )
    validation_loader = build_data_loader(
        torch_module=torch,
        records=validation_records,
        class_names=crop.class_names,
        transform=validation_transform,
        batch_size=config.training.batch_size,
        num_workers=config.training.num_workers,
        seed=config.training.seed,
        shuffle=False,
        pin_memory=device.type == "cuda",
    )

    model, _, _ = build_efficientnet_b0(len(crop.class_names), pretrained=args.resume is None)
    model.to(device)
    checkpoint_dir = config.outputs.checkpoints / crop.crop_type / args.model_version
    if checkpoint_dir.exists() and args.resume is None and any(checkpoint_dir.iterdir()):
        raise RuntimeError(
            f"La versión ya tiene archivos: {checkpoint_dir}. Usa --resume o una versión nueva."
        )
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    best_path = checkpoint_dir / "best.pt"
    last_path = checkpoint_dir / "last.pt"
    history: list[dict[str, object]] = []
    resume_payload: dict[str, object] | None = None
    best_validation_metrics: dict[str, object] | None = None
    if args.resume:
        resume_payload = load_checkpoint(
            args.resume,
            map_location=device,
            torch_module=torch,
            expected_crop_type=crop.crop_type,
            expected_class_names=list(crop.class_names),
            expected_dataset_version=config.dataset.version,
        )
        if resume_payload["modelVersion"] != args.model_version:
            raise ValueError("modelVersion de --resume no coincide con --model-version")
        model.load_state_dict(resume_payload["modelState"])
        random.setstate(resume_payload["randomState"])
        torch.set_rng_state(resume_payload["torchRandomState"])
        train_generator.set_state(resume_payload["dataLoaderRandomState"])
        if torch.cuda.is_available() and resume_payload["cudaRandomState"] is not None:
            torch.cuda.set_rng_state_all(resume_payload["cudaRandomState"])
        history = list(resume_payload["history"])
        best_validation_metrics = dict(resume_payload["bestValidationMetrics"])

    criterion = build_loss(
        torch,
        train_records,
        crop.class_names,
        device,
        config.training.class_weighting,
        config.training.label_smoothing,
    )
    stages = (
        ("classifier", config.training.stage1_epochs, config.training.stage1_learning_rate),
        ("fine_tuning", config.training.stage2_epochs, config.training.stage2_learning_rate),
    )
    global_epoch = 0
    global_best = -1.0
    resume_stage = str(resume_payload["stage"]) if resume_payload else None
    resume_epoch = int(resume_payload["epoch"]) if resume_payload else -1
    if resume_payload:
        global_epoch = resume_epoch + 1
        global_best = float(resume_payload["bestValidationMacroF1"])

    for stage_name, stage_epochs, learning_rate in stages:
        if resume_payload and _stage_order(stage_name) < _stage_order(resume_stage):
            continue
        if stage_name == "classifier":
            freeze_feature_extractor(model)
            stage_offset = 0
        else:
            if best_path.is_file() and not (resume_payload and resume_stage == "fine_tuning"):
                best_payload = load_checkpoint(best_path, map_location=device, torch_module=torch)
                model.load_state_dict(best_payload["modelState"])
            unfreeze_last_feature_blocks(model, config.training.progressive_unfreeze_blocks)
            stage_offset = config.training.stage1_epochs

        optimizer = torch.optim.AdamW(
            (parameter for parameter in model.parameters() if parameter.requires_grad),
            lr=learning_rate,
            weight_decay=config.training.weight_decay,
        )
        scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
            optimizer,
            mode="max",
            factor=config.training.scheduler.factor,
            patience=config.training.scheduler.patience,
            min_lr=config.training.scheduler.min_learning_rate,
        )
        scaler = torch.amp.GradScaler("cuda", enabled=mixed_precision)
        early_stopping = EarlyStopping(config.training.early_stopping_patience)
        start_epoch = 0
        if resume_payload and resume_stage == stage_name:
            optimizer.load_state_dict(resume_payload["optimizerState"])
            scheduler.load_state_dict(resume_payload["schedulerState"])
            scaler.load_state_dict(resume_payload["scalerState"])
            early_stopping.load_state_dict(resume_payload["earlyStoppingState"])
            start_epoch = max(0, resume_epoch - stage_offset + 1)

        for stage_epoch in range(start_epoch, stage_epochs):
            global_epoch = stage_offset + stage_epoch
            train_metrics = run_epoch(
                torch_module=torch,
                model=model,
                data_loader=train_loader,
                criterion=criterion,
                device=device,
                class_names=crop.class_names,
                optimizer=optimizer,
                scaler=scaler,
                mixed_precision=mixed_precision,
            )
            validation_metrics = run_epoch(
                torch_module=torch,
                model=model,
                data_loader=validation_loader,
                criterion=criterion,
                device=device,
                class_names=crop.class_names,
                mixed_precision=mixed_precision,
            )
            validation_macro_f1 = float(validation_metrics["macroF1"])
            scheduler.step(validation_macro_f1)
            stage_improved, should_stop = early_stopping.update(validation_macro_f1)
            globally_improved = validation_macro_f1 > global_best
            if globally_improved:
                global_best = validation_macro_f1
                best_validation_metrics = validation_metrics

            epoch_record = {
                "stage": stage_name,
                "epoch": global_epoch,
                "stageEpoch": stage_epoch,
                "learningRate": optimizer.param_groups[0]["lr"],
                "train": train_metrics,
                "validation": validation_metrics,
                "stageImproved": stage_improved,
                "globalBest": globally_improved,
            }
            history.append(epoch_record)
            checkpoint = _checkpoint_payload(
                config=config,
                crop_type=crop.crop_type,
                class_names=list(crop.class_names),
                model_version=args.model_version,
                stage=stage_name,
                epoch=global_epoch,
                best_score=global_best,
                best_validation_metrics=best_validation_metrics,
                model=model,
                optimizer=optimizer,
                scheduler=scheduler,
                scaler=scaler,
                early_stopping=early_stopping,
                torch=torch,
                train_generator=train_generator,
                history=history,
            )
            save_checkpoint(checkpoint, last_path, torch)
            if globally_improved:
                save_checkpoint(checkpoint, best_path, torch)
            print(
                f"{crop.crop_type} {stage_name} epoch={global_epoch} "
                f"val_macro_f1={validation_macro_f1:.4f}"
            )
            if should_stop:
                print(f"Early stopping en {stage_name} tras {early_stopping.bad_epochs} épocas sin mejora")
                break
        resume_payload = None

    if not best_path.is_file() or best_validation_metrics is None and global_best < 0:
        raise RuntimeError("El entrenamiento no produjo un checkpoint best.pt")
    if best_validation_metrics is None:
        best_payload = load_checkpoint(best_path, map_location="cpu", torch_module=torch)
        best_validation_metrics = dict(best_payload["bestValidationMetrics"])

    report = {
        "schemaVersion": "1.0",
        "cropType": crop.crop_type,
        "modelVersion": args.model_version,
        "architecture": config.model.architecture,
        "datasetVersion": config.dataset.version,
        "device": str(device),
        "mixedPrecision": mixed_precision,
        "classNames": list(crop.class_names),
        "bestValidationMetrics": best_validation_metrics,
        "history": history,
        "bestCheckpoint": best_path.as_posix(),
        "completedAt": utc_now(),
    }
    report_path = config.outputs.reports / crop.crop_type / args.model_version / "training.json"
    write_json_atomic(report_path, report)
    registry = ModelRegistry(config.outputs.registry)
    entry = registry.register_checkpoint(
        model_id=f"agrovision-efficientnet-b0-{crop.crop_type.casefold().replace('_', '-')}",
        model_version=args.model_version,
        architecture=config.model.architecture,
        crop_type=crop.crop_type,
        class_names=list(crop.class_names),
        dataset_version=config.dataset.version,
        checkpoint_path=best_path,
        preprocessing=_preprocessing(config),
        validation_metrics=best_validation_metrics,
        trained_at=utc_now(),
        framework_version={"torch": torch.__version__, "torchvision": torchvision.__version__},
    )
    print(f"Checkpoint registrado: {entry['modelId']}:{entry['modelVersion']}")
    print(f"Reporte: {report_path}")


def _checkpoint_payload(
    *,
    config: TrainingConfig,
    crop_type: str,
    class_names: list[str],
    model_version: str,
    stage: str,
    epoch: int,
    best_score: float,
    best_validation_metrics: dict[str, object] | None,
    model: Any,
    optimizer: Any,
    scheduler: Any,
    scaler: Any,
    early_stopping: EarlyStopping,
    torch: Any,
    train_generator: Any,
    history: list[dict[str, object]],
) -> dict[str, object]:
    if best_validation_metrics is None:
        raise RuntimeError("No hay metricas de validacion para construir el checkpoint")
    return build_checkpoint_payload(
        architecture=config.model.architecture,
        crop_type=crop_type,
        class_names=class_names,
        dataset_version=config.dataset.version,
        model_version=model_version,
        stage=stage,
        epoch=epoch,
        best_validation_macro_f1=best_score,
        best_validation_metrics=best_validation_metrics,
        model_state=model.state_dict(),
        optimizer_state=optimizer.state_dict(),
        scheduler_state=scheduler.state_dict(),
        scaler_state=scaler.state_dict(),
        early_stopping_state=early_stopping.state_dict(),
        history=history,
        random_state=random.getstate(),
        torch_random_state=torch.get_rng_state(),
        cuda_random_state=torch.cuda.get_rng_state_all() if torch.cuda.is_available() else None,
        data_loader_random_state=train_generator.get_state(),
    )


def _mixed_precision_enabled(config: TrainingConfig, device: Any) -> bool:
    setting = config.training.mixed_precision
    if setting == "true" and device.type != "cuda":
        raise RuntimeError("mixedPrecision=true requiere CUDA")
    return device.type == "cuda" and setting in {"auto", "true"}


def _stage_order(stage: str | None) -> int:
    return {"classifier": 0, "fine_tuning": 1}.get(stage or "", -1)


def _preprocessing(config: TrainingConfig) -> dict[str, object]:
    return {
        "inputSize": config.model.input_size,
        "resizeSize": config.model.resize_size,
        "mean": list(config.model.mean),
        "std": list(config.model.std),
    }


if __name__ == "__main__":
    raise SystemExit(main())

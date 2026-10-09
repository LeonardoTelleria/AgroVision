"""Exporta un checkpoint real a TorchScript con contrato y checksum."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from pathlib import Path

from app.model_registry import ModelRegistry, RegistryValidationError, WeightsUnavailableError

from .checkpoints import CheckpointContractError, file_sha256, load_checkpoint
from .config import TrainingConfigError, load_training_config
from .export_contract import EXPORT_SCHEMA_VERSION, ExportContractError, validate_export_contract
from .modeling import build_efficientnet_b0
from .runtime import TrainingDependencyError, require_training_dependencies, utc_now


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="python -m training.exportModel")
    parser.add_argument("--crop", required=True, choices=("CORN", "RED_BEAN", "ORANGE"))
    parser.add_argument("--model-version", required=True)
    parser.add_argument("--config", type=Path, default=Path("training/config.yaml"))
    parser.add_argument("--out", type=Path)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        export_model(args)
    except (
        TrainingConfigError,
        TrainingDependencyError,
        RegistryValidationError,
        WeightsUnavailableError,
        CheckpointContractError,
        ExportContractError,
        FileNotFoundError,
        RuntimeError,
        ValueError,
    ) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    return 0


def export_model(args: argparse.Namespace) -> None:
    config = load_training_config(args.config)
    crop = config.crop(args.crop)
    registry = ModelRegistry(config.outputs.registry)
    entry = registry.find(crop.crop_type, args.model_version)
    checkpoint_path = registry.require_checkpoint(crop.crop_type, args.model_version)
    torch, torchvision = require_training_dependencies()
    payload = load_checkpoint(
        checkpoint_path,
        map_location="cpu",
        torch_module=torch,
        expected_crop_type=crop.crop_type,
        expected_class_names=list(crop.class_names),
        expected_dataset_version=config.dataset.version,
    )
    model, _, _ = build_efficientnet_b0(len(crop.class_names), pretrained=False)
    model.load_state_dict(payload["modelState"])
    model.eval().cpu()
    output_dir = (args.out or config.outputs.exports / crop.crop_type / args.model_version).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    artifact = output_dir / "model.torchscript.pt"
    temporary = output_dir / ".model.torchscript.pt.tmp"
    try:
        scripted = torch.jit.script(model)
        torch.jit.save(scripted, temporary)
        os.replace(temporary, artifact)
    finally:
        if temporary.exists():
            temporary.unlink()

    contract = {
        "schemaVersion": EXPORT_SCHEMA_VERSION,
        "modelId": entry["modelId"],
        "modelVersion": args.model_version,
        "architecture": config.model.architecture,
        "cropType": crop.crop_type,
        "classNames": list(crop.class_names),
        "datasetVersion": config.dataset.version,
        "format": "torchscript",
        "artifactPath": artifact.name,
        "preprocessing": entry["preprocessing"],
        "frameworkVersion": {"torch": torch.__version__, "torchvision": torchvision.__version__},
        "checkpointChecksum": file_sha256(checkpoint_path),
        "artifactChecksum": _file_sha256(artifact),
        "exportedAt": utc_now(),
    }
    validate_export_contract(contract, output_dir)
    contract_path = output_dir / "model.contract.json"
    temporary_contract = output_dir / ".model.contract.json.tmp"
    temporary_contract.write_text(
        json.dumps(contract, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    os.replace(temporary_contract, contract_path)
    registry.mark_exported(
        model_id=str(entry["modelId"]),
        model_version=args.model_version,
        export_contract=contract,
    )
    print(f"TorchScript: {artifact}")
    print(f"Contrato: {contract_path}")


def _file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


if __name__ == "__main__":
    raise SystemExit(main())

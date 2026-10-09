"""Checkpointing atómico, reanudable y validado."""

from __future__ import annotations

import hashlib
import os
from pathlib import Path
from typing import Any

from .runtime import require_training_dependencies, utc_now


CHECKPOINT_SCHEMA_VERSION = "1.0"
REQUIRED_KEYS = {
    "schemaVersion",
    "architecture",
    "cropType",
    "classNames",
    "datasetVersion",
    "modelVersion",
    "stage",
    "epoch",
    "bestValidationMacroF1",
    "bestValidationMetrics",
    "modelState",
    "optimizerState",
    "schedulerState",
    "scalerState",
    "earlyStoppingState",
    "history",
    "randomState",
    "torchRandomState",
    "cudaRandomState",
    "dataLoaderRandomState",
    "savedAt",
}


class CheckpointContractError(ValueError):
    """Checkpoint ausente, corrupto o incompatible con el entrenamiento solicitado."""


def build_checkpoint_payload(
    *,
    architecture: str,
    crop_type: str,
    class_names: list[str],
    dataset_version: str,
    model_version: str,
    stage: str,
    epoch: int,
    best_validation_macro_f1: float,
    best_validation_metrics: dict[str, object],
    model_state: object,
    optimizer_state: object,
    scheduler_state: object,
    scaler_state: object,
    early_stopping_state: dict[str, object],
    history: list[dict[str, object]],
    random_state: object,
    torch_random_state: object,
    cuda_random_state: object | None,
    data_loader_random_state: object,
) -> dict[str, object]:
    payload = {
        "schemaVersion": CHECKPOINT_SCHEMA_VERSION,
        "architecture": architecture,
        "cropType": crop_type,
        "classNames": class_names,
        "datasetVersion": dataset_version,
        "modelVersion": model_version,
        "stage": stage,
        "epoch": epoch,
        "bestValidationMacroF1": best_validation_macro_f1,
        "bestValidationMetrics": best_validation_metrics,
        "modelState": model_state,
        "optimizerState": optimizer_state,
        "schedulerState": scheduler_state,
        "scalerState": scaler_state,
        "earlyStoppingState": early_stopping_state,
        "history": history,
        "randomState": random_state,
        "torchRandomState": torch_random_state,
        "cudaRandomState": cuda_random_state,
        "dataLoaderRandomState": data_loader_random_state,
        "savedAt": utc_now(),
    }
    validate_checkpoint(payload)
    return payload


def validate_checkpoint(
    payload: object,
    *,
    expected_crop_type: str | None = None,
    expected_class_names: list[str] | None = None,
    expected_dataset_version: str | None = None,
) -> dict[str, object]:
    if not isinstance(payload, dict):
        raise CheckpointContractError("El checkpoint no contiene un objeto")
    missing = REQUIRED_KEYS.difference(payload)
    if missing:
        raise CheckpointContractError(f"Checkpoint incompleto: {sorted(missing)}")
    if payload.get("schemaVersion") != CHECKPOINT_SCHEMA_VERSION:
        raise CheckpointContractError("schemaVersion de checkpoint no soportado")
    class_names = payload.get("classNames")
    if not isinstance(class_names, list) or not class_names or not all(
        isinstance(value, str) and value for value in class_names
    ):
        raise CheckpointContractError("classNames inválido en checkpoint")
    if not isinstance(payload.get("epoch"), int) or payload["epoch"] < 0:
        raise CheckpointContractError("epoch inválido en checkpoint")
    macro_f1 = payload.get("bestValidationMacroF1")
    if not isinstance(macro_f1, (int, float)) or not 0 <= macro_f1 <= 1:
        raise CheckpointContractError("bestValidationMacroF1 inválido")
    best_metrics = payload.get("bestValidationMetrics")
    if (
        not isinstance(best_metrics, dict)
        or not isinstance(best_metrics.get("macroF1"), (int, float))
        or abs(float(best_metrics["macroF1"]) - float(macro_f1)) > 1e-12
    ):
        raise CheckpointContractError("bestValidationMetrics no coincide con macro-F1")
    if not isinstance(payload.get("scalerState"), dict):
        raise CheckpointContractError("scalerState invalido")
    if not isinstance(payload.get("history"), list):
        raise CheckpointContractError("history invalido")
    if expected_crop_type and payload.get("cropType") != expected_crop_type:
        raise CheckpointContractError("cropType del checkpoint no coincide")
    if expected_class_names and class_names != expected_class_names:
        raise CheckpointContractError("classNames del checkpoint no coincide")
    if expected_dataset_version and payload.get("datasetVersion") != expected_dataset_version:
        raise CheckpointContractError("datasetVersion del checkpoint no coincide")
    return payload


def save_checkpoint(payload: dict[str, object], path: Path, torch_module: Any | None = None) -> str:
    validate_checkpoint(payload)
    if torch_module is None:
        torch_module, _ = require_training_dependencies()
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.tmp")
    try:
        torch_module.save(payload, temporary)
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()
    return file_sha256(path)


def load_checkpoint(
    path: Path,
    *,
    map_location: object = "cpu",
    torch_module: Any | None = None,
    expected_crop_type: str | None = None,
    expected_class_names: list[str] | None = None,
    expected_dataset_version: str | None = None,
) -> dict[str, object]:
    if not path.is_file():
        raise FileNotFoundError(f"Checkpoint no encontrado: {path}")
    if torch_module is None:
        torch_module, _ = require_training_dependencies()
    try:
        payload = torch_module.load(path, map_location=map_location, weights_only=True)
    except Exception as exc:
        raise CheckpointContractError(f"No se pudo leer el checkpoint {path}: {exc}") from exc
    return validate_checkpoint(
        payload,
        expected_crop_type=expected_crop_type,
        expected_class_names=expected_class_names,
        expected_dataset_version=expected_dataset_version,
    )


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

"""Model Registry JSON con checksums e invariantes para impedir pesos ficticios."""

from __future__ import annotations

import hashlib
import json
import os
from copy import deepcopy
from pathlib import Path
from typing import Any


REGISTRY_SCHEMA_VERSION = "1.0"
VALID_STATUSES = {"NOT_TRAINED", "TRAINED", "EVALUATED", "EXPORTED"}
REQUIRED_MODEL_FIELDS = {
    "modelId",
    "modelVersion",
    "status",
    "architecture",
    "cropType",
    "classNames",
    "datasetVersion",
    "checkpointPath",
    "preprocessing",
    "metrics",
    "trainedAt",
    "frameworkVersion",
    "checksum",
}


class RegistryValidationError(ValueError):
    """El registro o una versión de modelo no cumple el contrato."""


class WeightsUnavailableError(FileNotFoundError):
    """Una versión no entrenada o sus pesos reales no están disponibles."""


class ModelRegistry:
    def __init__(self, path: Path) -> None:
        self.path = path.resolve()
        self._document = self._load()

    @property
    def models(self) -> tuple[dict[str, object], ...]:
        return tuple(deepcopy(self._document["models"]))

    def find(self, crop_type: str, model_version: str | None = None) -> dict[str, object]:
        candidates = [
            model for model in self._document["models"]
            if model["cropType"] == crop_type
            and (model_version is None or model["modelVersion"] == model_version)
        ]
        if not candidates:
            raise KeyError(f"No existe modelo para {crop_type} versión {model_version or 'latest'}")
        trained = [model for model in candidates if model["status"] != "NOT_TRAINED"]
        selected = sorted(trained or candidates, key=lambda item: str(item["modelVersion"]))[-1]
        return deepcopy(selected)

    def require_checkpoint(self, crop_type: str, model_version: str | None = None) -> Path:
        model = self.find(crop_type, model_version)
        if model["status"] == "NOT_TRAINED" or model["checkpointPath"] is None:
            raise WeightsUnavailableError(
                f"{crop_type} está NOT_TRAINED; no existe checkpoint real registrado"
            )
        checkpoint = (self.path.parent / str(model["checkpointPath"])).resolve()
        if not checkpoint.is_file():
            raise WeightsUnavailableError(f"Checkpoint registrado no encontrado: {checkpoint}")
        checksum = _file_sha256(checkpoint)
        if checksum != model["checksum"]:
            raise WeightsUnavailableError(
                f"Checksum inválido para {model['modelId']}:{model['modelVersion']}"
            )
        return checkpoint

    def register_checkpoint(
        self,
        *,
        model_id: str,
        model_version: str,
        architecture: str,
        crop_type: str,
        class_names: list[str],
        dataset_version: str,
        checkpoint_path: Path,
        preprocessing: dict[str, object],
        validation_metrics: dict[str, object],
        trained_at: str,
        framework_version: dict[str, str],
    ) -> dict[str, object]:
        checkpoint = checkpoint_path.resolve()
        if not checkpoint.is_file():
            raise WeightsUnavailableError(f"No se puede registrar un checkpoint inexistente: {checkpoint}")
        if any(
            model["modelId"] == model_id and model["modelVersion"] == model_version
            for model in self._document["models"]
        ):
            raise RegistryValidationError(f"La versión ya está registrada: {model_id}:{model_version}")
        relative_checkpoint = os.path.relpath(checkpoint, self.path.parent).replace("\\", "/")
        entry: dict[str, object] = {
            "modelId": model_id,
            "modelVersion": model_version,
            "status": "TRAINED",
            "architecture": architecture,
            "cropType": crop_type,
            "classNames": class_names,
            "datasetVersion": dataset_version,
            "checkpointPath": relative_checkpoint,
            "preprocessing": preprocessing,
            "metrics": {"validation": validation_metrics},
            "trainedAt": trained_at,
            "frameworkVersion": framework_version,
            "checksum": _file_sha256(checkpoint),
        }
        _validate_model(entry)
        self._document["models"].append(entry)
        self._write()
        return deepcopy(entry)

    def record_evaluation(
        self,
        *,
        model_id: str,
        model_version: str,
        split: str,
        metrics: dict[str, object],
    ) -> dict[str, object]:
        if split not in {"validation", "test"}:
            raise RegistryValidationError("Solo se registran métricas validation o test")
        entry = self._find_mutable(model_id, model_version)
        if entry["status"] == "NOT_TRAINED":
            raise WeightsUnavailableError("No se pueden registrar métricas sin pesos reales")
        self.require_checkpoint(str(entry["cropType"]), model_version)
        stored_metrics = entry.get("metrics")
        if not isinstance(stored_metrics, dict):
            stored_metrics = {}
        stored_metrics[split] = deepcopy(metrics)
        entry["metrics"] = stored_metrics
        entry["status"] = "EVALUATED"
        _validate_model(entry)
        self._write()
        return deepcopy(entry)

    def mark_exported(
        self,
        *,
        model_id: str,
        model_version: str,
        export_contract: dict[str, object],
    ) -> dict[str, object]:
        entry = self._find_mutable(model_id, model_version)
        if entry["status"] == "NOT_TRAINED":
            raise WeightsUnavailableError("No se puede exportar un modelo NOT_TRAINED")
        entry["status"] = "EXPORTED"
        entry["export"] = deepcopy(export_contract)
        _validate_model(entry)
        self._write()
        return deepcopy(entry)

    def _find_mutable(self, model_id: str, model_version: str) -> dict[str, object]:
        for model in self._document["models"]:
            if model["modelId"] == model_id and model["modelVersion"] == model_version:
                return model
        raise KeyError(f"Modelo no registrado: {model_id}:{model_version}")

    def _load(self) -> dict[str, Any]:
        try:
            document = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RegistryValidationError(f"No se pudo leer Model Registry {self.path}: {exc}") from exc
        _validate_document(document)
        return document

    def _write(self) -> None:
        _validate_document(self._document)
        temporary = self.path.with_name(f".{self.path.name}.tmp")
        temporary.write_text(
            json.dumps(self._document, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        os.replace(temporary, self.path)


def _validate_document(document: object) -> None:
    if not isinstance(document, dict) or document.get("schemaVersion") != REGISTRY_SCHEMA_VERSION:
        raise RegistryValidationError("schemaVersion del registro inválido")
    models = document.get("models")
    if not isinstance(models, list):
        raise RegistryValidationError("models debe ser una lista")
    keys: set[tuple[object, object]] = set()
    for model in models:
        _validate_model(model)
        key = (model["modelId"], model["modelVersion"])
        if key in keys:
            raise RegistryValidationError(f"Versión duplicada en registro: {key}")
        keys.add(key)


def _validate_model(model: object) -> None:
    if not isinstance(model, dict):
        raise RegistryValidationError("Cada modelo debe ser un objeto")
    missing = REQUIRED_MODEL_FIELDS.difference(model)
    if missing:
        raise RegistryValidationError(f"Modelo incompleto: {sorted(missing)}")
    for field in ("modelId", "modelVersion", "architecture", "cropType", "datasetVersion"):
        if not isinstance(model.get(field), str) or not model[field]:
            raise RegistryValidationError(f"{field} inválido")
    if model["cropType"] not in {"CORN", "RED_BEAN", "ORANGE"}:
        raise RegistryValidationError(f"cropType no soportado: {model['cropType']}")
    if model["status"] not in VALID_STATUSES:
        raise RegistryValidationError(f"status inválido: {model['status']}")
    class_names = model["classNames"]
    if not isinstance(class_names, list) or not class_names or len(set(class_names)) != len(class_names):
        raise RegistryValidationError("classNames inválido")
    preprocessing = model["preprocessing"]
    if not isinstance(preprocessing, dict) or not {"inputSize", "resizeSize", "mean", "std"}.issubset(preprocessing):
        raise RegistryValidationError("preprocessing incompleto")

    nullable = (
        model["checkpointPath"], model["metrics"], model["trainedAt"],
        model["frameworkVersion"], model["checksum"],
    )
    if model["status"] == "NOT_TRAINED":
        if any(value is not None for value in nullable):
            raise RegistryValidationError("NOT_TRAINED no puede declarar pesos, métricas o entrenamiento")
        return
    if not isinstance(model["checkpointPath"], str) or not model["checkpointPath"]:
        raise RegistryValidationError("Un modelo entrenado requiere checkpointPath")
    if not isinstance(model["trainedAt"], str) or not model["trainedAt"]:
        raise RegistryValidationError("Un modelo entrenado requiere trainedAt")
    if not isinstance(model["frameworkVersion"], dict):
        raise RegistryValidationError("Un modelo entrenado requiere frameworkVersion")
    checksum = model["checksum"]
    if not isinstance(checksum, str) or len(checksum) != 64 or any(
        character not in "0123456789abcdef" for character in checksum.casefold()
    ):
        raise RegistryValidationError("checksum SHA256 inválido")
    if model["metrics"] is not None and not isinstance(model["metrics"], dict):
        raise RegistryValidationError("metrics debe ser objeto o null")


def _file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

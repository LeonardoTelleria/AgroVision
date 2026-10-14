"""Carga verificada, concurrente y cacheada de modelos Vision AI."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from threading import Lock, RLock
from typing import Any

from app.model_registry import ModelRegistry
from training.checkpoints import load_checkpoint
from training.export_contract import validate_export_contract
from training.modeling import build_efficientnet_b0
from training.runtime import require_training_dependencies

from .errors import ModelUnavailableError


EXPECTED_CLASSES = {
    "CORN": ("blight", "common_rust", "gray_leaf_spot", "healthy"),
    "ORANGE": ("black_spot", "canker", "greening", "healthy", "melanose"),
}
STATUS_CROPS = ("CORN", "ORANGE", "RED_BEAN")


@dataclass(frozen=True)
class ModelMetadata:
    model_id: str
    model_version: str
    architecture: str
    crop_type: str
    class_names: tuple[str, ...]
    dataset_version: str
    input_size: int
    resize_size: int
    mean: tuple[float, float, float]
    std: tuple[float, float, float]


@dataclass
class LoadedModel:
    model: Any
    torch: Any
    torchvision: Any
    metadata: ModelMetadata
    artifact_format: str
    inference_lock: Any = field(default_factory=Lock, repr=False)


@dataclass(frozen=True)
class ModelStatus:
    crop_type: str
    available: bool
    cached: bool
    state: str
    model_id: str | None = None
    model_version: str | None = None
    architecture: str | None = None
    class_names: tuple[str, ...] = ()
    artifact_format: str | None = None
    message: str | None = None


class ModelLoader:
    """Selecciona modelos por cultivo y los conserva en memoria."""

    def __init__(
        self,
        registry_path: Path | None = None,
        exports_root: Path | None = None,
        *,
        prefer_torchscript: bool = True,
    ) -> None:
        service_root = Path(__file__).resolve().parents[2]
        self.registry_path = (registry_path or service_root / "model_registry" / "registry.json").resolve()
        self.exports_root = (exports_root or service_root / "exports").resolve()
        self.prefer_torchscript = prefer_torchscript
        self._cache: dict[str, LoadedModel] = {}
        self._load_lock = RLock()

    def get_model(self, crop_type: str) -> LoadedModel:
        cached = self._cache.get(crop_type)
        if cached is not None:
            return cached
        with self._load_lock:
            cached = self._cache.get(crop_type)
            if cached is not None:
                return cached
            loaded = self._load(crop_type)
            self._cache[crop_type] = loaded
            return loaded

    def warm(self, crop_types: tuple[str, ...] = ("CORN", "ORANGE")) -> None:
        for crop_type in crop_types:
            try:
                self.get_model(crop_type)
            except ModelUnavailableError:
                # El servicio debe iniciar y responder 503 por cultivo, no caer completo.
                continue

    def statuses(self) -> tuple[ModelStatus, ...]:
        return tuple(self._status(crop_type) for crop_type in STATUS_CROPS)

    def _registry(self) -> ModelRegistry:
        try:
            return ModelRegistry(self.registry_path)
        except Exception as exc:
            raise ModelUnavailableError("El registro de modelos no está disponible o es inválido.") from exc

    def _entry(self, registry: ModelRegistry, crop_type: str) -> dict[str, object]:
        if crop_type not in EXPECTED_CLASSES:
            raise ModelUnavailableError(f"No existe un modelo entrenado disponible para {crop_type}.")
        try:
            entry = registry.find(crop_type)
        except (KeyError, ValueError) as exc:
            raise ModelUnavailableError(f"No existe un modelo registrado para {crop_type}.") from exc
        if entry.get("status") == "NOT_TRAINED" or entry.get("checkpointPath") is None:
            raise ModelUnavailableError(f"El modelo de {crop_type} todavía no está entrenado.")
        return entry

    def _load(self, crop_type: str) -> LoadedModel:
        registry = self._registry()
        entry = self._entry(registry, crop_type)
        metadata = _metadata(entry)
        torch, torchvision = _dependencies()

        if self.prefer_torchscript:
            exported = self._try_export(metadata, entry, torch, torchvision)
            if exported is not None:
                return exported

        try:
            checkpoint_path = registry.require_checkpoint(crop_type, metadata.model_version)
            payload = load_checkpoint(
                checkpoint_path,
                map_location="cpu",
                torch_module=torch,
                expected_crop_type=crop_type,
                expected_class_names=list(metadata.class_names),
                expected_dataset_version=metadata.dataset_version,
            )
            _validate_checkpoint_metadata(payload, metadata)
            model, _, _ = build_efficientnet_b0(len(metadata.class_names), pretrained=False)
            model.load_state_dict(payload["modelState"], strict=True)
            model.eval().cpu()
        except Exception as exc:
            raise ModelUnavailableError(
                f"El checkpoint registrado para {crop_type} falta, está alterado o es incompatible."
            ) from exc
        return LoadedModel(model, torch, torchvision, metadata, "checkpoint")

    def _try_export(
        self,
        metadata: ModelMetadata,
        entry: dict[str, object],
        torch: Any,
        torchvision: Any,
    ) -> LoadedModel | None:
        output_dir = self.exports_root / metadata.crop_type / metadata.model_version
        contract_path = output_dir / "model.contract.json"
        if not contract_path.is_file():
            return None
        try:
            contract = json.loads(contract_path.read_text(encoding="utf-8"))
            validate_export_contract(contract, output_dir)
            expected = {
                "modelId": metadata.model_id,
                "modelVersion": metadata.model_version,
                "architecture": metadata.architecture,
                "cropType": metadata.crop_type,
                "classNames": list(metadata.class_names),
                "datasetVersion": metadata.dataset_version,
                "preprocessing": entry["preprocessing"],
                "checkpointChecksum": entry["checksum"],
            }
            if any(contract.get(key) != value for key, value in expected.items()):
                return None
            artifact = (output_dir / str(contract["artifactPath"])).resolve()
            model = torch.jit.load(str(artifact), map_location="cpu")
            model.eval()
            return LoadedModel(model, torch, torchvision, metadata, "torchscript")
        except Exception:
            # Un export inválido nunca desplaza al checkpoint firmado del registro.
            return None

    def _status(self, crop_type: str) -> ModelStatus:
        cached = self._cache.get(crop_type)
        if cached is not None:
            meta = cached.metadata
            return ModelStatus(
                crop_type, True, True, "AVAILABLE", meta.model_id, meta.model_version,
                meta.architecture, meta.class_names, cached.artifact_format,
            )
        try:
            registry = self._registry()
            entry = self._entry(registry, crop_type)
            meta = _metadata(entry)
            _dependencies()
            registry.require_checkpoint(crop_type, meta.model_version)
            artifact_format = "checkpoint"
            if self.prefer_torchscript and (self.exports_root / crop_type / meta.model_version / "model.contract.json").is_file():
                artifact_format = "torchscript-or-checkpoint"
            return ModelStatus(
                crop_type, True, False, str(entry["status"]), meta.model_id,
                meta.model_version, meta.architecture, meta.class_names, artifact_format,
            )
        except ModelUnavailableError as exc:
            return ModelStatus(crop_type, False, False, "NOT_AVAILABLE", message=str(exc))
        except Exception:
            return ModelStatus(
                crop_type, False, False, "NOT_AVAILABLE",
                message=f"El modelo de {crop_type} no está disponible o no supera la verificación de integridad.",
            )


def _dependencies() -> tuple[Any, Any]:
    try:
        return require_training_dependencies()
    except Exception as exc:
        raise ModelUnavailableError("PyTorch y Torchvision no están instalados en el AI Service.") from exc


def _metadata(entry: dict[str, object]) -> ModelMetadata:
    crop_type = str(entry.get("cropType", ""))
    class_names = tuple(entry.get("classNames", ()))
    if class_names != EXPECTED_CLASSES.get(crop_type):
        raise ModelUnavailableError(f"El orden de clases registrado para {crop_type} es incompatible.")
    if entry.get("architecture") != "efficientnet_b0":
        raise ModelUnavailableError("La arquitectura registrada no es compatible con Vision AI v1.")
    preprocessing = entry.get("preprocessing")
    if not isinstance(preprocessing, dict):
        raise ModelUnavailableError("Los metadatos de preprocesamiento están incompletos.")
    try:
        input_size = int(preprocessing["inputSize"])
        resize_size = int(preprocessing["resizeSize"])
        mean = tuple(float(value) for value in preprocessing["mean"])
        std = tuple(float(value) for value in preprocessing["std"])
    except (KeyError, TypeError, ValueError) as exc:
        raise ModelUnavailableError("Los metadatos de preprocesamiento son inválidos.") from exc
    if input_size != 224 or resize_size != 256 or len(mean) != 3 or len(std) != 3 or any(value <= 0 for value in std):
        raise ModelUnavailableError("El preprocesamiento registrado no coincide con EfficientNet-B0 v1.")
    return ModelMetadata(
        model_id=str(entry["modelId"]),
        model_version=str(entry["modelVersion"]),
        architecture=str(entry["architecture"]),
        crop_type=crop_type,
        class_names=class_names,
        dataset_version=str(entry["datasetVersion"]),
        input_size=input_size,
        resize_size=resize_size,
        mean=mean,  # type: ignore[arg-type]
        std=std,  # type: ignore[arg-type]
    )


def _validate_checkpoint_metadata(payload: dict[str, object], metadata: ModelMetadata) -> None:
    expected = {
        "architecture": metadata.architecture,
        "cropType": metadata.crop_type,
        "classNames": list(metadata.class_names),
        "datasetVersion": metadata.dataset_version,
        "modelVersion": metadata.model_version,
    }
    if any(payload.get(key) != value for key, value in expected.items()):
        raise ModelUnavailableError("Los metadatos del checkpoint no coinciden con el registro.")

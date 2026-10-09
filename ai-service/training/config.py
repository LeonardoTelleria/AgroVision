"""Contratos y validación de ``training/config.yaml``."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from app.dataset_manager.config import load_config as load_dataset_config


SUPPORTED_CROPS = ("CORN", "RED_BEAN", "ORANGE")


class TrainingConfigError(ValueError):
    """La configuración de entrenamiento no es segura o coherente."""


@dataclass(frozen=True)
class DatasetSettings:
    root: Path
    manifest: str
    dataset_config: Path
    version: str


@dataclass(frozen=True)
class ModelSettings:
    architecture: str
    pretrained_weights: str
    input_size: int
    resize_size: int
    mean: tuple[float, float, float]
    std: tuple[float, float, float]


@dataclass(frozen=True)
class CropSettings:
    crop_type: str
    class_names: tuple[str, ...]


@dataclass(frozen=True)
class SchedulerSettings:
    factor: float
    patience: int
    min_learning_rate: float


@dataclass(frozen=True)
class OptimizationSettings:
    seed: int
    batch_size: int
    num_workers: int
    stage1_epochs: int
    stage2_epochs: int
    stage1_learning_rate: float
    stage2_learning_rate: float
    weight_decay: float
    label_smoothing: float
    progressive_unfreeze_blocks: int
    early_stopping_patience: int
    class_weighting: str
    mixed_precision: str
    scheduler: SchedulerSettings


@dataclass(frozen=True)
class OutputSettings:
    checkpoints: Path
    reports: Path
    registry: Path
    exports: Path


@dataclass(frozen=True)
class TrainingConfig:
    schema_version: str
    config_path: Path
    dataset: DatasetSettings
    model: ModelSettings
    crops: dict[str, CropSettings]
    training: OptimizationSettings
    outputs: OutputSettings

    def crop(self, crop_type: str) -> CropSettings:
        try:
            return self.crops[crop_type]
        except KeyError as exc:
            raise TrainingConfigError(
                f"Cultivo no configurado: {crop_type}. Permitidos: {', '.join(self.crops)}"
            ) from exc


def _mapping(value: object, context: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise TrainingConfigError(f"{context} debe ser un objeto")
    return value


def _text(value: object, context: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise TrainingConfigError(f"{context} debe ser texto no vacío")
    return value.strip()


def _integer(value: object, context: str, minimum: int = 0) -> int:
    if not isinstance(value, int) or isinstance(value, bool) or value < minimum:
        raise TrainingConfigError(f"{context} debe ser entero >= {minimum}")
    return value


def _number(value: object, context: str, minimum: float = 0.0, maximum: float | None = None) -> float:
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise TrainingConfigError(f"{context} debe ser numérico")
    result = float(value)
    if result < minimum or (maximum is not None and result > maximum):
        raise TrainingConfigError(f"{context} fuera del rango permitido")
    return result


def _triplet(value: object, context: str) -> tuple[float, float, float]:
    if not isinstance(value, list) or len(value) != 3:
        raise TrainingConfigError(f"{context} debe contener tres números")
    return tuple(_number(item, context) for item in value)  # type: ignore[return-value]


def _resolve(base: Path, value: object, context: str) -> Path:
    return (base / _text(value, context)).resolve()


def load_training_config(path: Path) -> TrainingConfig:
    config_path = path.resolve()
    try:
        document = yaml.safe_load(config_path.read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as exc:
        raise TrainingConfigError(f"No se pudo leer {config_path}: {exc}") from exc
    root = _mapping(document, "raíz")
    schema_version = _text(root.get("schemaVersion"), "schemaVersion")
    if schema_version != "1.0":
        raise TrainingConfigError(f"schemaVersion no soportado: {schema_version}")

    base = config_path.parent
    dataset_raw = _mapping(root.get("dataset"), "dataset")
    model_raw = _mapping(root.get("model"), "model")
    normalization = _mapping(model_raw.get("normalization"), "model.normalization")
    training_raw = _mapping(root.get("training"), "training")
    scheduler_raw = _mapping(training_raw.get("scheduler"), "training.scheduler")
    outputs_raw = _mapping(root.get("outputs"), "outputs")

    architecture = _text(model_raw.get("architecture"), "model.architecture")
    if architecture != "efficientnet_b0":
        raise TrainingConfigError("Training Engine v1 solo admite efficientnet_b0")
    weights = _text(model_raw.get("pretrainedWeights"), "model.pretrainedWeights")
    if weights != "IMAGENET1K_V1":
        raise TrainingConfigError("Los pesos configurados deben ser IMAGENET1K_V1")

    class_config_raw = _mapping(root.get("crops"), "crops")
    if set(class_config_raw) != set(SUPPORTED_CROPS):
        raise TrainingConfigError(f"crops debe contener exactamente {SUPPORTED_CROPS}")
    crops: dict[str, CropSettings] = {}
    for crop_type in SUPPORTED_CROPS:
        crop_raw = _mapping(class_config_raw[crop_type], f"crops.{crop_type}")
        class_names_raw = crop_raw.get("classNames")
        if (
            not isinstance(class_names_raw, list)
            or not class_names_raw
            or not all(isinstance(item, str) and item.strip() for item in class_names_raw)
        ):
            raise TrainingConfigError(f"crops.{crop_type}.classNames inválido")
        class_names = tuple(item.strip() for item in class_names_raw)
        if len(class_names) != len(set(class_names)):
            raise TrainingConfigError(f"Clases duplicadas en {crop_type}")
        crops[crop_type] = CropSettings(crop_type, class_names)

    dataset_config_path = _resolve(
        base, dataset_raw.get("datasetConfig"), "dataset.datasetConfig"
    )
    dataset_contract = load_dataset_config(dataset_config_path)
    configured_labels = {
        dataset.crop_type: set(dataset.labels) for dataset in dataset_contract.datasets
    }
    for crop_type, crop in crops.items():
        if set(crop.class_names) != configured_labels.get(crop_type, set()):
            raise TrainingConfigError(
                f"classNames de {crop_type} no coincide con config/datasets.yaml"
            )

    class_weighting = _text(training_raw.get("classWeighting"), "training.classWeighting")
    if class_weighting not in {"auto", "none"}:
        raise TrainingConfigError("classWeighting debe ser auto o none")
    mixed_precision_value = training_raw.get("mixedPrecision")
    if isinstance(mixed_precision_value, bool):
        mixed_precision = "true" if mixed_precision_value else "false"
    else:
        mixed_precision = _text(mixed_precision_value, "training.mixedPrecision").casefold()
    if mixed_precision not in {"auto", "true", "false"}:
        raise TrainingConfigError("mixedPrecision debe ser auto, true o false")

    dataset = DatasetSettings(
        root=_resolve(base, dataset_raw.get("root"), "dataset.root"),
        manifest=_text(dataset_raw.get("manifest"), "dataset.manifest"),
        dataset_config=dataset_config_path,
        version=_text(dataset_raw.get("version"), "dataset.version"),
    )
    model = ModelSettings(
        architecture=architecture,
        pretrained_weights=weights,
        input_size=_integer(model_raw.get("inputSize"), "model.inputSize", 1),
        resize_size=_integer(model_raw.get("resizeSize"), "model.resizeSize", 1),
        mean=_triplet(normalization.get("mean"), "model.normalization.mean"),
        std=_triplet(normalization.get("std"), "model.normalization.std"),
    )
    if model.resize_size < model.input_size:
        raise TrainingConfigError("resizeSize no puede ser menor que inputSize")

    optimization = OptimizationSettings(
        seed=_integer(training_raw.get("seed"), "training.seed"),
        batch_size=_integer(training_raw.get("batchSize"), "training.batchSize", 1),
        num_workers=_integer(training_raw.get("numWorkers"), "training.numWorkers"),
        stage1_epochs=_integer(training_raw.get("stage1Epochs"), "training.stage1Epochs", 1),
        stage2_epochs=_integer(training_raw.get("stage2Epochs"), "training.stage2Epochs", 1),
        stage1_learning_rate=_number(
            training_raw.get("stage1LearningRate"), "training.stage1LearningRate", 1e-12
        ),
        stage2_learning_rate=_number(
            training_raw.get("stage2LearningRate"), "training.stage2LearningRate", 1e-12
        ),
        weight_decay=_number(training_raw.get("weightDecay"), "training.weightDecay"),
        label_smoothing=_number(
            training_raw.get("labelSmoothing"), "training.labelSmoothing", 0.0, 1.0
        ),
        progressive_unfreeze_blocks=_integer(
            training_raw.get("progressiveUnfreezeBlocks"),
            "training.progressiveUnfreezeBlocks",
            1,
        ),
        early_stopping_patience=_integer(
            training_raw.get("earlyStoppingPatience"), "training.earlyStoppingPatience", 1
        ),
        class_weighting=class_weighting,
        mixed_precision=mixed_precision,
        scheduler=SchedulerSettings(
            factor=_number(scheduler_raw.get("factor"), "training.scheduler.factor", 1e-9, 0.999999),
            patience=_integer(scheduler_raw.get("patience"), "training.scheduler.patience"),
            min_learning_rate=_number(
                scheduler_raw.get("minLearningRate"), "training.scheduler.minLearningRate", 0.0
            ),
        ),
    )
    if optimization.stage2_learning_rate > optimization.stage1_learning_rate:
        raise TrainingConfigError("stage2LearningRate no debe superar stage1LearningRate")

    outputs = OutputSettings(
        checkpoints=_resolve(base, outputs_raw.get("checkpoints"), "outputs.checkpoints"),
        reports=_resolve(base, outputs_raw.get("reports"), "outputs.reports"),
        registry=_resolve(base, outputs_raw.get("registry"), "outputs.registry"),
        exports=_resolve(base, outputs_raw.get("exports"), "outputs.exports"),
    )
    return TrainingConfig(
        schema_version=schema_version,
        config_path=config_path,
        dataset=dataset,
        model=model,
        crops=crops,
        training=optimization,
        outputs=outputs,
    )

"""Preprocesamiento seguro e inferencia EfficientNet-B0 en CPU."""

from __future__ import annotations

import os
import time
import warnings
from dataclasses import dataclass
from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError

from .errors import InvalidImageError, VisionInferenceError
from .model_loader import ModelLoader


MAX_IMAGE_PIXELS = 40_000_000
DEFAULT_ABSTENTION_THRESHOLD = 0.60


@dataclass(frozen=True)
class TopClass:
    class_name: str
    score: float


@dataclass(frozen=True)
class InferenceResult:
    crop_type: str
    detected_class: str
    prediction: str
    confidence: float
    top_classes: tuple[TopClass, ...]
    inference_ms: float
    model_id: str
    model_version: str
    architecture: str
    artifact_format: str


class VisionInferenceEngine:
    def __init__(self, loader: ModelLoader, abstention_threshold: float | None = None) -> None:
        self.loader = loader
        self.abstention_threshold = (
            _configured_threshold() if abstention_threshold is None else abstention_threshold
        )
        if not 0 <= self.abstention_threshold <= 1:
            raise ValueError("El umbral de abstención debe estar entre 0 y 1.")

    def predict(self, image_bytes: bytes, crop_type: str) -> InferenceResult:
        image = decode_image(image_bytes)
        loaded = self.loader.get_model(crop_type)
        transforms = loaded.torchvision.transforms
        transform = transforms.Compose([
            transforms.Resize(
                loaded.metadata.resize_size,
                interpolation=transforms.InterpolationMode.BICUBIC,
            ),
            transforms.CenterCrop(loaded.metadata.input_size),
            transforms.ToTensor(),
            transforms.Normalize(mean=loaded.metadata.mean, std=loaded.metadata.std),
        ])
        tensor = transform(image).unsqueeze(0)
        try:
            with loaded.inference_lock, loaded.torch.inference_mode():
                started = time.perf_counter()
                logits = loaded.model(tensor)
                probabilities = loaded.torch.softmax(logits, dim=1)
                inference_ms = (time.perf_counter() - started) * 1000
        except Exception as exc:
            raise VisionInferenceError("El modelo no pudo procesar la imagen.") from exc
        if probabilities.ndim != 2 or probabilities.shape != (1, len(loaded.metadata.class_names)):
            raise VisionInferenceError("La salida del modelo no coincide con sus clases registradas.")
        count = min(3, len(loaded.metadata.class_names))
        values, indices = probabilities.topk(count, dim=1)
        top_classes = tuple(
            TopClass(loaded.metadata.class_names[index], float(score))
            for score, index in zip(values[0].tolist(), indices[0].tolist(), strict=True)
        )
        detected = top_classes[0].class_name
        confidence = top_classes[0].score
        prediction = (
            "UNKNOWN"
            if confidence < self.abstention_threshold
            else "HEALTHY" if detected == "healthy" else "VISUAL_ANOMALY"
        )
        return InferenceResult(
            crop_type=crop_type,
            detected_class=detected,
            prediction=prediction,
            confidence=confidence,
            top_classes=top_classes,
            inference_ms=inference_ms,
            model_id=loaded.metadata.model_id,
            model_version=loaded.metadata.model_version,
            architecture=loaded.metadata.architecture,
            artifact_format=loaded.artifact_format,
        )


def decode_image(image_bytes: bytes) -> Image.Image:
    if not image_bytes:
        raise InvalidImageError("La imagen está vacía.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(image_bytes)) as source:
                if source.format not in {"JPEG", "PNG", "WEBP"}:
                    raise InvalidImageError("El formato interno de la imagen no está permitido.")
                width, height = source.size
                if width < 1 or height < 1 or width * height > MAX_IMAGE_PIXELS:
                    raise InvalidImageError("Las dimensiones de la imagen no son seguras.")
                source.load()
                return ImageOps.exif_transpose(source).convert("RGB")
    except InvalidImageError:
        raise
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise InvalidImageError("No fue posible decodificar la imagen de forma segura.") from exc


def _configured_threshold() -> float:
    raw = os.getenv("VISION_ABSTENTION_THRESHOLD", str(DEFAULT_ABSTENTION_THRESHOLD))
    try:
        value = float(raw)
    except ValueError as exc:
        raise ValueError("VISION_ABSTENTION_THRESHOLD debe ser numérico.") from exc
    return value

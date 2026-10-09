"""Validación de imágenes y huellas exactas/perceptuales."""

from __future__ import annotations

import hashlib
import warnings
from io import BytesIO

from PIL import Image, ImageFile, ImageOps, UnidentifiedImageError


ImageFile.LOAD_TRUNCATED_IMAGES = False


class ImageValidationError(ValueError):
    """El archivo no es una imagen íntegra admitida."""


def validate_and_fingerprint(data: bytes, max_bytes: int) -> tuple[str, str]:
    """Decodifica completamente la imagen y calcula SHA256 y dHash de 64 bits."""

    if not data:
        raise ImageValidationError("archivo vacío")
    if len(data) > max_bytes:
        raise ImageValidationError(f"imagen supera el máximo de {max_bytes} bytes")

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as probe:
                probe.verify()
            with Image.open(BytesIO(data)) as decoded:
                decoded.load()
                grayscale = ImageOps.exif_transpose(decoded).convert("L").resize(
                    (9, 8), Image.Resampling.LANCZOS
                )
                pixels = list(grayscale.get_flattened_data())
    except (Image.DecompressionBombError, Image.DecompressionBombWarning, UnidentifiedImageError, OSError, ValueError) as exc:
        raise ImageValidationError(str(exc) or exc.__class__.__name__) from exc

    bits = 0
    for row in range(8):
        offset = row * 9
        for column in range(8):
            bits = (bits << 1) | int(pixels[offset + column] > pixels[offset + column + 1])

    return hashlib.sha256(data).hexdigest(), f"{bits:016x}"


def hamming_distance(left: str, right: str) -> int:
    return (int(left, 16) ^ int(right, 16)).bit_count()

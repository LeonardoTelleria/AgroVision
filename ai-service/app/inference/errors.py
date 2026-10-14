"""Errores públicos y controlados del pipeline de inferencia."""


class VisionInferenceError(RuntimeError):
    """La inferencia no pudo completarse de forma segura."""


class ModelUnavailableError(VisionInferenceError):
    """No existe un modelo real, íntegro y compatible para el cultivo."""


class InvalidImageError(VisionInferenceError):
    """Los bytes no representan una imagen segura y decodificable."""

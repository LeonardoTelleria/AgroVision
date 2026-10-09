"""Contratos internos y HTTP del análisis visual."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


VisionPrediction = Literal[
    "HEALTHY",
    "WATER_STRESS",
    "CHLOROSIS",
    "DRY_AREA",
    "LEAF_SPOT",
    "UNKNOWN",
]

VisionCropType = Literal[
    "CORN",
    "RED_BEAN",
    "CASSAVA",
    "QUEQUISQUE",
    "ORANGE",
    "SORGHUM",
    "PEANUT",
    "GENERAL",
]


class VisionAnalyzeRequest(BaseModel):
    """Imagen y metadatos multipart ya validados por el endpoint."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    image_bytes: bytes = Field(min_length=1)
    image_file_name: str = Field(min_length=1, max_length=255)
    content_type: str
    crop_type: VisionCropType
    field_id: str = Field(min_length=1, max_length=100)
    zone_id: str | None = Field(default=None, max_length=100)


class VisionVisualMetrics(BaseModel):
    greenCoveragePercentage: float | None = Field(default=None, ge=0, le=100)
    dryAreaPercentage: float | None = Field(default=None, ge=0, le=100)
    chlorosisSuspected: bool
    leafSpotSuspected: bool
    stressPatternDetected: bool


class VisionEvidence(BaseModel):
    metric: str
    value: str | float | bool | None
    unit: str | None = None
    explanation: str


class VisionAnalyzeResponse(BaseModel):
    """Resultado técnico que el backend transforma a VisionInspection."""

    prediction: VisionPrediction
    confidence: float = Field(ge=0, le=1)
    metrics: list[str]
    visualMetrics: VisionVisualMetrics
    evidence: list[VisionEvidence] = Field(min_length=1)
    explanation: str
    recommendation: str

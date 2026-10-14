"""Contratos internos y HTTP del análisis visual."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


VisionPrediction = Literal[
    "HEALTHY",
    "VISUAL_ANOMALY",
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
    chlorosisSuspected: bool | None = None
    leafSpotSuspected: bool | None = None
    stressPatternDetected: bool | None = None


class VisionEvidence(BaseModel):
    metric: str
    value: str | float | bool | None
    unit: str | None = None
    explanation: str


class VisionTopClass(BaseModel):
    className: str = Field(min_length=1)
    score: float = Field(ge=0, le=1)


class VisionAnalyzeResponse(BaseModel):
    """Resultado técnico que el backend transforma a VisionInspection."""

    prediction: VisionPrediction
    detectedClass: str = Field(min_length=1)
    confidence: float = Field(ge=0, le=1)
    modelId: str = Field(min_length=1)
    modelVersion: str = Field(min_length=1)
    architecture: str = Field(min_length=1)
    cropType: VisionCropType
    topClasses: list[VisionTopClass] = Field(min_length=1, max_length=3)
    inferenceMs: float = Field(ge=0)
    metrics: list[str]
    visualMetrics: VisionVisualMetrics
    evidence: list[VisionEvidence] = Field(min_length=1)
    explanation: str
    recommendation: str


class VisionModelStatus(BaseModel):
    cropType: str
    available: bool
    cached: bool
    state: str
    modelId: str | None = None
    modelVersion: str | None = None
    architecture: str | None = None
    classNames: list[str] = Field(default_factory=list)
    artifactFormat: str | None = None
    message: str | None = None


class VisionModelsStatusResponse(BaseModel):
    models: list[VisionModelStatus]
    abstentionThreshold: float = Field(ge=0, le=1)

"""Adaptador entre el contrato HTTP y la inferencia neuronal real."""

from app.inference import ModelLoader, VisionInferenceEngine
from app.schemas import (
    VisionAnalyzeRequest,
    VisionAnalyzeResponse,
    VisionEvidence,
    VisionModelsStatusResponse,
    VisionModelStatus,
    VisionTopClass,
    VisionVisualMetrics,
)


model_loader = ModelLoader()
inference_engine = VisionInferenceEngine(model_loader)


def warm_models() -> None:
    model_loader.warm()


def get_models_status() -> VisionModelsStatusResponse:
    return VisionModelsStatusResponse(
        models=[
            VisionModelStatus(
                cropType=item.crop_type,
                available=item.available,
                cached=item.cached,
                state=item.state,
                modelId=item.model_id,
                modelVersion=item.model_version,
                architecture=item.architecture,
                classNames=list(item.class_names),
                artifactFormat=item.artifact_format,
                message=item.message,
            )
            for item in model_loader.statuses()
        ],
        abstentionThreshold=inference_engine.abstention_threshold,
    )


def analyze_image(request: VisionAnalyzeRequest) -> VisionAnalyzeResponse:
    result = inference_engine.predict(request.image_bytes, request.crop_type)
    explanation, recommendation = _guidance(
        result.crop_type,
        result.detected_class,
        result.prediction,
        result.confidence,
        inference_engine.abstention_threshold,
    )
    return VisionAnalyzeResponse(
        prediction=result.prediction,
        detectedClass=result.detected_class,
        confidence=result.confidence,
        modelId=result.model_id,
        modelVersion=result.model_version,
        architecture=result.architecture,
        cropType=request.crop_type,
        topClasses=[
            VisionTopClass(className=item.class_name, score=item.score)
            for item in result.top_classes
        ],
        inferenceMs=result.inference_ms,
        metrics=["model_softmax"],
        visualMetrics=VisionVisualMetrics(
            greenCoveragePercentage=None,
            dryAreaPercentage=None,
            chlorosisSuspected=None,
            leafSpotSuspected=None,
            stressPatternDetected=None,
        ),
        evidence=[
            VisionEvidence(
                metric="model_classification",
                value=result.detected_class,
                unit=None,
                explanation=(
                    f"EfficientNet-B0 asignó la clase técnica '{result.detected_class}' "
                    f"con puntuación softmax {result.confidence:.4f}. "
                    "Esta puntuación no es precisión estadística ni probabilidad calibrada."
                ),
            )
        ],
        explanation=explanation,
        recommendation=recommendation,
    )


def _guidance(
    crop_type: str,
    detected_class: str,
    prediction: str,
    confidence: float,
    threshold: float,
) -> tuple[str, str]:
    labels = {
        "blight": "tizón foliar",
        "common_rust": "roya común",
        "gray_leaf_spot": "mancha gris de la hoja",
        "black_spot": "mancha negra",
        "canker": "cancro cítrico",
        "greening": "greening/HLB",
        "melanose": "melanosis",
        "healthy": "hoja saludable",
    }
    readable = labels.get(detected_class, detected_class.replace("_", " "))
    citrus_note = (
        " El dataset de cítricos no garantiza que todas las muestras correspondan "
        "exclusivamente a Citrus sinensis."
        if crop_type == "ORANGE" else ""
    )
    if prediction == "UNKNOWN":
        return (
            f"La clase con mayor puntuación fue {readable} ({confidence:.1%}), por debajo "
            f"del umbral provisional de abstención ({threshold:.0%}).{citrus_note}",
            "Toma otra fotografía nítida de una sola hoja, con iluminación uniforme, y solicita revisión de campo.",
        )
    if prediction == "HEALTHY":
        return (
            f"El modelo clasificó la imagen como {readable} con puntuación softmax {confidence:.1%}. "
            f"El resultado es orientativo y no sustituye una inspección agronómica.{citrus_note}",
            "Continúa el monitoreo rutinario y verifica en campo si aparecen síntomas nuevos.",
        )
    return (
        f"El modelo detectó un patrón compatible con {readable} con puntuación softmax {confidence:.1%}. "
        f"No constituye un diagnóstico definitivo.{citrus_note}",
        "Confirma los síntomas con inspección de campo y personal agronómico antes de aplicar cualquier tratamiento.",
    )

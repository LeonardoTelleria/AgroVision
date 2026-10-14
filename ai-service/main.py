"""API HTTP del servicio de visión de AgroVision."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status
from starlette.concurrency import run_in_threadpool

from app.inference import InvalidImageError, ModelUnavailableError, VisionInferenceError
from app.schemas import (
    VisionAnalyzeRequest,
    VisionAnalyzeResponse,
    VisionCropType,
    VisionModelsStatusResponse,
)
from app.visionAnalyser import analyze_image, get_models_status, warm_models


@asynccontextmanager
async def lifespan(_: FastAPI):
    await run_in_threadpool(warm_models)
    yield


app = FastAPI(lifespan=lifespan)

MAX_IMAGE_BYTES = 10 * 1024 * 1024
SUPPORTED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


@app.get("/health")
def check_health():
    return {"status": "UP"}


@app.get("/models/status", response_model=VisionModelsStatusResponse)
async def models_status() -> VisionModelsStatusResponse:
    """Expone disponibilidad real sin revelar rutas internas."""

    return await run_in_threadpool(get_models_status)


@app.post("/vision/analyze", response_model=VisionAnalyzeResponse)
async def analyze(
    image: UploadFile = File(...),
    cropType: VisionCropType = Form(...),
    fieldId: str = Form(..., min_length=1, max_length=100),
    zoneId: str | None = Form(default=None, max_length=100),
    imageFileName: str | None = Form(default=None, max_length=255),
) -> VisionAnalyzeResponse:
    if image.content_type not in SUPPORTED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Formato no admitido. Utiliza una imagen JPEG, PNG o WebP.",
        )
    image_bytes = await image.read(MAX_IMAGE_BYTES + 1)
    await image.close()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="La imagen está vacía.")
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="La imagen supera el límite permitido de 10 MB.")
    detected_type = detect_image_type(image_bytes)
    if detected_type is None or detected_type != image.content_type:
        raise HTTPException(
            status_code=415,
            detail="El contenido del archivo no coincide con una imagen admitida.",
        )
    request = VisionAnalyzeRequest(
        image_bytes=image_bytes,
        image_file_name=(imageFileName or image.filename or "vision-image")[:255],
        content_type=detected_type,
        crop_type=cropType,
        field_id=fieldId,
        zone_id=zoneId,
    )
    try:
        return await run_in_threadpool(analyze_image, request)
    except InvalidImageError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ModelUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except VisionInferenceError as exc:
        raise HTTPException(status_code=503, detail="El modelo no pudo completar la inferencia.") from exc


def detect_image_type(content: bytes) -> str | None:
    if content.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if len(content) >= 12 and content.startswith(b"RIFF") and content[8:12] == b"WEBP":
        return "image/webp"
    return None

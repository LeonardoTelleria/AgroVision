"""API HTTP del servicio de visión de AgroVision."""

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status

from app.schemas import VisionAnalyzeRequest, VisionAnalyzeResponse, VisionCropType
from app.visionAnalyser import analyze_image

app = FastAPI()

MAX_IMAGE_BYTES = 10 * 1024 * 1024
SUPPORTED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}

@app.get("/health")
def check_health():
    return {
        "status": "UP"
    }

@app.post("/vision/analyze", response_model=VisionAnalyzeResponse)
async def analyze(
    image: UploadFile = File(...),
    cropType: VisionCropType = Form(...),
    fieldId: str = Form(..., min_length=1, max_length=100),
    zoneId: str | None = Form(default=None, max_length=100),
    imageFileName: str | None = Form(default=None, max_length=255),
) -> VisionAnalyzeResponse:
    """Recibe una imagen multipart validada y ejecuta el analizador actual."""

    if image.content_type not in SUPPORTED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Formato no admitido. Utiliza una imagen JPEG, PNG o WebP.",
        )

    image_bytes = await image.read(MAX_IMAGE_BYTES + 1)
    await image.close()

    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La imagen está vacía.",
        )

    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="La imagen supera el límite permitido de 10 MB.",
        )

    detected_type = detect_image_type(image_bytes)

    if detected_type is None or detected_type != image.content_type:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="El contenido del archivo no coincide con una imagen admitida.",
        )

    request = VisionAnalyzeRequest(
        image_bytes=image_bytes,
        image_file_name=image.filename or imageFileName or "vision-image",
        content_type=detected_type,
        crop_type=cropType,
        field_id=fieldId,
        zone_id=zoneId,
    )

    return analyze_image(request)


def detect_image_type(content: bytes) -> str | None:
    """Verifica firmas JPEG, PNG y WebP sin depender todavía del pipeline ML."""

    if content.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"

    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"

    if (
        len(content) >= 12
        and content.startswith(b"RIFF")
        and content[8:12] == b"WEBP"
    ):
        return "image/webp"

    return None


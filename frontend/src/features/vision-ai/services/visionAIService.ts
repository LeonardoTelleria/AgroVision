/** 
 * =========================================
 * Vision AI Services
 * ========================================= 
 * 
 * Servicio Frt para el análisis visual 
 * 
 * Finalidad:
 * - ocultar a visionAiPage si el resultado viene ya sea de bakcend o del mock local
 * - preparar POST /api/vision/analyze;
 * - mantener la UI desacoplada del mock.
 *
 * Regla:
 * La página no debe saber si el resultado viene de backend o mock ya que esa decisión se controla aquí.
*/


import { API_ENDPOINTS } from "../../../shared/api/endpoints";
import type {
    ApiResponse,
    VisionAnalyzeRequest,
    VisionAnalysisResult,
    VisionEvidenceItem,
    VisionInspection,
    VisionPrediction,
} from "../types/visionAI.types";
import { analyzeVisionMock } from "./visionAIMock";


// endpoint oficial que backend deberá entregar, documentado en shared/api/endpoints.ts
export const VISION_ANALYSIS_ENDPOINT = API_ENDPOINTS.visionAnalyze;

/**
 * Forma flexible esperada desde backend.
 *
 * Se permite VisionInspection directo o envuelto en { inspection }.
 * Esto evita romper la UI si backend cambia ligeramente el payload inicial.
*/
export class VisionRequestError extends Error {
    public constructor(message: string) {
        super(message);
        this.name = "VisionRequestError";
    }
}

/**
 * Aqui se ejecuta el análisis visual.
 * 
 * Funcionamiento:
 * - intenta enviar la request al backend;
 * - si backend responde bien, adapta el resultado;
 * - si backend falla, usa fallback local;
 * - nunca deja la pantalla rota o en blanco por un error de red.  
*/

export async function analyzeVisionImage(request: VisionAnalyzeRequest): Promise<VisionAnalysisResult> {
    try {
        // Se construye payload compatible con subida real o simulada.
        const payload = buildVisionPayload(request);

        // Se intenta consumir backend real.
        const response = await fetch(VISION_ANALYSIS_ENDPOINT, {
        method: "POST",
        body: payload,
        });

        // Si backend responde 404, 500 o error HTTP, usamos fallback.
        if (isClientRequestError(response.status)) {
            throw new VisionRequestError(await readApiErrorMessage(response));
        }

        if (!response.ok) {
            return buildFallbackResult(request, `Backend no disponible. Estado HTTP: ${response.status}.`);
        }

        const payloadJson: unknown = await response.json();

        if (!isApiResponse(payloadJson)) {
            return buildFallbackResult(
                request,
                "Backend respondió con un ApiResponse inválido.",
            );
        }

        // El contrato exige success y data.
        if (!payloadJson.success || !payloadJson.data) {
            return buildFallbackResult(
                request, "Backend respondió sin data válida para Vision AI."
            );
        }

        // Se extrae VisionInspection aunque backend lo devuelva envuelto.
        const inspection = extractVisionInspection(payloadJson.data);

        // Si no se pudo normalizar, usamos fallback seguro.
        if (!inspection) {
            return buildFallbackResult(request, "La respuesta del backend no coincide con VisionInspection.");
        }

        return {
            // Se adapta para evitar mutaciones accidentales.
            inspection: adaptVisionInspection(inspection),
            // Indica que la fuente fue backend real.
            source: "BACKEND",
            // No hay razón de fallback cuando backend respondió correctamente.
            fallbackReason: null,
        };
    } catch (error: unknown) {
        if (error instanceof VisionRequestError) {
            throw error;
        }

        // Error de red, CORS, backend apagado o JSON inválido.
        return buildFallbackResult(
            request, "No se pudo conectar con el servicio backend. Se usó fallback local en su lugar."
        );
    }
}

/**
 * Construye el payload para POST /api/vision/analyze.
 *
 * Funcionamiento:
 * - usa FormData porque Vision AI puede requerir imagen;
 * - adjunta siempre la imagen requerida por el contrato;
 * - conserva imageFileName como metadato de trazabilidad.
*/
function buildVisionPayload(request: VisionAnalyzeRequest): FormData {
    const formData = new FormData();

    // Cultivo seleccionado por la UI.
    formData.append("cropType", request.cropType);
    // Field del caso demo o del flujo real.
    formData.append("fieldId", request.fieldId);
    // zoneId puede venir null/undefined; de modo que solo se envía si existe.
    if (request.zoneId) {
        formData.append("zoneId", request.zoneId);
    }

    // Nombre de archivo para trazabilidad visual.
    formData.append("imageFileName", request.imageFileName);
    formData.append("image", request.imageFile);

    return formData;
}

/**
 * Extrae VisionInspection desde el payload del backend.
 *
 * Soporta dos formas:
 * - data = VisionInspection
 * - data = { inspection: VisionInspection }
 */
function extractVisionInspection(payload: unknown): VisionInspection | null {
  // Caso 1: backend devuelve VisionInspection directo.
    if (isVisionInspection(payload)) {
        return payload;
    }
    // Caso 2: backend devuelve objeto envuelto.
    if (isRecord(payload) && isVisionInspection(payload.inspection)) {
        return payload.inspection;
    }
    return null;
}

function isApiResponse(payload: unknown): payload is ApiResponse<unknown> {
    return isRecord(payload)
        && typeof payload.success === "boolean"
        && "data" in payload
        && typeof payload.message === "string"
        && (typeof payload.error === "string" || payload.error === null)
        && typeof payload.timestamp === "string";
}

function isVisionInspection(payload: unknown): payload is VisionInspection {
    if (!isRecord(payload) || !isRecord(payload.visualMetrics)) {
        return false;
    }

    return typeof payload.inspectionId === "string"
        && typeof payload.fieldId === "string"
        && (typeof payload.zoneId === "string" || payload.zoneId === null)
        && isCropType(payload.cropType)
        && isVisionPrediction(payload.prediction)
        && typeof payload.confidence === "number"
        && Number.isFinite(payload.confidence)
        && payload.confidence >= 0
        && payload.confidence <= 1
        && isNullablePercentage(payload.visualMetrics.greenCoveragePercentage)
        && isNullablePercentage(payload.visualMetrics.dryAreaPercentage)
        && typeof payload.visualMetrics.chlorosisSuspected === "boolean"
        && typeof payload.visualMetrics.leafSpotSuspected === "boolean"
        && typeof payload.visualMetrics.stressPatternDetected === "boolean"
        && typeof payload.explanation === "string"
        && typeof payload.recommendedAction === "string"
        && Array.isArray(payload.evidence)
        && payload.evidence.every(isVisionEvidenceItem)
        && typeof payload.createdAt === "string";
}

function isCropType(payload: unknown): boolean {
    return payload === "CORN"
        || payload === "RED_BEAN"
        || payload === "CASSAVA"
        || payload === "QUEQUISQUE"
        || payload === "ORANGE"
        || payload === "SORGHUM"
        || payload === "PEANUT"
        || payload === "GENERAL";
}

function isNullablePercentage(payload: unknown): boolean {
    return payload === null || (
        typeof payload === "number"
        && Number.isFinite(payload)
        && payload >= 0
        && payload <= 100
    );
}

function isVisionEvidenceItem(payload: unknown): payload is VisionEvidenceItem {
    return isRecord(payload)
        && payload.source === "VISION"
        && typeof payload.metric === "string"
        && isEvidenceStatus(payload.status)
        && isEvidenceValue(payload.value)
        && (typeof payload.unit === "string" || payload.unit === null)
        && typeof payload.explanation === "string";
}

function isEvidenceStatus(payload: unknown): boolean {
    return payload === "NORMAL"
        || payload === "WATCH"
        || payload === "WARNING"
        || payload === "CRITICAL";
}

function isEvidenceValue(payload: unknown): boolean {
    return payload === null
        || typeof payload === "string"
        || typeof payload === "boolean"
        || (typeof payload === "number" && Number.isFinite(payload));
}

function isVisionPrediction(payload: unknown): payload is VisionPrediction {
    return payload === "HEALTHY"
        || payload === "WATER_STRESS"
        || payload === "CHLOROSIS"
        || payload === "DRY_AREA"
        || payload === "LEAF_SPOT"
        || payload === "UNKNOWN";
}

function isRecord(payload: unknown): payload is Record<string, unknown> {
    return typeof payload === "object" && payload !== null;
}

function isClientRequestError(statusCode: number): boolean {
    return statusCode === 400
        || statusCode === 413
        || statusCode === 415
        || statusCode === 422;
}

async function readApiErrorMessage(response: Response): Promise<string> {
    try {
        const payload: unknown = await response.json();

        if (isApiResponse(payload) && payload.error) {
            return payload.error;
        }
    } catch {
        // La respuesta inválida se sustituye por un mensaje controlado.
    }

    return `La imagen no pudo procesarse. Estado HTTP: ${response.status}.`;
}


/**
 * Construye resultado fallback.
 *
 * Funcionamiento:
 * - genera un VisionInspection local usando analyzeVisionMock;
 * - adapta el resultado;
 * - marca source como FALLBACK;
 * - conserva reason para mostrar aviso en UI.
*/
function buildFallbackResult( request: VisionAnalyzeRequest, reason: string ): VisionAnalysisResult {
    const fallbackInspection = analyzeVisionMock(request);

    return {
        inspection: adaptVisionInspection(fallbackInspection),
        source: "FALLBACK",
        fallbackReason: reason,
    };
}

/**
 * Normaliza VisionInspection antes de enviarlo a la UI.
 *
 * Funcionamiento:
 * - clona visualMetrics;
 * - clona evidence;
 * - evita que componentes muten referencias originales.
*/
function  adaptVisionInspection(source: VisionInspection): VisionInspection {
    return {
        ...source,
        visualMetrics: {
            ...source.visualMetrics,
        },
        evidence: [...source.evidence],
    };
}


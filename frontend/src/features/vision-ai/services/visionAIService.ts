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
import type { VisionInspection, VisionAnalyzeRequest, VisionAnalysisResult, ApiResponse } from "../types/visionAi.types";
import { analyzeVisionMock } from "./visionAIMock";


// endpoint oficial que backend deberá entregar, documentado en shared/api/endpoints.ts
export const VISION_ANALYSIS_ENDPOINT = API_ENDPOINTS.visionAnalyze;

/**
 * Forma flexible esperada desde backend.
 *
 * Se permite VisionInspection directo o envuelto en { inspection }.
 * Esto evita romper la UI si backend cambia ligeramente el payload inicial.
*/
type VisionApiPayload = VisionInspection | { readonly inspection: VisionInspection };

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
        if (!response.ok) {
            return buildFallbackResult(request, `Backend no disponible. Estado HTTP: ${response.status}.`);
        }

        // Se interpreta respuesta como ApiResponse<T>.
        const json = (await response.json()) as ApiResponse<VisionApiPayload>;

        // El contrato exige success y data.
        if (!json.success || !json.data) {
            return buildFallbackResult(
                request, "Backend respondió sin data válida para Vision AI."
            );
        }

        // Se extrae VisionInspection aunque backend lo devuelva envuelto.
        const inspection = extractVisionInspection(json.data);

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
    } catch {
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
 * - si no hay archivo real, manda solo imageFileName;
 * - permite flujo simulado por ahora sin romper el backend futuro.
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
    // Si el usuario seleccionó archivo real, se adjunta.
    if (request.imageFile) {
        formData.append("image", request.imageFile);
    }

    return formData;
}

/**
 * Extrae VisionInspection desde el payload del backend.
 *
 * Soporta dos formas:
 * - data = VisionInspection
 * - data = { inspection: VisionInspection }
 */
function extractVisionInspection( payload: VisionApiPayload ): VisionInspection | null {
  // Caso 1: backend devuelve VisionInspection directo.
    if ("inspectionId" in payload) {
        return payload;
    }
    // Caso 2: backend devuelve objeto envuelto.
    if ("inspection" in payload) {
        return payload.inspection;
    }
    return null;
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


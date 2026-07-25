/** =========================================
* Vision AI Types
* =========================================
*
* Tipos para análisis visual preliminar.
*
* Finalidad:
* - definir el contrato visual que consume la UI;
* - representar predicción, confianza, métricas y evidencia;
* - diferenciar resultado real de backend vs fallback local;
*
* Regla:
* - AI Service analiza imagen.
* - Backend normaliza y decide riesgo.
* - Frontend visualiza resultado y explicación.
*/

import type { CropType } from "../../crops/types/cropProfile.types";

// predicciones visuales permitidas.
export type VisionPrediction =
  | "HEALTHY"
  | "WATER_STRESS"
  | "CHLOROSIS"
  | "DRY_AREA"
  | "LEAF_SPOT"
  | "UNKNOWN";

// estado técnico de evidencia visual.
export type VisionEvidenceStatus =
  | "NORMAL"
  | "WATCH"
  | "WARNING"
  | "CRITICAL";


//Indica de donde salio el resultado mostrado , sea backend o fallback.
export type VisionAnalysisSource = "BACKEND" | "FALLBACK";

// Estados visuales dentro de la pagina , sirve para que la pantalla no quede en blanco.
export type VisionAnalysisStatus =
  | "IDLE"
  | "ANALYZING"
  | "RESULT"
  | "FALLBACK"
  | "ERROR";

// métricas visuales explicables.
// todas son opcionales porque algunos análisis pueden no devolver cada métrica.
export interface VisualMetrics {
    readonly greenCoveragePercentage?: number | null;
    readonly dryAreaPercentage?: number | null;
    readonly chlorosisSuspected?: boolean;
    readonly leafSpotSuspected?: boolean;
    readonly stressPatternDetected?: boolean;
}

// evidencia específica generada desde Vision AI.
export interface VisionEvidenceItem {
    readonly source: "VISION";
    readonly metric: string;
    readonly value?: number | string | boolean | null;
    readonly unit?: string | null;
    readonly status: VisionEvidenceStatus;
    readonly explanation: string;
}

// Resultado normalizado de análisis visual.
// esto se alinea con VisionInspection del contrato.
export interface VisionInspection {
    readonly inspectionId: string;
    readonly fieldId: string;
    readonly zoneId?: string | null;
    readonly cropType: CropType;

    readonly prediction: VisionPrediction;
    readonly confidence: number;
    readonly visualMetrics: VisualMetrics;

    readonly explanation: string;
    readonly recommendedAction: string;

    readonly evidence: ReadonlyArray<VisionEvidenceItem>;
    readonly createdAt: string;
}


/**
* Request usada por el frontend para pedir análisis.
*
* imageFile:
* Se usa si el usuario selecciona una imagen real.
*
* imageFileName:
* Permite mantener flujo simulado aunque no se suba archivo.
*/
export interface VisionAnalyzeRequest {
    readonly cropType: CropType;
    readonly fieldId: string;
    readonly zoneId?: string | null;
    readonly imageFileName: string;
    readonly imageFile: File | null;
}


//Resultado final que recibe la pagina.
// no se coloca dentro de `VisionInspection`para poder indicar si la respuesta vino del backend o de fallback como respaldo 
export interface VisionAnalysisResult {
    readonly inspection: VisionInspection;
    readonly source: VisionAnalysisSource;
    readonly fallbackReason?: string | null;
}


export interface ApiResponse<T> {
    readonly success: boolean;
    readonly data: T | null;
    readonly message?: string;
    readonly error?: string;
    readonly timestamp: string;
}
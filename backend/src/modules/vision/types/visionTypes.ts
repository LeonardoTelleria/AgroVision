/** Contratos del módulo Vision entre HTTP, backend y AI Service. */

import type { EvidenceItem } from "../../analysis/types/evidenceTypes";

export type VisionPrediction =
  | "HEALTHY"
  | "VISUAL_ANOMALY"
  | "WATER_STRESS"
  | "CHLOROSIS"
  | "DRY_AREA"
  | "LEAF_SPOT"
  | "UNKNOWN";

export type VisionCropType =
  | "CORN"
  | "RED_BEAN"
  | "CASSAVA"
  | "QUEQUISQUE"
  | "ORANGE"
  | "SORGHUM"
  | "PEANUT"
  | "GENERAL";

export interface VisionVisualMetrics {
  readonly greenCoveragePercentage: number | null;
  readonly dryAreaPercentage: number | null;
  readonly chlorosisSuspected: boolean | null;
  readonly leafSpotSuspected: boolean | null;
  readonly stressPatternDetected: boolean | null;
}

/** Archivo y metadatos ya validados que el controller entrega al service. */
export interface VisionAnalyzeRequest {
  readonly cropType: VisionCropType;
  readonly fieldId: string;
  readonly zoneId: string | null;
  readonly image: {
    readonly buffer: Buffer;
    readonly fileName: string;
    readonly mimeType: string;
    readonly sizeBytes: number;
  };
}

/** Contrato técnico devuelto por el AI Service antes de normalizarlo. */
export interface AiVisionEvidence {
  readonly metric: string;
  readonly value: number | string | boolean | null;
  readonly unit: string | null;
  readonly explanation: string;
}

export interface AiVisionAnalyzeResponse {
  readonly prediction: VisionPrediction;
  readonly detectedClass: string;
  readonly confidence: number;
  readonly modelId: string;
  readonly modelVersion: string;
  readonly architecture: string;
  readonly cropType: VisionCropType;
  readonly topClasses: ReadonlyArray<VisionTopClass>;
  readonly inferenceMs: number;
  readonly metrics: ReadonlyArray<string>;
  readonly visualMetrics: VisionVisualMetrics;
  readonly evidence: ReadonlyArray<AiVisionEvidence>;
  readonly explanation: string;
  readonly recommendation: string;
}

export interface VisionTopClass {
  readonly className: string;
  readonly score: number;
}

/** Respuesta normalizada que consume VisionAiPage. */
export interface VisionAnalyzeResponse {
  readonly inspectionId: string;
  readonly fieldId: string;
  readonly zoneId: string | null;
  readonly cropType: VisionCropType;
  readonly prediction: VisionPrediction;
  readonly detectedClass: string;
  readonly confidence: number;
  readonly modelId: string;
  readonly modelVersion: string;
  readonly architecture: string;
  readonly topClasses: ReadonlyArray<VisionTopClass>;
  readonly inferenceMs: number;
  readonly visualMetrics: VisionVisualMetrics;
  readonly explanation: string;
  readonly recommendedAction: string;
  readonly evidence: ReadonlyArray<EvidenceItem>;
  readonly createdAt: string;
}

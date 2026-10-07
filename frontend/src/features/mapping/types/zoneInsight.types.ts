/**
 * =========================================
 * ZoneInsight API Contract
 * =========================================
 *
 * Contratos del análisis prescriptivo consumido por el GIS.
 *
 * Responsabilidad:
 * - representar la respuesta ZoneInsight del backend;
 * - definir los catálogos utilizados en su validación;
 * - representar evidencia normalizada;
 * - describir resultados y fallos de consultas por lote.
 *
 * Integración:
 * zoneInsightServices.ts valida las respuestas recibidas.
 * zoneInsightMapAdapter.ts incorpora sus resultados al GeoJSON.
 *
 * =========================================
 */

// Reutilizamos el contrato de riesgo compartido por el GIS.
import type { GISRiskLevel } from "./mappingGeo.types";

// Catálogo de niveles utilizados por el análisis.
export const INSIGHT_RISK_LEVELS = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
] as const satisfies readonly GISRiskLevel[];

// Catálogo de cultivos definido por el backend.
export const INSIGHT_CROP_TYPES = [
    "RED_BEAN",
    "CASSAVA",
    "QUEQUISQUE",
    "ORANGE",
    "SORGHUM",
    "PEANUT",
    "GENERAL",
] as const;

// Fuentes de evidencia normalizada.
export const INSIGHT_EVIDENCE_SOURCES = [
    "SENSOR",
    "WEATHER",
    "SATELLITE",
    "VISION",
    "HISTORY",
    "MAPPING",
    "SIMULATION",
    "ROVER_CAMERA",
    "UPLOAD",
] as const;

// Estados utilizados por cada evidencia.
export const INSIGHT_EVIDENCE_STATUSES = [
    "NORMAL",
    "WATCH",
    "WARNING",
    "CRITICAL",
] as const;

// Derivamos los tipos de sus catálogos para mantener sincronizada la validación.
export type InsightCropType = (typeof INSIGHT_CROP_TYPES)[number];
export type InsightEvidenceSource = (typeof INSIGHT_EVIDENCE_SOURCES)[number];
export type InsightEvidenceStatus = (typeof INSIGHT_EVIDENCE_STATUSES)[number];

/** Evidencia normalizada utilizada para respaldar el análisis. */
export interface InsightEvidence {
    readonly source: InsightEvidenceSource;
    // Métrica evaluada.
    readonly metric: string;
    // Valor observado.
    readonly value?: number | string | boolean | null;
    // Unidad de medida cuando aplica.
    readonly unit?: string | null;
    readonly status: InsightEvidenceStatus;
    // Explicación técnica asociada a la observación.
    readonly explanation: string;
}

/** Resultado prescriptivo recibido desde el backend. */
export interface ZoneInsight {
    // Identificador del análisis.
    readonly id: string;
    // Identificadores de la zona y su field.
    readonly zoneId: string;
    readonly fieldId: string;
    readonly cropType: InsightCropType;
    // Riesgo final después de combinar análisis y evidencia.
    readonly finalRiskLevel: GISRiskLevel;
    // Puntuación sanitaria entre 0 y 100.
    readonly healthScore: number;
    readonly evidence: readonly InsightEvidence[];
    // Causa principal estimada.
    readonly mainCause: string;
    // Resumen ejecutivo.
    readonly summary: string;
    // Acción sugerida.
    readonly recommendedAction: string;
    // Fecha de generación del análisis.
    readonly generatedAt: string;
}

/** Fallo individual de una consulta de análisis. */
export interface ZoneInsightFailure {
    readonly zoneId: string;
    readonly message: string;
}

/** Resultado de las consultas de varias zonas. */
export interface ZoneInsightBatch {
    readonly insights: readonly ZoneInsight[];
    readonly failures: readonly ZoneInsightFailure[];
}

/**
 * =========================================
 * DOCUMENTACIÓN DEL MÓDULO
 * =========================================
 *
 * Contrato:
 * ZoneInsight refleja los campos que devuelve el endpoint
 * /api/analysis/zone/:zoneId del backend.
 *
 * Catálogos:
 * Las constantes exportadas proporcionan los valores admitidos
 * por la validación de respuestas. Los tipos de cultivo y
 * evidencia se derivan directamente de esas constantes.
 *
 * Riesgo y evidencia:
 * finalRiskLevel representa el riesgo final de la zona.
 * evidence.status representa el estado de una observación
 * concreta. Ambos contratos conservan su significado propio.
 *
 * Identificación:
 * zoneId y fieldId permiten asociar el análisis con una entidad
 * geográfica existente. id identifica el resultado analítico.
 *
 * Validación:
 * Estos tipos describen el contrato durante la compilación.
 * zoneInsightServices.ts comprueba los datos externos antes
 * de entregarlos como ZoneInsight.
 *
 * Consultas por lote:
 * ZoneInsightBatch conserva los análisis obtenidos y los fallos
 * individuales para que el consumidor represente resultados parciales.
 *
 * =========================================
 */
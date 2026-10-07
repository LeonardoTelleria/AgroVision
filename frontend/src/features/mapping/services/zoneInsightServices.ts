/**
 * =========================================
 * ZoneInsight Services
 * =========================================
 *
 * Acceso y validación de los análisis prescriptivos por zona.
 *
 * Responsabilidad:
 * - consumir el endpoint registrado en API_ENDPOINTS;
 * - comprobar la respuesta success/data del backend;
 * - validar identidad, riesgo, salud y evidencia;
 * - gestionar cancelación y tiempo máximo de solicitud;
 * - consultar varias zonas con concurrencia limitada;
 * - conservar los fallos individuales del lote.
 *
 * =========================================
 */

// Consumimos el catálogo de endpoints compartido por el frontend.
import { API_ENDPOINTS } from "../../../shared/api/endpoints";

// Reutilizamos los catálogos que definen los valores admitidos por el contrato.
import {
    INSIGHT_CROP_TYPES,
    INSIGHT_EVIDENCE_SOURCES,
    INSIGHT_EVIDENCE_STATUSES,
    INSIGHT_RISK_LEVELS,
} from "../types/zoneInsight.types";

// Importamos los contratos del análisis y sus resultados.
import type { InsightEvidence, ZoneInsight, ZoneInsightBatch } from "../types/zoneInsight.types";

// Tiempo máximo por solicitud y cantidad máxima de consultas simultáneas.
const DEFAULT_TIMEOUT_MS = 10000;
const MAX_CONCURRENT_REQUESTS = 4;

// Preparamos los catálogos para validar pertenencia.
const RISK_LEVELS = new Set<string>(INSIGHT_RISK_LEVELS);
const CROP_TYPES = new Set<string>(INSIGHT_CROP_TYPES);
const EVIDENCE_SOURCES = new Set<string>(INSIGHT_EVIDENCE_SOURCES);
const EVIDENCE_STATUSES = new Set<string>(INSIGHT_EVIDENCE_STATUSES);

// Identificamos objetos de propiedades.
const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === "object" && value !== null && !Array.isArray(value);
};

// Identificamos valores textuales.
const isText = (value: unknown): value is string => typeof value === "string";

// Comprobamos que los identificadores contengan texto.
const isNonEmptyText = (value: unknown): value is string => {
    return isText(value) && value.trim().length > 0;
};

/** Comprueba el contrato de una evidencia normalizada. */
function isEvidence(value: unknown): value is InsightEvidence {
    if (!isRecord(value)) return false;

    const metricValue = value.value;

    // Admitimos los valores escalares definidos por el contrato.
    const validMetricValue =
        metricValue === undefined ||
        metricValue === null ||
        isText(metricValue) ||
        typeof metricValue === "boolean" ||
        (typeof metricValue === "number" && Number.isFinite(metricValue));

    const validUnit = value.unit === undefined || value.unit === null || isText(value.unit);

    return (
        isText(value.source) &&
        EVIDENCE_SOURCES.has(value.source) &&
        isText(value.metric) &&
        isText(value.explanation) &&
        isText(value.status) &&
        EVIDENCE_STATUSES.has(value.status) &&
        validMetricValue &&
        validUnit
    );
}

/**
 * Valida un análisis recibido desde una fuente externa.
 *
 * @param value Datos pendientes de validación.
 * @param zoneId Identificador exacto de la zona solicitada.
 * @returns Análisis compatible con el contrato del frontend.
 * @throws Error cuando los datos incumplen el contrato.
 */
export function parseZoneInsight(value: unknown, zoneId: string): ZoneInsight {
    if (!isRecord(value)) {
        throw new Error("ZoneInsight debe ser un objeto.");
    }

    // Comprobamos los campos textuales obligatorios.
    const texts = [
        value.id,
        value.zoneId,
        value.fieldId,
        value.cropType,
        value.mainCause,
        value.summary,
        value.recommendedAction,
        value.generatedAt,
    ];

    // Exigimos identidad válida y coincidencia con la zona solicitada.
    if (
        !texts.every(isText) ||
        value.zoneId !== zoneId ||
        !isNonEmptyText(value.id) ||
        !isNonEmptyText(value.zoneId) ||
        !isNonEmptyText(value.fieldId)
    ) {
        throw new Error("ZoneInsight contiene una identidad o campos inválidos.");
    }

    if (!isText(value.finalRiskLevel) || !RISK_LEVELS.has(value.finalRiskLevel)) {
        throw new Error("Nivel de riesgo inválido.");
    }

    if (!isText(value.cropType) || !CROP_TYPES.has(value.cropType)) {
        throw new Error("Tipo de cultivo inválido.");
    }

    // Comprobamos una puntuación sanitaria finita dentro del rango del contrato.
    if (
        typeof value.healthScore !== "number" ||
        !Number.isFinite(value.healthScore) ||
        value.healthScore < 0 ||
        value.healthScore > 100
    ) {
        throw new Error("healthScore debe estar entre 0 y 100.");
    }

    if (!isText(value.generatedAt) || !Number.isFinite(Date.parse(value.generatedAt))) {
        throw new Error("Fecha de análisis inválida.");
    }

    // Cada elemento debe respetar el contrato de evidencia.
    if (!Array.isArray(value.evidence) || !value.evidence.every(isEvidence)) {
        throw new Error("Evidencia de análisis inválida.");
    }

    // La validación completa antecede a la conversión al contrato público.
    return value as unknown as ZoneInsight;
}

/** Configuración de una consulta individual o de un lote. */
export interface ZoneInsightRequestOptions {
    // Permite cancelar las solicitudes desde el consumidor.
    readonly signal?: AbortSignal;
    // Tiempo máximo de cada solicitud, en milisegundos.
    readonly timeoutMs?: number;
    // Origen del backend cuando se utiliza un host diferente.
    readonly baseUrl?: string;
}

/**
 * Obtiene y valida el análisis de una zona.
 *
 * @param zoneId Identificador exacto de la zona.
 * @param options Configuración de origen, cancelación y timeout.
 * @returns Análisis validado.
 */
export async function getZoneInsight(
    zoneId: string,
    options: ZoneInsightRequestOptions = {},
): Promise<ZoneInsight> {
    if (!isNonEmptyText(zoneId)) {
        throw new Error("Se requiere un zoneId.");
    }

    // Respetamos una cancelación producida antes de iniciar la solicitud.
    options.signal?.throwIfAborted();

    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
        throw new Error("El timeout debe ser un entero positivo en milisegundos.");
    }

    // Combinamos la cancelación del consumidor con el tiempo máximo.
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;

    // El endpoint compartido ya incluye el prefijo /api.
    const baseUrl = options.baseUrl?.replace(/\/+$/, "") ?? "";
    const endpoint = `${baseUrl}${API_ENDPOINTS.zoneAnalysis}/${encodeURIComponent(zoneId)}`;

    const response = await fetch(endpoint, { signal });

    if (!response.ok) {
        throw new Error(`ZoneInsight ${zoneId}: HTTP ${response.status}`);
    }

    // Tratamos el JSON externo como datos pendientes de validación.
    const envelope: unknown = await response.json();

    if (!isRecord(envelope) || envelope.success !== true) {
        throw new Error("La API no devolvió un análisis exitoso.");
    }

    return parseZoneInsight(envelope.data, zoneId);
}

/**
 * Consulta varias zonas conservando los resultados parciales.
 *
 * @param zoneIds Identificadores de las zonas solicitadas.
 * @param options Configuración compartida por las solicitudes.
 * @returns Análisis obtenidos y fallos individuales.
 */
export async function getZoneInsights(
    zoneIds: readonly string[],
    options: ZoneInsightRequestOptions = {},
): Promise<ZoneInsightBatch> {
    options.signal?.throwIfAborted();

    // Consultamos cada identificador una sola vez y conservamos su orden.
    const ids = [...new Set(zoneIds)];

    // Cada posición corresponde al identificador situado en el mismo índice.
    const results: Array<ZoneInsight | Error> = new Array(ids.length);
    let cursor = 0;

    // Cada trabajador toma el siguiente identificador pendiente.
    const worker = async (): Promise<void> => {
        while (cursor < ids.length) {
            options.signal?.throwIfAborted();

            const index = cursor++;

            try {
                results[index] = await getZoneInsight(ids[index], options);
            } catch (error) {
                // La cancelación del consumidor finaliza el lote.
                options.signal?.throwIfAborted();

                // Los demás fallos quedan asociados a su zona.
                results[index] = error instanceof Error ? error : new Error(String(error));
            }
        }
    };

    // Limitamos el número de consultas simultáneas.
    await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT_REQUESTS, ids.length) }, worker));

    return {
        insights: results.filter((result): result is ZoneInsight => !(result instanceof Error)),
        failures: results.flatMap((result, index) =>
            result instanceof Error ? [{ zoneId: ids[index], message: result.message }] : [],
        ),
    };
}

/**
 * =========================================
 * DOCUMENTACIÓN DEL MÓDULO
 * =========================================
 *
 * Endpoint:
 * API_ENDPOINTS.zoneAnalysis proporciona /api/analysis/zone.
 * El servicio incorpora el zoneId codificado como segmento
 * final de la URL.
 *
 * Origen:
 * baseUrl vacío utiliza el origen del frontend.
 * Para un backend en otro host, baseUrl representa su origen,
 * por ejemplo http://localhost:3000.
 * El prefijo /api forma parte del endpoint compartido.
 *
 * Respuesta:
 * El backend entrega un objeto con success y data.
 * success debe ser true y data debe superar parseZoneInsight.
 *
 * Validación:
 * Se comprueban campos obligatorios, identidad de la zona,
 * cultivo, riesgo, puntuación sanitaria, fecha interpretable
 * y estructura de cada evidencia.
 *
 * Consultas individuales:
 * getZoneInsight devuelve un análisis validado o rechaza
 * su promesa con el fallo de la solicitud o del contrato.
 *
 * Consultas por lote:
 * getZoneInsights elimina identificadores repetidos y utiliza
 * hasta cuatro trabajadores. Cada solicitud dispone de su
 * propio timeout, cuyo valor predeterminado es 10000 ms.
 *
 * Un fallo HTTP, de red, de timeout o de contrato queda
 * registrado en failures y permite continuar con otras zonas.
 * La cancelación explícita del consumidor rechaza el lote.
 *
 * Interpretación:
 * Las zonas incluidas en failures permanecen pendientes de
 * análisis. El adaptador determina su representación geográfica
 * a partir de los resultados disponibles.
 *
 * =========================================
 */


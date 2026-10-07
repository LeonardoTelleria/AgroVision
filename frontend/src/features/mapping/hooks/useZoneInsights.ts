/**
 * =========================================
 * useZoneInsights
 * =========================================
 *
 * Hook de consulta de análisis agrícolas por zona.
 *
 * Responsabilidad:
 * - identificar el conjunto de zonas solicitado;
 * - obtener sus análisis y conservar los fallos individuales;
 * - cancelar consultas al cambiar la solicitud;
 * - exponer únicamente el resultado de la solicitud vigente.
 * =========================================
 */

import { useEffect, useMemo, useState } from "react";
import { getZoneInsights } from "../services/zoneInsightServices";
import type { ZoneInsightBatch } from "../types/zoneInsight.types";

// Resultado compartido durante la carga o cuando no existen zonas.
const EMPTY_BATCH: ZoneInsightBatch = { insights: [], failures: [] };

/** Resultado público de la consulta. */
export interface UseZoneInsightsResult extends ZoneInsightBatch {
  readonly isLoading: boolean;
}

/** Identidad de una ejecución de consulta. */
interface ZoneInsightsRequest {
  readonly key: string;
  readonly baseUrl: string;
  // Una nueva versión identifica una recarga explícita del mismo conjunto.
  readonly refreshKey: number;
}

/** Snapshot asociado con una solicitud concreta. */
interface ZoneInsightsState {
  readonly request: ZoneInsightsRequest;
  readonly batch: ZoneInsightBatch;
}

export function useZoneInsights(zoneIds: readonly string[], baseUrl = "", refreshKey = 0): UseZoneInsightsResult {
  // Ordenamos y deduplicamos los IDs para reconocer solicitudes equivalentes.
  const key = JSON.stringify([...new Set(zoneIds)].sort());
  const ids = useMemo<readonly string[]>(() => JSON.parse(key), [key]);
  // La identidad también distingue volver a una finca después de otra consulta.
  const request = useMemo(() => ({ key, baseUrl, refreshKey }), [key, baseUrl, refreshKey]);
  const [state, setState] = useState<ZoneInsightsState | null>(null);

  useEffect(() => {
    if (!ids.length) return;

    // Cada ejecución posee su propia cancelación.
    const controller = new AbortController();

    void getZoneInsights(ids, { signal: controller.signal, baseUrl: request.baseUrl }).then((batch) => {
      if (!controller.signal.aborted) setState({ request, batch });
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;

      // Un fallo general se comunica mediante el mismo contrato por zona.
      const message = error instanceof Error ? error.message : String(error);
      const failures = ids.map((zoneId) => ({ zoneId, message }));
      setState({ request, batch: { insights: [], failures } });
    });

    // Cancelamos al cambiar de zonas, de servidor o al desmontar.
    return () => controller.abort();
  }, [ids, request]);

  // La identidad del snapshot evita exponer datos de otra solicitud.
  const current = state?.request === request;
  const batch = current && state ? state.batch : EMPTY_BATCH;
  return { ...batch, isLoading: ids.length > 0 && !current };
}

/**
 * DOCUMENTACIÓN DE INTEGRACIÓN
 *
 * Entrada: IDs de zonas, URL base opcional y versión de recarga refreshKey.
 * Salida: insights válidos, failures por zona e isLoading.
 *
 * Solicitudes equivalentes conservan la consulta aunque React reciba
 * otro array o cambie el orden de los mismos IDs. Una lista vacía
 * devuelve un resultado vacío y finalizado sin consultar el servidor.
 *
 * El servicio administra endpoint, validación, timeout y concurrencia.
 * El hook administra cancelación e identidad del resultado en React.
 *
 * Los fallos parciales permiten representar los análisis disponibles.
 * Cambiar zonas, baseUrl o refreshKey inicia otra consulta. Incrementar
 * refreshKey vuelve a consultar el mismo conjunto y cancela la ejecución
 * anterior. El hook conserva el último snapshot de su sesión.
 */

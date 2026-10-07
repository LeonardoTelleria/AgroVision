/**
 * =========================================
 * useMappingLayers
 * =========================================
 *
 * Integración del motor GIS con el ciclo de vida de React.
 *
 * Responsabilidad:
 * - crear un coordinador por instancia cartográfica;
 * - transmitir los snapshots de datos posteriores;
 * - utilizar los callbacks vigentes del consumidor;
 * - liberar el coordinador al finalizar la sesión.
 * =========================================
 */

import { useEffect, useEffectEvent, useRef } from "react";
import type { Map } from "maplibre-gl";

import { createMappingEngine } from "../services/mappingEngine";
import type { MappingEngine, MappingEngineCallbacks, MappingEngineData } from "../services/mappingEngine";
import type { SelectedZoneData } from "../layers/interactionLayer";

/** Coordinador y último snapshot aplicado a una instancia concreta. */
interface MappingSession {
  readonly map: Map;
  readonly engine: MappingEngine;
  data: MappingEngineData;
}

export function useMappingLayers(
  map: Map | null,
  data: MappingEngineData,
  callbacks: MappingEngineCallbacks = {},
): void {
  const sessionRef = useRef<MappingSession | null>(null);

  // Los cambios de callbacks conservan la sesión cartográfica existente.
  const getData = useEffectEvent(() => data);
  const notifySelection = useEffectEvent((zone: SelectedZoneData) => callbacks.onZoneSelect?.(zone));
  const notifyUnmatched = useEffectEvent((ids: readonly string[]) => callbacks.onUnmatchedInsights?.(ids));

  const notifyError = useEffectEvent((error: unknown) => {
    callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
  });

  useEffect(() => {
    if (!map) return;

    try {
      const initialData = getData();

      const engine = createMappingEngine(map, initialData, {
        onZoneSelect: (zone) => notifySelection(zone),
        onUnmatchedInsights: (ids) => notifyUnmatched(ids),
        onError: (error) => notifyError(error),
      });

      const session: MappingSession = { map, engine, data: initialData };

      sessionRef.current = session;

      // La limpieza corresponde exclusivamente a esta sesión.
      return () => {
        if (sessionRef.current === session) sessionRef.current = null;
        engine.destroy();
      };
    } catch (error) {
      notifyError(error);
    }
  }, [map]);

  useEffect(() => {
    const session = sessionRef.current;

    if (!session || session.map !== map || session.data === data) return;

    try {
      // El montaje ya aplicó initialData; actualizamos los snapshots posteriores.
      session.engine.update(data);
      session.data = data;
    } catch (error) {
      notifyError(error);
    }
  }, [map, data]);
}

/**
 * DOCUMENTACIÓN DE INTEGRACIÓN
 *
 * Entrada: mapa cargado o null, MappingEngineData y callbacks opcionales.
 * El hook instala el motor cuando recibe una instancia disponible.
 * Cambiar la instancia destruye su coordinador y crea otra sesión.
 *
 * Los datos siguen un contrato de snapshots inmutables: al cambiar una
 * colección, ruta o selección de capas, el consumidor entrega nuevas
 * referencias. useMemo permite conservarlas durante renders equivalentes.
 *
 * El snapshot inicial se aplica una vez. Las actualizaciones posteriores
 * conservan el mapa y delegan las operaciones en MappingEngine.
 * Los callbacks se mantienen vigentes mediante useEffectEvent de React.
 *
 * Un error se entrega a onError. El consumidor decide su presentación
 * y la política de recuperación. destroy es idempotente y permite
 * la limpieza adicional realizada por React en StrictMode.
 */
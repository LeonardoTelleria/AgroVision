/**
 * =========================================
 * AgroVision Rover Layer
 * =========================================
 *
 * Vehículo agrícola animado sobre una trayectoria GeoJSON.
 *
 * Responsabilidad:
 * - registrar la fuente y la representación puntual del rover;
 * - actualizar su posición y estado operativo;
 * - calcular el desplazamiento mediante Turf;
 * - administrar inicio, pausa, reanudación y detención;
 * - liberar la animación y los recursos cartográficos.
 *
 * Integración:
 * Cada mapa dispone de un controlador con reloj, distancia
 * y requestAnimationFrame independientes.
 *
 * Recorrido:
 * Turf length calcula la longitud de la trayectoria.
 * Turf along obtiene la posición correspondiente a la distancia
 * acumulada. Al completar el recorrido, la simulación continúa
 * desde su inicio conservando la distancia sobrante.
 *
 * =========================================
 */

// Importamos los tipos GeoJSON necesarios.
import type { Feature, LineString, Point } from "geojson";

// Importamos Turf para calcular la posición del rover sobre la trayectoria.
import { along, length } from "@turf/turf";

// Importamos los tipos de MapLibre.
import type { GeoJSONSource, Map } from "maplibre-gl";

// Reutilizamos el contrato centralizado de coordenadas.
import type { LngLat } from "../types/mappingGeo.types";

// =========================================
// IDS
// =========================================

// ID de la fuente GeoJSON del rover.
export const ROVER_SOURCE_ID = "agrovision-rover-source";

// ID de la capa visual del rover.
export const ROVER_LAYER_ID = "agrovision-rover-layer";

// =========================================
// TYPES
// =========================================

// Propiedades del rover.
export interface RoverProperties {
    readonly roverId: string;
    readonly status: "ACTIVE" | "PAUSED" | "OFFLINE";
    // Velocidad configurada para la simulación.
    readonly speedKmh: number;
}

// Feature puntual del rover.
export type RoverFeature = Feature<Point, RoverProperties>;

// Trayectoria compatible con propiedades GeoJSON, incluido MapLineFeature.
export type RoverRoute = Feature<LineString>;

/** Snapshot del progreso simulado de una ruta, expresado en metros. */
export interface RoverProgress {
  // Identifica el recorrido al que pertenece este snapshot.
  readonly routeId: string | number | null;

  // Estado operativo del vehículo.
  readonly status: RoverProperties["status"];

  // Distancia de la vuelta actual y longitud completa de la ruta.
  readonly distanceMeters: number;
  readonly routeLengthMeters: number;

  // Distancia acumulada desde el inicio y vueltas completadas.
  readonly totalDistanceMeters: number;
  readonly completedLaps: number;
}

// Contrato público del controlador de animación.
export interface RoverController {
    start(route: RoverRoute): void;
    pause(): void;
    resume(): void;
    stop(): void;
    destroy(): void;
}

// =========================================
// CONSTANTS AND CONTROLLERS
// =========================================

// Conservamos la velocidad y la frecuencia visual originales.
const ROVER_SPEED_KMH = 12;
const ROVER_FRAME_TIME = 1000 / 30;

// Asociamos un controlador vigente a cada mapa.
const controllers = new WeakMap<Map, RoverController>();

// =========================================
// CREATE ROVER
// =========================================

/**
 * Crea el punto del rover con su estado operativo.
 *
 * @param coordinates Posición en orden longitud, latitud.
 * @param status Estado comunicado por el controlador.
 * @param speedKmh Velocidad configurada para la simulación.
 */
export const createRoverFeature = (
    coordinates: LngLat,
    status: RoverProperties["status"] = "ACTIVE",
    speedKmh = ROVER_SPEED_KMH,
): RoverFeature => {
    return {
        type: "Feature",
        id: "rover-001",
        geometry: {
            type: "Point",
            // Aislamos las coordenadas frente a modificaciones del consumidor.
            coordinates: [...coordinates],
        },
        properties: {
            roverId: "rover-001",
            status,
            speedKmh,
        },
    };
};

// =========================================
// ADD ROVER
// =========================================

/**
 * Registra la fuente y la capa visual del rover.
 *
 * @param map Instancia activa con el estilo cargado.
 * @param initialCoordinates Posición inicial del vehículo.
 * @returns true cuando registra la capa; false cuando ya existe.
 */
export const addRoverLayer = (map: Map, initialCoordinates: LngLat): boolean => {
    // Registramos la fuente cuando todavía falta.
    if (!map.getSource(ROVER_SOURCE_ID)) {
        map.addSource(ROVER_SOURCE_ID, {
            type: "geojson",
            data: createRoverFeature(initialCoordinates),
        });
    }

    // Conservamos la capa registrada.
    if (map.getLayer(ROVER_LAYER_ID)) return false;

    // Agregamos la representación visual conservando el diseño original.
    map.addLayer({
        id: ROVER_LAYER_ID,
        type: "circle",
        source: ROVER_SOURCE_ID,
        paint: {
            "circle-radius": 7,
            "circle-color": "#123C35",
            "circle-stroke-color": "#FFFFFF",
            "circle-stroke-width": 2,
        },
    });

    return true;
};

// =========================================
// UPDATE POSITION
// =========================================

/**
 * Actualiza la posición y el estado del rover registrado.
 *
 * @param map Instancia activa de MapLibre.
 * @param coordinates Nueva posición.
 * @param status Estado operativo.
 * @param speedKmh Velocidad configurada para la simulación.
 */
export const updateRoverPosition = (
    map: Map,
    coordinates: LngLat,
    status: RoverProperties["status"] = "ACTIVE",
    speedKmh = ROVER_SPEED_KMH,
): void => {
    // Obtenemos explícitamente la fuente GeoJSON.
    const source = map.getSource<GeoJSONSource>(ROVER_SOURCE_ID);
    if (!source) return;

    // Actualizamos el punto conservando la capa visual.
    void source.setData(createRoverFeature(coordinates, status, speedKmh));
};

// =========================================
// ANIMATION CONTROLLER
// =========================================

/**
 * Crea un controlador de animación asociado al mapa.
 *
 * Reemplaza el controlador anterior de ese mismo mapa.
 * El controlador se destruye también cuando MapLibre elimina el mapa.
 *
 * @param map Instancia cartográfica del rover.
 * @param speedKmh Velocidad positiva de simulación.
 * @returns Controlador de inicio, pausa, reanudación y limpieza.
 */
/**
 * Crea un controlador de movimiento independiente para esta instancia.
 *
 * onProgress comunica cambios de estado inmediatamente y agrupa
 * las actualizaciones de movimiento para la presentación en React.
 */
export function createRoverController(
  map: Map,
  speedKmh = ROVER_SPEED_KMH,
  onProgress?: (progress: RoverProgress) => void,
): RoverController {
  // Verificamos la velocidad antes de iniciar una simulación.
  if (!Number.isFinite(speedKmh) || speedKmh <= 0) {
    throw new Error("La velocidad del rover debe ser positiva.");
  }

  // Finalizamos un controlador anterior asociado con este mapa.
  controllers.get(map)?.destroy();

  // Cada controlador conserva su propio reloj y frame pendiente.
  let frame: number | null = null;
  let lastTime: number | null = null;

  // Conservamos la distancia actual, el acumulado y la longitud de la ruta.
  let distanceKm = 0;
  let totalDistanceKm = 0;
  let routeLengthKm = 0;

  // Limitamos las notificaciones de movimiento a cuatro por segundo.
  let lastProgressTime: number | null = null;

  // Conservamos la ruta y la posición utilizadas por esta simulación.
  let route: RoverRoute | null = null;
  let position: LngLat | null = null;
  let destroyed = false;

  // Cancelamos el siguiente frame y reiniciamos la referencia temporal.
  const cancel = (): void => {
    if (frame !== null) cancelAnimationFrame(frame);

    frame = null;
    lastTime = null;
  };

  // Sincronizamos el punto geográfico y publicamos las métricas disponibles.
  const publish = (status: RoverProperties["status"], timestamp?: number): void => {
    // El punto visual conserva la frecuencia de la animación.
    if (position && !destroyed) updateRoverPosition(map, position, status, speedKmh);

    // Los estados se entregan inmediatamente; el movimiento se agrupa.
    if (
      destroyed
      || !route
      || (
        timestamp !== undefined
        && lastProgressTime !== null
        && timestamp - lastProgressTime < 250
      )
    ) {
      return;
    }

    // Registramos el instante de la última notificación de movimiento.
    lastProgressTime = timestamp ?? null;

    // Convertimos kilómetros a metros para el contrato público.
    onProgress?.({
      routeId: route.id ?? null,
      status,
      distanceMeters: distanceKm * 1000,
      routeLengthMeters: routeLengthKm * 1000,
      totalDistanceMeters: totalDistanceKm * 1000,
      completedLaps: Math.floor(totalDistanceKm / routeLengthKm),
    });
  };

  // Calculamos el avance sobre la ruta en cada frame disponible.
  const animate = (timestamp: number): void => {
    // Finalizamos cuando desaparece la sesión o su fuente geográfica.
    if (destroyed || !route || !map.getSource(ROVER_SOURCE_ID)) {
      cancel();
      return;
    }

    // El primer frame establece el inicio de la medición temporal.
    if (lastTime === null) lastTime = timestamp;

    const elapsed = timestamp - lastTime;

    // Conservamos la frecuencia visual configurada para el rover.
    if (elapsed >= ROVER_FRAME_TIME) {
      lastTime = timestamp;

      // Limitamos el salto cuando la pestaña vuelve de una suspensión.
      totalDistanceKm += speedKmh * Math.min(elapsed, 1000) / 3_600_000;

      // La vuelta actual conserva el sobrante al alcanzar el final.
      distanceKm = totalDistanceKm % routeLengthKm;

      // Turf obtiene la posición correspondiente a la distancia recorrida.
      const [longitude, latitude] = along(route, distanceKm, { units: "kilometers" }).geometry.coordinates;

      position = [longitude, latitude];

      // Actualizamos el mapa y comunicamos el avance cuando corresponde.
      publish("ACTIVE", timestamp);
    }

    // Programamos el siguiente frame de esta simulación.
    frame = requestAnimationFrame(animate);
  };

  // Pausar conserva la posición y las distancias acumuladas.
  const pause = (): void => {
    cancel();
    publish("PAUSED");
  };

  // Detener finaliza la animación y comunica el estado operativo.
  const stop = (): void => {
    cancel();
    publish("OFFLINE");
  };

  // Reanudamos únicamente cuando existe una ruta y no hay otro frame activo.
  const resume = (): void => {
    if (destroyed || !route || frame !== null) return;

    publish("ACTIVE");
    frame = requestAnimationFrame(animate);
  };

  // Liberamos el controlador una sola vez.
  const destroy = (): void => {
    if (destroyed) return;

    cancel();
    destroyed = true;
    route = null;
    position = null;

    // Retiramos la escucha de destrucción de este mapa.
    map.off("remove", destroy);

    // Conservamos cualquier controlador posterior que pertenezca al mapa.
    if (controllers.get(map) === controller) controllers.delete(map);
  };

  // Exponemos las operaciones públicas de la simulación.
  const controller: RoverController = {
    start(nextRoute) {
      if (destroyed) return;

      // Verificamos la cantidad y validez de las coordenadas.
      const coordinates = nextRoute.geometry.coordinates;

      if (
        coordinates.length < 2
        || coordinates.some((point) =>
          point.length < 2
          || !point.every(Number.isFinite)
          || Math.abs(point[0]) > 180
          || Math.abs(point[1]) > 90
        )
      ) {
        throw new Error("Trayectoria GIS inválida.");
      }

      // Verificamos que la ruta permita un desplazamiento real.
      const nextLength = length(nextRoute, { units: "kilometers" });

      if (!Number.isFinite(nextLength) || nextLength <= 0) {
        throw new Error("La trayectoria debe tener longitud positiva.");
      }

      // Finalizamos el recorrido anterior antes de aplicar otra geometría.
      cancel();

      // Aislamos la ruta frente a mutaciones externas.
      route = structuredClone(nextRoute);
      routeLengthKm = nextLength;

      // Una nueva ruta inicia otra simulación desde su primer punto.
      distanceKm = 0;
      totalDistanceKm = 0;
      lastProgressTime = null;
      position = [coordinates[0][0], coordinates[0][1]];

      // Garantizamos que exista la representación visual del rover.
      addRoverLayer(map, position);

      // Publicamos el estado inicial e iniciamos la animación.
      resume();
    },
    pause,
    resume,
    stop,
    destroy,
  };

  // Asociamos el controlador y su limpieza con la instancia cartográfica.
  controllers.set(map, controller);
  map.on("remove", destroy);

  return controller;
}

// =========================================
// COMPATIBILITY FUNCTIONS
// =========================================

/** Inicia el recorrido utilizando el controlador asociado al mapa. */
export const startRoverAnimation = (map: Map, route: RoverRoute): void => {
    let controller = controllers.get(map);

    if (!controller) {
        controller = createRoverController(map);
    }

    controller.start(route);
};

/** Detiene la animación del mapa indicado. */
export const stopRoverAnimation = (map: Map): void => {
    controllers.get(map)?.stop();
};

// =========================================
// REMOVE
// =========================================

/** Destruye el controlador y libera la capa y la fuente del rover. */
export const removeRoverLayer = (map: Map): void => {
    // Liberamos primero la animación asociada al mapa.
    controllers.get(map)?.destroy();

    // Eliminamos la capa visual.
    if (map.getLayer(ROVER_LAYER_ID)) {
        map.removeLayer(ROVER_LAYER_ID);
    }

    // Eliminamos la fuente.
    if (map.getSource(ROVER_SOURCE_ID)) {
        map.removeSource(ROVER_SOURCE_ID);
    }
};



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
export function createRoverController(map: Map, speedKmh = ROVER_SPEED_KMH): RoverController {
    // Validamos la velocidad antes de reemplazar una sesión existente.
    if (!Number.isFinite(speedKmh) || speedKmh <= 0) {
        throw new Error("La velocidad del rover debe ser positiva.");
    }

    controllers.get(map)?.destroy();

    // Estado privado de esta animación.
    let frame: number | null = null;
    let lastTime: number | null = null;
    let distanceKm = 0;
    let routeLengthKm = 0;
    let route: RoverRoute | null = null;
    let position: LngLat | null = null;
    let destroyed = false;

    // Cancelamos el frame pendiente y reiniciamos el reloj.
    const cancel = (): void => {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        lastTime = null;
    };

    // Publicamos la posición con el estado operativo correspondiente.
    const publish = (status: RoverProperties["status"]): void => {
        if (position && !destroyed) {
            updateRoverPosition(map, position, status, speedKmh);
        }
    };

    // Calculamos el desplazamiento y solicitamos el siguiente frame.
    const animate = (timestamp: number): void => {
        if (destroyed || !route || !map.getSource(ROVER_SOURCE_ID)) {
            cancel();
            return;
        }

        if (lastTime === null) lastTime = timestamp;
        const elapsed = timestamp - lastTime;

        // Limitamos las actualizaciones a la frecuencia visual configurada.
        if (elapsed >= ROVER_FRAME_TIME) {
            lastTime = timestamp;

            // Limitamos el salto al recuperar una pestaña suspendida.
            const elapsedMs = Math.min(elapsed, 1000);

            // Convertimos km/h a km/ms y conservamos el sobrante al completar la ruta.
            distanceKm = (distanceKm + speedKmh * elapsedMs / 3_600_000) % routeLengthKm;

            // Calculamos la posición geográfica sobre el recorrido.
            const currentPoint = along(route, distanceKm, { units: "kilometers" });
            const [longitude, latitude] = currentPoint.geometry.coordinates;

            position = [longitude, latitude];
            publish("ACTIVE");
        }

        frame = requestAnimationFrame(animate);
    };

    // Pausamos el desplazamiento conservando la posición y la distancia.
    const pause = (): void => {
        cancel();
        publish("PAUSED");
    };

    // Detenemos el desplazamiento y conservamos la última posición.
    const stop = (): void => {
        cancel();
        publish("OFFLINE");
    };

    // Reanudamos desde la posición conservada con un nuevo reloj.
    const resume = (): void => {
        if (destroyed || !route || frame !== null) return;

        publish("ACTIVE");
        frame = requestAnimationFrame(animate);
    };

    // Liberamos la sesión y su asociación con el mapa.
    const destroy = (): void => {
        if (destroyed) return;

        cancel();
        destroyed = true;
        route = null;
        position = null;

        map.off("remove", destroy);

        if (controllers.get(map) === controller) {
            controllers.delete(map);
        }
    };

    const controller: RoverController = {
        start(nextRoute) {
            if (destroyed) return;

            // Validamos las posiciones antes de reemplazar el recorrido actual.
            const coordinates = nextRoute.geometry.coordinates;
            const invalidCoordinates = coordinates.length < 2 || coordinates.some((point) =>
                point.length < 2 ||
                !point.every(Number.isFinite) ||
                Math.abs(point[0]) > 180 ||
                Math.abs(point[1]) > 90,
            );

            if (invalidCoordinates) {
                throw new Error("Trayectoria GIS inválida.");
            }

            const nextLength = length(nextRoute, { units: "kilometers" });

            if (!Number.isFinite(nextLength) || nextLength <= 0) {
                throw new Error("La trayectoria debe tener longitud positiva.");
            }

            cancel();

            // Aislamos la ruta frente a modificaciones externas.
            route = structuredClone(nextRoute);
            routeLengthKm = nextLength;
            distanceKm = 0;
            position = [coordinates[0][0], coordinates[0][1]];

            addRoverLayer(map, position);
            resume();
        },
        pause,
        resume,
        stop,
        destroy,
    };

    // Registramos la sesión antes de entregar el controlador.
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
/**
 * =========================================
 * AgroVision Trajectory Layer
 * =========================================
 *
 * Representación cartográfica de las trayectorias del rover.
 *
 * Responsabilidad:
 * - registrar una trayectoria LineString recibida;
 * - renderizar la línea principal y su halo;
 * - actualizar los datos del recorrido;
 * - controlar conjuntamente la visibilidad de ambas capas;
 * - liberar las capas y su fuente.
 *
 * Integración:
 * El consumidor proporciona la trayectoria y una instancia
 * de MapLibre con el estilo cargado.
 *
 * Representación:
 * La fuente utiliza lineMetrics para aplicar el gradiente
 * según el progreso espacial de la línea.
 * El halo se coloca debajo de la capa principal.
 *
 * Datos:
 * roverTrajectoryData.ts proporciona el recorrido demo.
 * La composición GIS comparte ese recorrido con la animación.
 *
 * =========================================
 */

// Importamos los tipos de MapLibre.
import type { GeoJSONSource, GeoJSONSourceSpecification, LineLayerSpecification, Map } from "maplibre-gl";

// Importamos el contrato GIS centralizado.
import type { MapLineFeature } from "../types/mappingGeo.types";

// =========================================
// IDS
// =========================================

// ID de la fuente GeoJSON de la trayectoria.
export const TRAJECTORY_SOURCE_ID = "agrovision-trajectory-source";

// ID de la capa principal de trayectoria.
export const TRAJECTORY_LAYER_ID = "agrovision-trajectory-layer";

// ID de la capa secundaria utilizada como halo visual.
export const TRAJECTORY_GLOW_LAYER_ID = "agrovision-trajectory-glow";

// =========================================
// TYPES
// =========================================

// Conservamos el nombre público utilizando el contrato centralizado.
export type TrajectoryFeature = MapLineFeature;

// =========================================
// SOURCE
// =========================================

/**
 * Crea la fuente GeoJSON de la trayectoria recibida.
 *
 * @param trajectory Recorrido representado como LineString.
 */
export const createTrajectorySource = (trajectory: TrajectoryFeature): GeoJSONSourceSpecification => {
    return {
        type: "geojson",
        // Permitimos utilizar line-gradient.
        lineMetrics: true,
        // Ruta proporcionada por el consumidor.
        data: trajectory,
    };
};

// =========================================
// MAIN LAYER
// =========================================

/** Crea la línea principal de trayectoria. */
export const createTrajectoryLayer = (): LineLayerSpecification => {
    return {
        id: TRAJECTORY_LAYER_ID,
        type: "line",
        source: TRAJECTORY_SOURCE_ID,
        paint: {
            // Gradiente basado en el progreso espacial de la ruta.
            "line-gradient": [
                "interpolate", ["linear"], ["line-progress"],
                // Inicio de la trayectoria.
                0, "#9BE15D",
                // Primer tramo.
                0.35, "#62C370",
                // Tramo central.
                0.7, "#2E8B74",
                // Final.
                1, "#123C35",
            ],

            // Grosor adaptativo por zoom.
            "line-width": [
                "interpolate", ["linear"], ["zoom"],
                8, 2,
                12, 3,
                16, 4,
                20, 5,
            ],

            // Opacidad principal.
            "line-opacity": 0.95,
            // Suavizado de la línea.
            "line-blur": 0.1,
        },
        layout: {
            // Terminaciones redondeadas.
            "line-cap": "round",
            // Uniones redondeadas.
            "line-join": "round",
            // La trayectoria comienza visible.
            visibility: "visible",
        },
    };
};

// =========================================
// GLOW LAYER
// =========================================

/** Crea el halo situado debajo de la línea principal. */
export const createTrajectoryGlowLayer = (): LineLayerSpecification => {
    return {
        id: TRAJECTORY_GLOW_LAYER_ID,
        type: "line",
        source: TRAJECTORY_SOURCE_ID,
        paint: {
            // Color uniforme del halo.
            "line-color": "#9BE15D",

            // Grosor superior al de la línea principal.
            "line-width": [
                "interpolate", ["linear"], ["zoom"],
                8, 5,
                12, 7,
                16, 9,
                20, 11,
            ],

            // Opacidad baja para crear profundidad.
            "line-opacity": 0.18,
            // Difuminado suave.
            "line-blur": 1.5,
        },
        layout: {
            // Terminaciones redondeadas.
            "line-cap": "round",
            // Uniones redondeadas.
            "line-join": "round",
            visibility: "visible",
        },
    };
};

// =========================================
// ADD LAYERS
// =========================================

/**
 * Registra o actualiza la representación de una trayectoria.
 *
 * Reutiliza la fuente existente y agrega las capas faltantes,
 * conservando la configuración de las capas presentes.
 *
 * @param map Instancia activa con el estilo cargado.
 * @param trajectory Recorrido proporcionado por el consumidor.
 * @param beforeLayerId Capa existente antes de la cual insertar la línea principal.
 * @returns true cuando registra alguna capa; false si ambas ya existen.
 */
export const addTrajectoryLayer = (
    map: Map,
    trajectory: TrajectoryFeature,
    beforeLayerId?: string,
): boolean => {
    // Actualizamos la fuente existente o registramos una nueva.
    if (map.getSource(TRAJECTORY_SOURCE_ID)) {
        updateTrajectoryData(map, trajectory);
    } else {
        const source = createTrajectorySource(trajectory);
        map.addSource(TRAJECTORY_SOURCE_ID, source);
    }

    // Comprobamos qué capas necesitan registrarse.
    const mainExists = Boolean(map.getLayer(TRAJECTORY_LAYER_ID));
    const glowExists = Boolean(map.getLayer(TRAJECTORY_GLOW_LAYER_ID));

    if (!mainExists) {
        // Creamos la línea principal.
        const mainLayer = createTrajectoryLayer();

        // Utilizamos la referencia cuando está disponible.
        map.addLayer(mainLayer, beforeLayerId && map.getLayer(beforeLayerId) ? beforeLayerId : undefined);
    }

    if (!glowExists) {
        // Colocamos el halo debajo de la línea principal.
        const glowLayer = createTrajectoryGlowLayer();
        map.addLayer(glowLayer, TRAJECTORY_LAYER_ID);
    }

    return !mainExists || !glowExists;
};

// =========================================
// UPDATE DATA
// =========================================

/**
 * Reemplaza los datos del recorrido conservando sus capas.
 *
 * @param map Instancia activa de MapLibre.
 * @param trajectory Nueva trayectoria LineString.
 */
export const updateTrajectoryData = (map: Map, trajectory: TrajectoryFeature): void => {
    // Obtenemos explícitamente la fuente GeoJSON.
    const source = map.getSource<GeoJSONSource>(TRAJECTORY_SOURCE_ID);
    if (!source) return;

    // Solicitamos la actualización de los datos de la trayectoria.
    void source.setData(trajectory);
};

// =========================================
// VISIBILITY
// =========================================

/**
 * Cambia conjuntamente la visibilidad de la línea principal y el halo.
 *
 * @param map Instancia activa de MapLibre.
 * @param visible true muestra la trayectoria; false la oculta.
 */
export const setTrajectoryVisibility = (map: Map, visible: boolean): void => {
    // Convertimos el estado en un valor de MapLibre.
    const visibility = visible ? "visible" : "none";

    // Actualizamos la línea principal si existe.
    if (map.getLayer(TRAJECTORY_LAYER_ID)) {
        map.setLayoutProperty(TRAJECTORY_LAYER_ID, "visibility", visibility);
    }

    // Actualizamos también el halo.
    if (map.getLayer(TRAJECTORY_GLOW_LAYER_ID)) {
        map.setLayoutProperty(TRAJECTORY_GLOW_LAYER_ID, "visibility", visibility);
    }
};

// =========================================
// TOGGLE
// =========================================

/** Alterna la visibilidad de la trayectoria utilizando el estado de la línea principal. */
export const toggleTrajectoryVisibility = (map: Map): void => {
    if (!map.getLayer(TRAJECTORY_LAYER_ID)) return;

    // Consultamos su visibilidad actual.
    const visibility = map.getLayoutProperty(TRAJECTORY_LAYER_ID, "visibility");

    // La visibilidad predeterminada se trata como visible.
    const nextVisible = visibility === "none";
    setTrajectoryVisibility(map, nextVisible);
};

// =========================================
// REMOVE
// =========================================

/** Libera las dos capas de trayectoria y después su fuente GeoJSON. */
export const removeTrajectoryLayer = (map: Map): void => {
    // Eliminamos primero el halo.
    if (map.getLayer(TRAJECTORY_GLOW_LAYER_ID)) {
        map.removeLayer(TRAJECTORY_GLOW_LAYER_ID);
    }

    // Eliminamos después la línea principal.
    if (map.getLayer(TRAJECTORY_LAYER_ID)) {
        map.removeLayer(TRAJECTORY_LAYER_ID);
    }

    // Eliminamos finalmente la fuente.
    if (map.getSource(TRAJECTORY_SOURCE_ID)) {
        map.removeSource(TRAJECTORY_SOURCE_ID);
    }
};
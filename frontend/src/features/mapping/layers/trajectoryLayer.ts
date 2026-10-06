/**
 * =========================================
 * AgroVision Trajectory Layer
 * =========================================
 *
 * Trayectoria histórica del rover de AgroVision.
 *
 * Responsabilidad:
 * - definir la ruta histórica del rover;
 * - exponerla como LineString GeoJSON;
 * - renderizar la trayectoria en MapLibre;
 * - permitir actualizar la trayectoria;
 * - controlar su visibilidad;
 * - proporcionar la misma ruta que posteriormente utilizará el rover animado.
 *
 * Flujo:
 *
 * Rover GPS / simulación
 *         ↓
 *      LineString
 *         ↓
 *      GeoJSON
 *         ↓
 *       MapLibre
 *         ↓
 *  Trayectoria histórica
 *
 * =========================================
 */

// Importamos los tipos GeoJSON necesarios.
import type {Feature, LineString} from "geojson";

// Importamos los tipos de MapLibre.
import type { GeoJSONSource, GeoJSONSourceSpecification, LineLayerSpecification, Map} from "maplibre-gl";

// Importamos el contrato GIS centralizado.
import type { MapLineFeature, MapLineFeatureProperties} from "../types/mappingGeo.types";

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

// Definimos explícitamente el Feature de trayectoria.
export type TrajectoryFeature = Feature<LineString, MapLineFeatureProperties>;

// =========================================
// DEMO TRAJECTORY
// =========================================

/**
 * Trayectoria histórica simulada del rover.
 *
 * Las coordenadas se mantienen dentro de la finca definida en mappingGeoData.ts.
 */
export const agroVisionRoverTrajectory:
  MapLineFeature = {
  // Feature GeoJSON.
  type: "Feature",
  // ID estable.
  id: "trajectory-001",
  // Geometría histórica.
  geometry: {
    // Una trayectoria es un LineString.
    type: "LineString",
    // Secuencia ordenada de posiciones GPS.
    coordinates: [
      // Inicio del recorrido.
      [-87.1312, 12.6251],
      // Primer desplazamiento.
      [-87.1308, 12.6258],
      // Segundo desplazamiento.
      [-87.1300, 12.6265],
      // Avance hacia el centro.
      [-87.1290, 12.6270],
      // Cambio de dirección.
      [-87.1279, 12.6272],
      // Continuación.
      [-87.1268, 12.6268],
      // Entrada al siguiente sector.
      [-87.1257, 12.6261],
      // Desplazamiento longitudinal.
      [-87.1247, 12.6257],
      // Giro hacia el este.
      [-87.1237, 12.6252],
      // Último tramo.
      [-87.1227, 12.6250],
    ],
  },

  // Propiedades GIS de la trayectoria.
  properties: {
    // Identificador único.
    routeId: "trajectory-001",

    // Field recorrido.
    fieldId: "field-001",

    // Zona principal atravesada.
    zoneId: "zone-002",

    // Tipo oficial de línea.
    kind: "ROVER_TRAJECTORY",

    // Nombre visible.
    name: "Trayectoria Rover 01",

    // Distancia calculable posteriormente.
    distanceMeters: null,
  },
};

// =========================================
// SOURCE
// =========================================

/**
 * Crea la fuente GeoJSON de la trayectoria.
 */
export const createTrajectorySource =
  (): GeoJSONSourceSpecification => {
    // Devolvemos una fuente GeoJSON.
    return {
      // Tipo oficial de fuente.
      type: "geojson",

      // Permitimos utilizar line-gradient.
      lineMetrics: true,

      // Ruta histórica.
      data: agroVisionRoverTrajectory,
    };
  };

// =========================================
// MAIN LAYER
// =========================================

/**
 * Crea la línea principal de trayectoria.
 */
export const createTrajectoryLayer =
  (): LineLayerSpecification => {
    // Devolvemos la capa de línea.
    return {
      // ID único.
      id: TRAJECTORY_LAYER_ID,

      // Tipo visual.
      type: "line",

      // Fuente de la trayectoria.
      source: TRAJECTORY_SOURCE_ID,

      // Propiedades visuales.
      paint: {
        // Gradiente basado en el progreso de la ruta.
        "line-gradient": [
          "interpolate",
          ["linear"],
          ["line-progress"],

          // Inicio de la trayectoria.
          0,
          "#9BE15D",

          // Primer tramo.
          0.35,
          "#62C370",

          // Tramo central.
          0.7,
          "#2E8B74",

          // Final.
          1,
          "#123C35",
        ],

        // Grosor adaptativo por zoom.
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          8,
          2,
          12,
          3,
          16,
          4,
          20,
          5,
        ],

        // Opacidad principal.
        "line-opacity": 0.95,

        // Suavizado de la línea.
        "line-blur": 0.1,
      },

      // Terminaciones redondeadas.
      layout: {
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

/**
 * Crea una segunda línea debajo de la principal
 * para mejorar la separación visual.
 */
export const createTrajectoryGlowLayer =
  (): LineLayerSpecification => {
    // Devolvemos la capa secundaria.
    return {
      // ID del halo.
      id: TRAJECTORY_GLOW_LAYER_ID,

      // Tipo visual.
      type: "line",

      // Utilizamos la misma fuente.
      source: TRAJECTORY_SOURCE_ID,

      // Propiedades visuales.
      paint: {
        // Color uniforme del halo.
        "line-color": "#9BE15D",

        // Grosor superior al de la línea principal.
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          8,
          5,
          12,
          7,
          16,
          9,
          20,
          11,
        ],

        // Opacidad baja para crear profundidad.
        "line-opacity": 0.18,

        // Difuminado suave.
        "line-blur": 1.5,
      },

      // Terminaciones redondeadas.
      layout: {
        "line-cap": "round",

        // Uniones redondeadas.
        "line-join": "round",

        // Inicialmente visible.
        visibility: "visible",
      },
    };
  };

// =========================================
// ADD LAYERS
// =========================================

/**
 * Agrega la trayectoria completa al mapa.
 */
export const addTrajectoryLayer = (
  map: Map,
  beforeLayerId?: string,
): boolean => {
  // Comprobamos si la fuente ya existe.
  const sourceExists = Boolean(
    map.getSource(
      TRAJECTORY_SOURCE_ID,
    ),
  );

  // Creamos la fuente solamente una vez.
  if (!sourceExists) {
    // Construimos la fuente.
    const source =
      createTrajectorySource();

    // Registramos la fuente.
    map.addSource(
      TRAJECTORY_SOURCE_ID,
      source,
    );
  }

  // Comprobamos si la línea principal ya existe.
  const layerExists = Boolean(
    map.getLayer(
      TRAJECTORY_LAYER_ID,
    ),
  );

  // Si no existe, la creamos.
  if (!layerExists) {
    // Creamos la línea principal.
    const mainLayer =
      createTrajectoryLayer();

    // Insertamos la línea en la posición solicitada.
    if (
      beforeLayerId &&
      map.getLayer(beforeLayerId)
    ) {
      // Colocamos la trayectoria antes de la
      // capa indicada.
      map.addLayer(
        mainLayer,
        beforeLayerId,
      );
    } else {
      // Sin referencia, se agrega al final.
      map.addLayer(mainLayer);
    }
  }

  // Comprobamos si el halo ya existe.
  const glowExists = Boolean(
    map.getLayer(
      TRAJECTORY_GLOW_LAYER_ID,
    ),
  );

  // Creamos el halo cuando todavía no existe.
  if (!glowExists) {
    // Construimos el halo.
    const glowLayer =
      createTrajectoryGlowLayer();

    // Colocamos el halo debajo de la línea principal.
    map.addLayer(
      glowLayer,
      TRAJECTORY_LAYER_ID,
    );
  }

  // Indicamos que la operación terminó.
  return true;
};

// =========================================
// UPDATE DATA
// =========================================

/**
 * Reemplaza la trayectoria histórica completa.
 */
export const updateTrajectoryData = (
  map: Map,
  trajectory: TrajectoryFeature,
): void => {
  // Obtenemos explícitamente la fuente GeoJSON.
  const source =
    map.getSource<GeoJSONSource>(
      TRAJECTORY_SOURCE_ID,
    );

  // Si no existe, no continuamos.
  if (!source) {
    return;
  }

  // Reemplazamos los datos de la trayectoria.
  void source.setData(
    trajectory,
  );
};

// =========================================
// VISIBILITY
// =========================================

/**
 * Cambia la visibilidad de toda la trayectoria.
 */
export const setTrajectoryVisibility = (
  map: Map,
  visible: boolean,
): void => {
  // Convertimos el estado en valor de MapLibre.
  const visibility = visible
    ? "visible"
    : "none";

  // Actualizamos la línea principal si existe.
  if (
    map.getLayer(
      TRAJECTORY_LAYER_ID,
    )
  ) {
    map.setLayoutProperty(
      TRAJECTORY_LAYER_ID,
      "visibility",
      visibility,
    );
  }

  // Actualizamos también el halo.
  if (
    map.getLayer(
      TRAJECTORY_GLOW_LAYER_ID,
    )
  ) {
    map.setLayoutProperty(
      TRAJECTORY_GLOW_LAYER_ID,
      "visibility",
      visibility,
    );
  }
};

// =========================================
// TOGGLE
// =========================================

/**
 * Alterna la visibilidad de la trayectoria.
 */
export const toggleTrajectoryVisibility = (
  map: Map,
): void => {
  // Obtenemos la capa principal.
  const layer =
    map.getLayer(
      TRAJECTORY_LAYER_ID,
    );

  // Si todavía no existe, no hacemos nada.
  if (!layer) {
    return;
  }

  // Consultamos su visibilidad actual.
  const visibility =
    map.getLayoutProperty(
      TRAJECTORY_LAYER_ID,
      "visibility",
    );

  // Calculamos el siguiente estado.
  const nextVisible =
    visibility !== "visible";

  // Aplicamos el nuevo estado.
  setTrajectoryVisibility(
    map,
    nextVisible,
  );
};

// =========================================
// REMOVE
// =========================================

/**
 * Elimina las capas y la fuente de trayectoria.
 */
export const removeTrajectoryLayer = (
  map: Map,
): void => {
  // Eliminamos primero el halo.
  if (
    map.getLayer(
      TRAJECTORY_GLOW_LAYER_ID,
    )
  ) {
    map.removeLayer(
      TRAJECTORY_GLOW_LAYER_ID,
    );
  }

  // Eliminamos después la línea principal.
  if (
    map.getLayer(
      TRAJECTORY_LAYER_ID,
    )
  ) {
    map.removeLayer(
      TRAJECTORY_LAYER_ID,
    );
  }

  // Eliminamos finalmente la fuente.
  if (
    map.getSource(
      TRAJECTORY_SOURCE_ID,
    )
  ) {
    map.removeSource(
      TRAJECTORY_SOURCE_ID,
    );
  }
};



/**
 * pequeño aujuste en roverLayer:
 * 
 * Hay una incompatibilidad de tipos que conviene corregir ahora, antes de integrar el rover con esta trayectoria.
 *
 * Actualmente teníamos: route: Feature<LineString,Record<string, never>>
 *
 * Pero ahora nuestra trayectoria correctamente usa:  MapLineFeature
 *
 */

/** Por tanto, en roverLayer.ts, se cambia únicamente la firma de startRoverAnimation a:

  // Inicia el movimiento del rover sobre
  // cualquier LineString GeoJSON compatible.
 
    export const startRoverAnimation = (
    map: Map,
    route: Feature< LineString, unknown>): void => {

    No cambia la lógica de animación. Simplemente permite que el rover consuma tanto una trayectoria sin propiedades como nuestra MapLineFeature centralizada. Además, source.setData() es el método oficial de GeoJSONSource para reemplazar los datos y volver a renderizar la fuente. 
*/
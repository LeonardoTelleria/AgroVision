/**
 * =========================================
 * AgroVision Risk Heatmap Layer
 * =========================================
 *
 * Capa de calor utilizada para representar espacialmente la concentración de riesgo dentro de AgroVision.
 *
 * Responsabilidad:
 * - convertir zonas agrícolas en puntos de intensidad para el heatmap;
 * - utilizar riskLevel como peso de riesgo;
 * - registrar la fuente GeoJSON del heatmap;
 * - controlar su visibilidad;
 * - mantener intactas las geometrías originales.
 *
 * Flujo:
 *
 * ZoneFeatureCollection
 *        ↓
 *      Centroide
 *        ↓
 *   RiskHeatmapPoint
 *        ↓
 *    GeoJSON Source
 *        ↓
 *   MapLibre Heatmap
 *
 * IMPORTANTE:
 *
 * Esta capa NO modifica:
 * - Polygon de las zonas;
 * - FieldFeature;
 * - ZoneFeature;
 *
 * Solo crea una representación visual secundaria del riesgo.
 *
 * =========================================
 */


import type { Feature, FeatureCollection, Point} from "geojson";

// Importamos Turf para calcular el centroide geométrico de cada zona sin modificarla.
import { centroid } from "@turf/centroid";

// Importamos los tipos de MapLibre.
import type { GeoJSONSource, GeoJSONSourceSpecification, HeatmapLayerSpecification, Map} from "maplibre-gl";

// Importamos la colección oficial de zonas.
import type { ZoneFeatureCollection, GISRiskLevel} from "../types/mappingGeo.types";


// =========================================
// IDS
// =========================================

// ID estable de la fuente utilizada por el heatmap.
export const RISK_HEATMAP_SOURCE_ID = "agrovision-risk-heatmap-source";

// ID estable de la capa visual.
export const RISK_HEATMAP_LAYER_ID = "agrovision-risk-heatmap-layer";

// =========================================
// RISK WEIGHTS
// =========================================

// Peso numérico utilizado por MapLibre para determinar la intensidad de cada punto.
const RISK_WEIGHT: Record<GISRiskLevel, number> = {
  // Riesgo bajo.
  LOW: 0.25,
  // Riesgo medio.
  MEDIUM: 0.5,
  // Riesgo alto.
  HIGH: 0.75,
  // Riesgo crítico.
  CRITICAL: 1,
};

// =========================================
// RISK HEATMAP PROPERTIES
// =========================================

// Propiedades internas de cada punto del heatmap.
interface RiskHeatmapPointProperties {
  // ID original de la zona.
  readonly zoneId: string;
  // Nivel de riesgo original.
  readonly riskLevel: GISRiskLevel;
  // Peso utilizado por MapLibre.
  readonly riskWeight: number;
  // Puntuación sanitaria original.
  readonly healthScore: number | null;
}

// =========================================
// HEATMAP FEATURE TYPES
// =========================================

// Tipo de Feature puntual usado exclusivamente por la capa de calor.
type RiskHeatmapPoint = Feature<Point, RiskHeatmapPointProperties>;

// Colección de puntos del heatmap.
type RiskHeatmapFeatureCollection = FeatureCollection<Point, RiskHeatmapPointProperties>;

// =========================================
// BUILD HEATMAP DATA
// =========================================

/**
 * Convierte las zonas Polygon originales en puntos centrales utilizados por el heatmap.
 */
export const buildRiskHeatmapData = (
  zones: ZoneFeatureCollection,
): RiskHeatmapFeatureCollection => {
  // Creamos una colección vacía de puntos.
  const features: RiskHeatmapPoint[] = [];

  // Recorremos cada zona agrícola.
  for (const zone of zones.features) {
    // Las zonas sin riesgo no deben generar intensidad artificial en el heatmap.
    if (!zone.properties.riskLevel) {
      continue;
    }

    // Calculamos el centroide sin modificar la geometría original de la zona.
    const zoneCentroid = centroid(zone);
    // Obtenemos el nivel de riesgo y el peso correspondiente.
    const riskLevel = zone.properties.riskLevel;
    const riskWeight = RISK_WEIGHT[riskLevel];

    // Creamos el punto de riesgo.
    const point: RiskHeatmapPoint = {

      type: "Feature",
      // ID estable derivado del ID de zona.
      id: `risk-${zone.properties.zoneId}`,
      // Geometría puntual.
      geometry: {
        // Heatmap requiere Point.
        type: "Point",
        // Reutilizamos las coordenadas calculadas por Turf.
        coordinates: zoneCentroid.geometry.coordinates,
      },

      // Propiedades analíticas.
      properties: {
        // Conservamos la relación con la zona original.
        zoneId: zone.properties.zoneId,
        // Conservamos el riesgo original y el peso para MapLibre.
        riskLevel, 
        riskWeight,

        // Conservamos la salud de la zona.
        healthScore: zone.properties.healthScore ?? null,
      },
    };
    // Agregamos el punto al dataset del heatmap.
    features.push(point);
  }

  // Devolvemos una colección GeoJSON válida.
  return {
    // Tipo estándar y untos calculados.
    type: "FeatureCollection",
    features,
  };
};

// =========================================
// SOURCE
// =========================================

/**
 * Crea la definición de fuente GeoJSON utilizada por MapLibre.
 */
export const createRiskHeatmapSource = (
  data: RiskHeatmapFeatureCollection,
): GeoJSONSourceSpecification => {
  // Devolvemos la configuración oficial.
  return {
    // Tipo de fuente y el ataset de puntos.
    type: "geojson",
    data,

    // Reduce peticiones innecesarias al trabajar con geometrías locales.
    generateId: false,
  };
};

// =========================================
// LAYER
// =========================================

/**
 * Crea la capa heatmap de MapLibre.
 */
export const createRiskHeatmapLayer =
  (): HeatmapLayerSpecification => {
    // Devolvemos la configuración del heatmap.
    return {
      // ID único.
      id: RISK_HEATMAP_LAYER_ID,
      // Tipo visual heatmap.
      type: "heatmap",
      // Fuente de puntos de riesgo.
      source: RISK_HEATMAP_SOURCE_ID,

      // Propiedades visuales.
      paint: {
        // Peso individual de cada punto.
        "heatmap-weight": ["get", "riskWeight"],

        // Intensidad global del heatmap.
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 5, 0.8, 10, 1.1, 15, 1.35],

        // Radio adaptativo según el zoom.
        "heatmap-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          5,
          18,
          10,
          28,
          15,
          42,
        ],

        // Opacidad controlada.
        "heatmap-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          5,
          0.55,
          10,
          0.68,
          15,
          0.8,
        ],

        // Gradiente semántico de riesgo.
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],

          // Sin intensidad.
          0,
          "rgba(0,0,0,0)",
          // Intensidad baja.
          0.2,
          "#2ECC71",
          // Intensidad media.
          0.45,
          "#F1C40F",
          // Intensidad alta.
          0.7,
          "#E67E22",
          // Intensidad crítica.
          1,
          "#E74C3C",
        ],
      },

      // Permitimos que la capa sea mostrada/ocultada mediante el selector de capas.
      layout: {visibility: "visible"},
    };
  };

// =========================================
// ADD LAYER
// =========================================

/**
 * Agrega la fuente y la capa heatmap al mapa.
 */
export const addRiskHeatmapLayer = (
  map: Map,
  zones: ZoneFeatureCollection,
  beforeLayerId?: string,
): boolean => {
  // Evitamos duplicar la fuente.
  if (!map.getSource(RISK_HEATMAP_SOURCE_ID)) {
    // Generamos los puntos del heatmap y Creamos la fuente.
    const data = buildRiskHeatmapData(zones);
    const source = createRiskHeatmapSource(data);

    // Registramos la fuente en MapLibre.
    map.addSource(RISK_HEATMAP_SOURCE_ID, source);
  }

  // Evitamos duplicar la capa.
  if (map.getLayer(RISK_HEATMAP_LAYER_ID)) {
    return false;
  }

  // Creamos la capa visual.
  const layer = createRiskHeatmapLayer();

  // Si existe una capa de referencia, insertamos el heatmap debajo de ella.
  if (beforeLayerId && map.getLayer(beforeLayerId)) {
    // Insertamos antes de la capa indicada.
    map.addLayer(layer, beforeLayerId);
  } else {
    // En ausencia de referencia, agregamos al final.
    map.addLayer(layer);
  }

  // Confirmamos que la capa fue creada.
  return true;
};

// =========================================
// UPDATE DATA
// =========================================

/**
 * Actualiza los puntos del heatmap cuando cambian las zonas o sus niveles de riesgo.
 */
export const updateRiskHeatmapData = async (
  map: Map,
  zones: ZoneFeatureCollection,
): Promise<void> => {
  // Obtenemos la fuente existente.
  const source = map.getSource<GeoJSONSource>(RISK_HEATMAP_SOURCE_ID);

  // Verificamos que la fuente exista
  if (!source) {
    return;
  }

  // Construimos nuevamente los puntos.
  const data = buildRiskHeatmapData(zones);

  // Actualizamos exclusivamente el dataset.
  await source.setData(data);
};

// =========================================
// VISIBILITY
// =========================================

/**
 * Cambia la visibilidad del heatmap.
 */
export const setRiskHeatmapVisibility = (
  map: Map,
  visible: boolean,
): void => {
  // Verificamos que la capa exista.
  if (!map.getLayer(RISK_HEATMAP_LAYER_ID)) {
    return;
  }

  // Actualizamos solamente visibility.
  map.setLayoutProperty(
    RISK_HEATMAP_LAYER_ID,
    "visibility",
    visible ? "visible" : "none",
  );
};

// =========================================
// TOGGLE
// =========================================

/**
 * Alterna el estado visible/oculto.
 */
export const toggleRiskHeatmapVisibility = (
  map: Map,
): void => {
  // Verificamos que exista.
  if (!map.getLayer(RISK_HEATMAP_LAYER_ID)) {
    return;
  }

  // Leemos el estado actual.
  const visibility = map.getLayoutProperty(
      RISK_HEATMAP_LAYER_ID,
      "visibility",
    );

  // Calculamos el siguiente estado.
  const nextVisible = visibility !== "visible";

  // Aplicamos el nuevo estado.
  setRiskHeatmapVisibility(map, nextVisible);
};

// =========================================
// REMOVE
// =========================================

/**
 * Elimina completamente la capa y su fuente.
 */
export const removeRiskHeatmapLayer = (
  map: Map,
): void => {
  // Eliminamos la capa visual.
  if (map.getLayer(RISK_HEATMAP_LAYER_ID)) {
    map.removeLayer(RISK_HEATMAP_LAYER_ID);
  }

  // Eliminamos la fuente GeoJSON.
  if (map.getSource(RISK_HEATMAP_SOURCE_ID)) {
    map.removeSource(RISK_HEATMAP_SOURCE_ID);
  }
};
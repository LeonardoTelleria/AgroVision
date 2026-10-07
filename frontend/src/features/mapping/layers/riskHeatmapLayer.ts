/**
 * =========================================
 * AgroVision Risk Heatmap Layer
 * =========================================
 *
 * Capa de calor utilizada para representar espacialmente
 * la concentración de riesgo dentro de AgroVision.
 *
 * Responsabilidad:
 * - derivar puntos representativos de las zonas evaluadas;
 * - asignar intensidad mediante el nivel de riesgo;
 * - registrar y actualizar la fuente GeoJSON;
 * - controlar la visibilidad del heatmap;
 * - liberar la capa y su fuente.
 *
 * Modelo geográfico:
 * Cada punto se ubica dentro de su zona o sobre su límite
 * mediante pointOnFeature. Las geometrías agrícolas originales
 * se conservan como fuente de la representación derivada.
 *
 * Interpretación:
 * El color representa densidad acumulada de puntos ponderados.
 * Su apariencia depende del riesgo, la proximidad y el zoom.
 * El nivel individual de cada zona se consulta en sus propiedades.
 *
 * Integración:
 * El consumidor proporciona zonas evaluadas y una instancia
 * de MapLibre con el estilo cargado.
 *
 * =========================================
 */

// Importamos los tipos GeoJSON de los puntos y sus colecciones.
import type { Feature, FeatureCollection, Point } from "geojson";

// Calculamos un punto representativo sobre la superficie de cada zona.
import { pointOnFeature } from "@turf/turf";

// Importamos los tipos de MapLibre.
import type { GeoJSONSource, GeoJSONSourceSpecification, HeatmapLayerSpecification, Map } from "maplibre-gl";

// Consumimos los contratos GIS compartidos.
import type { GISRiskLevel, ZoneFeatureCollection } from "../types/mappingGeo.types";

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
const RISK_WEIGHT: Readonly<Record<GISRiskLevel, number>> = {
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

// Feature puntual utilizado por la capa de calor.
type RiskHeatmapPoint = Feature<Point, RiskHeatmapPointProperties>;

// Colección de puntos del heatmap.
type RiskHeatmapFeatureCollection = FeatureCollection<Point, RiskHeatmapPointProperties>;

// =========================================
// BUILD HEATMAP DATA
// =========================================

/**
 * Deriva un punto representativo por cada zona con riesgo disponible.
 *
 * @param zones Colección de polígonos agrícolas con geometrías válidas.
 * @returns Colección de puntos ponderados para el heatmap.
 */
export const buildRiskHeatmapData = (zones: ZoneFeatureCollection): RiskHeatmapFeatureCollection => {
    // Creamos una colección vacía de puntos.
    const features: RiskHeatmapPoint[] = [];

    // Recorremos cada zona agrícola.
    for (const zone of zones.features) {
        // Incorporamos únicamente las zonas que tienen una clasificación de riesgo.
        const riskLevel = zone.properties.riskLevel;
        if (!riskLevel) continue;

        // Ubicamos el punto sobre la zona, incluyendo polígonos cóncavos.
        const representativePoint = pointOnFeature(zone);

        // Creamos el punto de riesgo.
        const point: RiskHeatmapPoint = {
            type: "Feature",
            // ID estable derivado del ID de zona.
            id: `risk-${zone.properties.zoneId}`,
            geometry: {
                type: "Point",
                // Conservamos una copia independiente de las coordenadas calculadas.
                coordinates: [...representativePoint.geometry.coordinates],
            },
            // Propiedades analíticas de la representación derivada.
            properties: {
                zoneId: zone.properties.zoneId,
                riskLevel,
                riskWeight: RISK_WEIGHT[riskLevel],
                healthScore: zone.properties.healthScore ?? null,
            },
        };

        features.push(point);
    }

    return {
        type: "FeatureCollection",
        features,
    };
};

// =========================================
// SOURCE
// =========================================

/**
 * Crea la definición de fuente GeoJSON del heatmap.
 *
 * @param data Colección de puntos ponderados.
 */
export const createRiskHeatmapSource = (data: RiskHeatmapFeatureCollection): GeoJSONSourceSpecification => {
    return {
        type: "geojson",
        data,
        // Conservamos los identificadores explícitos de los puntos.
        generateId: false,
    };
};

// =========================================
// LAYER
// =========================================

/** Crea la capa heatmap conservando sus parámetros visuales originales. */
export const createRiskHeatmapLayer = (): HeatmapLayerSpecification => {
    return {
        id: RISK_HEATMAP_LAYER_ID,
        type: "heatmap",
        source: RISK_HEATMAP_SOURCE_ID,
        paint: {
            // Peso individual de cada punto.
            "heatmap-weight": ["get", "riskWeight"],

            // Intensidad global del heatmap.
            "heatmap-intensity": [
                "interpolate", ["linear"], ["zoom"],
                5, 0.8,
                10, 1.1,
                15, 1.35,
            ],

            // Radio adaptativo según el zoom.
            "heatmap-radius": [
                "interpolate", ["linear"], ["zoom"],
                5, 18,
                10, 28,
                15, 42,
            ],

            // Opacidad adaptativa según el zoom.
            "heatmap-opacity": [
                "interpolate", ["linear"], ["zoom"],
                5, 0.55,
                10, 0.68,
                15, 0.8,
            ],

            // Gradiente aplicado a la densidad acumulada del heatmap.
            "heatmap-color": [
                "interpolate", ["linear"], ["heatmap-density"],
                // Densidad nula.
                0, "rgba(0,0,0,0)",
                // Densidad baja.
                0.2, "#2ECC71",
                // Densidad intermedia.
                0.45, "#F1C40F",
                // Densidad alta.
                0.7, "#E67E22",
                // Densidad máxima del gradiente.
                1, "#E74C3C",
            ],
        },
        // La capa comienza visible después de registrarse.
        layout: {
            visibility: "visible",
        },
    };
};

// =========================================
// ADD LAYER
// =========================================

/**
 * Registra la fuente y la capa del heatmap.
 *
 * Conserva los recursos existentes. Las actualizaciones posteriores
 * de sus datos se realizan mediante updateRiskHeatmapData.
 *
 * @param map Instancia activa con el estilo cargado.
 * @param zones Colección de zonas utilizada al crear la fuente.
 * @param beforeLayerId Capa existente antes de la cual insertar el heatmap.
 * @returns true cuando registra la capa; false cuando ya existe.
 */
export const addRiskHeatmapLayer = (
    map: Map,
    zones: ZoneFeatureCollection,
    beforeLayerId?: string,
): boolean => {
    // Registramos la fuente cuando todavía falta.
    if (!map.getSource(RISK_HEATMAP_SOURCE_ID)) {
        const data = buildRiskHeatmapData(zones);
        const source = createRiskHeatmapSource(data);

        map.addSource(RISK_HEATMAP_SOURCE_ID, source);
    }

    // Conservamos la capa registrada.
    if (map.getLayer(RISK_HEATMAP_LAYER_ID)) return false;

    // Creamos la capa visual.
    const layer = createRiskHeatmapLayer();

    // Utilizamos la referencia cuando existe; en otro caso insertamos al final del estilo.
    map.addLayer(layer, beforeLayerId && map.getLayer(beforeLayerId) ? beforeLayerId : undefined);

    return true;
};

// =========================================
// UPDATE DATA
// =========================================

/**
 * Actualiza los puntos cuando cambian las zonas o sus niveles de riesgo.
 *
 * @param map Instancia activa de MapLibre.
 * @param zones Nueva colección de zonas.
 * @returns Promesa de actualización de la fuente registrada.
 */
export const updateRiskHeatmapData = async (map: Map, zones: ZoneFeatureCollection): Promise<void> => {
    // Obtenemos la fuente existente.
    const source = map.getSource<GeoJSONSource>(RISK_HEATMAP_SOURCE_ID);
    if (!source) return;

    // Reconstruimos los puntos derivados.
    const data = buildRiskHeatmapData(zones);

    // Actualizamos el dataset conservando la capa visual.
    await source.setData(data);
};

// =========================================
// VISIBILITY
// =========================================

/**
 * Establece la visibilidad del heatmap registrado.
 *
 * @param map Instancia activa de MapLibre.
 * @param visible true muestra la capa; false la oculta.
 */
export const setRiskHeatmapVisibility = (map: Map, visible: boolean): void => {
    if (!map.getLayer(RISK_HEATMAP_LAYER_ID)) return;

    // Actualizamos únicamente la visibilidad.
    map.setLayoutProperty(RISK_HEATMAP_LAYER_ID, "visibility", visible ? "visible" : "none");
};

// =========================================
// TOGGLE
// =========================================

/** Alterna la visibilidad del heatmap, incluyendo la visibilidad predeterminada del estilo. */
export const toggleRiskHeatmapVisibility = (map: Map): void => {
    if (!map.getLayer(RISK_HEATMAP_LAYER_ID)) return;

    // Leemos el estado actual.
    const visibility = map.getLayoutProperty(RISK_HEATMAP_LAYER_ID, "visibility");

    // La visibilidad predeterminada se trata como visible.
    const nextVisible = visibility === "none";
    setRiskHeatmapVisibility(map, nextVisible);
};

// =========================================
// REMOVE
// =========================================

/** Libera primero la capa del heatmap y después su fuente GeoJSON. */
export const removeRiskHeatmapLayer = (map: Map): void => {
    if (map.getLayer(RISK_HEATMAP_LAYER_ID)) {
        map.removeLayer(RISK_HEATMAP_LAYER_ID);
    }

    if (map.getSource(RISK_HEATMAP_SOURCE_ID)) {
        map.removeSource(RISK_HEATMAP_SOURCE_ID);
    }
};
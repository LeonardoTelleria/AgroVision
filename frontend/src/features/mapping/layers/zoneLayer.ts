/**
 * =========================================
 * Zone Layer
 * =========================================
 *
 * Capa GIS responsable de renderizar las zonas agrícolas.
 *
 * Responsabilidad:
 * - registrar y actualizar las zonas como GeoJSON;
 * - representar cada zona como Polygon;
 * - colorear el relleno y el perímetro según su riesgo;
 * - controlar conjuntamente la visibilidad de las capas;
 * - proporcionar identificación estable mediante zoneId;
 * - liberar las capas y su fuente geográfica.
 *
 * Modelo geográfico:
 * Cada zona pertenece a un field mediante fieldId.
 * Su geometría y propiedades utilizan el contrato compartido
 * de mappingGeo.types.ts.
 *
 * Integración:
 * El consumidor proporciona una instancia de MapLibre con
 * el estilo cargado y una colección con zoneId únicos y estables.
 *
 * Registro:
 * addZoneLayer reutiliza la fuente y las capas existentes.
 * Las llamadas posteriores actualizan los datos y registran
 * cualquier capa faltante, conservando las capas presentes.
 *
 * =========================================
 */

// Importamos únicamente los tipos de MapLibre necesarios para describir y administrar las fuentes y capas.
import type { ExpressionSpecification, FillLayerSpecification, GeoJSONSource, GeoJSONSourceSpecification, LineLayerSpecification, Map } from "maplibre-gl";

// Consumimos el contrato GeoJSON compartido por el sistema GIS.
import type { ZoneFeatureCollection } from "../types/mappingGeo.types";

// Conservamos la compatibilidad con los módulos que importan estos tipos desde zoneLayer.
export type { ZoneFeatureCollection, ZoneFeatureProperties } from "../types/mappingGeo.types";
export type { GISRiskLevel as ZoneRiskLevel } from "../types/mappingGeo.types";

// ID único de la fuente GeoJSON de las zonas.
export const ZONE_SOURCE_ID = "agrovision-zones-source";

// ID de la capa visual que rellena cada zona.
export const ZONE_FILL_LAYER_ID = "agrovision-zones-fill";

// ID de la capa visual que dibuja el perímetro.
export const ZONE_BORDER_LAYER_ID = "agrovision-zones-border";

/**
 * Construye la expresión de color utilizada por las capas de zonas.
 *
 * La paleta de riesgo es compartida por el relleno y el perímetro.
 * Cada capa proporciona su color para las zonas sin clasificación.
 *
 * @param fallbackColor Color aplicado cuando riskLevel carece de una clasificación reconocida.
 */
function createZoneRiskColorExpression(fallbackColor: string): ExpressionSpecification {
    // ["get", "riskLevel"] obtiene la propiedad riskLevel del Polygon actual.
    // ["match", ...] compara ese valor y devuelve un color diferente para cada estado.
    return [
        "match", ["get", "riskLevel"],
        "CRITICAL", "#ef4444",
        "HIGH", "#f97316",
        "MEDIUM", "#eab308",
        "LOW", "#84cc16",
        fallbackColor,
    ];
}

// Configuración base de la fuente GeoJSON.
export const ZONE_SOURCE: GeoJSONSourceSpecification = {
    type: "geojson",
    // Activamos promoteId para que MapLibre utilice zoneId como identificador interno de cada feature.
    promoteId: "zoneId",
    // Definimos inicialmente una FeatureCollection vacía.
    data: {
        type: "FeatureCollection",
        features: [],
    },
};

// Configuración visual del relleno de las zonas.
export const ZONE_FILL_LAYER: FillLayerSpecification = {
    // Las zonas son polígonos, por lo tanto utilizamos el tipo de layer "fill".
    type: "fill",
    // Asociamos la capa con nuestra fuente GeoJSON.
    source: ZONE_SOURCE_ID,
    // Asignamos el ID único de la capa.
    id: ZONE_FILL_LAYER_ID,
    // Definimos la apariencia visual.
    paint: {
        // Aplicamos la paleta de riesgo y el color original para zonas sin clasificación.
        "fill-color": createZoneRiskColorExpression("#94a3b8"),
        // Relleno semitransparente.
        "fill-opacity": 0.22,
        // Definimos un contorno de respaldo.
        "fill-outline-color": "#ffffff",
    },
};

// Configuración visual del perímetro de las zonas.
export const ZONE_BORDER_LAYER: LineLayerSpecification = {
    type: "line",
    source: ZONE_SOURCE_ID,
    id: ZONE_BORDER_LAYER_ID,
    paint: {
        // Utilizamos la misma paleta de riesgo con el color original de respaldo del perímetro.
        "line-color": createZoneRiskColorExpression("#cbd5e1"),
        "line-width": 1.8,
        "line-opacity": 0.95,
    },
};

/**
 * Registra o actualiza la representación cartográfica de las zonas.
 *
 * Reutiliza la fuente existente y agrega las capas faltantes.
 * La visibilidad y configuración de las capas presentes se conservan.
 *
 * @param map Instancia activa de MapLibre con el estilo cargado.
 * @param data Colección GeoJSON de zonas con identificadores únicos.
 */
export function addZoneLayer(map: Map, data: ZoneFeatureCollection): void {
    // Actualizamos la fuente existente conservando sus capas.
    if (map.getSource(ZONE_SOURCE_ID)) {
        updateZoneLayer(map, data);
    } else {
        // Creamos una copia de la configuración base de la fuente.
        const source: GeoJSONSourceSpecification = {
            // Copiamos type y promoteId.
            ...ZONE_SOURCE,
            // Sustituimos la colección vacía por el GeoJSON real.
            data,
        };

        // Registramos la fuente dentro del estilo de MapLibre.
        map.addSource(ZONE_SOURCE_ID, source);
    }

    // Agregamos primero el relleno cuando todavía falta su registro.
    if (!map.getLayer(ZONE_FILL_LAYER_ID)) {
        map.addLayer(ZONE_FILL_LAYER);
    }

    // Agregamos después el borde para dibujarlo sobre el relleno.
    if (!map.getLayer(ZONE_BORDER_LAYER_ID)) {
        map.addLayer(ZONE_BORDER_LAYER);
    }
}

/**
 * Reemplaza las geometrías y propiedades de la fuente GeoJSON.
 *
 * La actualización se aplica cuando la fuente está registrada
 * y conserva las capas visuales existentes.
 *
 * @param map Instancia activa de MapLibre.
 * @param data Nueva colección GeoJSON de zonas.
 */
export function updateZoneLayer(map: Map, data: ZoneFeatureCollection): void {
    // Recuperamos directamente la fuente tipada como GeoJSONSource.
    const source = map.getSource<GeoJSONSource>(ZONE_SOURCE_ID);
    if (!source) return;

    // Actualizamos el contenido GeoJSON.
    source.setData(data);
}

/**
 * Cambia conjuntamente la visibilidad del relleno y el perímetro.
 *
 * @param map Instancia activa de MapLibre.
 * @param visible true muestra las zonas; false las oculta.
 */
export function setZoneLayerVisibility(map: Map, visible: boolean): void {
    // Convertimos el booleano a uno de los valores aceptados por la propiedad visibility de MapLibre.
    const visibility = visible ? "visible" : "none";

    // Comprobamos que el relleno exista antes de modificarlo.
    if (map.getLayer(ZONE_FILL_LAYER_ID)) {
        // Mostramos u ocultamos el relleno.
        map.setLayoutProperty(ZONE_FILL_LAYER_ID, "visibility", visibility);
    }

    // Comprobamos que el borde exista.
    if (map.getLayer(ZONE_BORDER_LAYER_ID)) {
        // Mostramos u ocultamos el perímetro.
        map.setLayoutProperty(ZONE_BORDER_LAYER_ID, "visibility", visibility);
    }
}

/**
 * Libera la representación cartográfica de las zonas.
 *
 * Retira primero las capas que dependen de la fuente
 * y después elimina la fuente GeoJSON.
 *
 * @param map Instancia activa de MapLibre.
 */
export function removeZoneLayer(map: Map): void {
    // Eliminamos primero el borde. Las capas deben eliminarse antes que su fuente.
    if (map.getLayer(ZONE_BORDER_LAYER_ID)) {
        map.removeLayer(ZONE_BORDER_LAYER_ID);
    }

    // Eliminamos después el relleno.
    if (map.getLayer(ZONE_FILL_LAYER_ID)) {
        map.removeLayer(ZONE_FILL_LAYER_ID);
    }

    // Finalmente eliminamos la fuente GeoJSON.
    if (map.getSource(ZONE_SOURCE_ID)) {
        map.removeSource(ZONE_SOURCE_ID);
    }
}
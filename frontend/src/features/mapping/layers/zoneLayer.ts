/**
 * =========================================
 * Zone Layer
 * =========================================
 *
 * Capa GIS responsable de renderizar las zonas agrícolas
 *
 * Responsabilidad:
 * - registrar las zonas como GeoJSON;
 * - representar cada zona como Polygon;
 * - colorear las zonas según su nivel de riesgo y dibujar sus límites;
 * - permitir mostrar/ocultar la capa;
 * - actualizar los datos sin reconstruir el mapa;
 * - preparar la identificación individual de cada zona.
 *
 * Relación conceptual con la BD:
 * fields
 *   ↓
 * zones
 *   ↓
 * zoneLayer
 *   ↓
 * GeoJSON Polygon
 *   ↓
 * MapLibre
 * =========================================*/


import type { FeatureCollection, Polygon } from "geojson";

// Importamos únicamente los tipos de MapLibre que
// necesitamos para describir source y layers.
import type { FillLayerSpecification, GeoJSONSource, GeoJSONSourceSpecification, LineLayerSpecification, Map } from "maplibre-gl";

// ID único de la fuente GeoJSON de las zonas.
export const ZONE_SOURCE_ID = "agrovision-zones-source";
// ID de la capa visual que rellena cada zona.
export const ZONE_FILL_LAYER_ID = "agrovision-zones-fill";
// ID de la capa visual que dibuja el perímetro.
export const ZONE_BORDER_LAYER_ID = "agrovision-zones-border";

// Niveles de riesgo permitidos por el modelo GIS..
export type ZoneRiskLevel =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";


// Propiedades que acompañarán a cada Polygon de zona.
// Estas propiedades no contienen la geometría, contienen la información descriptiva de la zona.
export interface ZoneFeatureProperties {
    // Identificador lógico de la zona que a diferencia de "fieldId", este identificadorpuede ser un UUID o código como "zone-03".
    readonly zoneId: string;
    // Identificador del field al que pertenece la zona.
    readonly fieldId: number | string;
    // Nombre legible de la zona.
    readonly name: string
    // Identificador opcional del cultivo asociado.
    readonly cropId?: number | null;
    // Nivel de riesgo calculado para la zona.
    readonly riskLevel?: ZoneRiskLevel | null;
    // Puntuación sanitaria de la zona.
    readonly healthScore?: number | null;
    // Estado operativo de la zona.
    readonly status?: string | null;
}

// Definimos el contrato GeoJSON completo esperado por esta capa.
export type ZoneFeatureCollection =
    FeatureCollection<Polygon, ZoneFeatureProperties>;

// Configuración base de la fuente GeoJSON.
export const ZONE_SOURCE: GeoJSONSourceSpecification = {
    type: "geojson",
    // Activmos promoteId para que MapLibre utilice la propiedad "zoneId" como identificador interno de cada feature.
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
        // ["get", "riskLevel"] obtiene la propiedad riskLevel del Polygon actual.
        // ["match", ...] compara ese valor y devuelve un color diferente para cada estado.
        
        "fill-color": [
            "match", ["get", "riskLevel"],

            "CRITICAL",
            "#ef4444",

            "HIGH",
            "#f97316",

            "MEDIUM",
            "#eab308",

            "LOW",
            "#84cc16",

            // Fallback cuando la zona todavía no tiene riesgo.
            "#94a3b8",
        ],

        // relleno semitransparente
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
        // Utilizamos exactamente el mismo nivel de riesgo para colorear el perímetro.
        "line-color": [
            "match", ["get", "riskLevel"],

            "CRITICAL",
            "#ef4444",

            "HIGH",
            "#f97316",

            "MEDIUM",
            "#eab308",

            "LOW",
            "#84cc16",

            // Fallback para zonas sin clasificación.
            "#cbd5e1",
        ],
        "line-width": 1.8,
        "line-opacity": 0.95,
    },
};


/**
 * Agrega las zonas al mapa.
 *
 * Parámetros:
 * - map: instancia activa de MapLibre.
 * - data: FeatureCollection con los Polygon de las zonas.
 *
 * Flujo:
 *
 * GeoJSON
 *   ↓
 * source
 *   ↓
 * fill
 *   ↓
 * border
 */
export function addZoneLayer(
  map: Map,
  data: ZoneFeatureCollection,
): void {

    // Eliminamos una versión anterior si existiera.
    removeZoneLayer(map);

    // Creamos una copia de la configuración basede la fuente.
    const source: GeoJSONSourceSpecification = {
        // Copiamos type y promoteId.
        ...ZONE_SOURCE,
        // Sustituimos la colección vacía por el GeoJSON real.
        data,
    };

    // Registramos la fuente dentro del estilo de MapLibre.
    map.addSource(
        ZONE_SOURCE_ID,
        source,
    );

    // Agregamos primero el relleno. De esta manera ocupa el área interior de cada zona.
    map.addLayer(
        ZONE_FILL_LAYER,
    );

    // Agregamos después el borde.
    map.addLayer(
        ZONE_BORDER_LAYER,
    );
}

/**
 * Actualiza las geometrías y propiedades de las zonas sin eliminar sus layers.
 *
 * Parámetros:
 * - map: instancia activa de MapLibre.
 * - data: nueva colección GeoJSON.
 *
 * Esta función será especialmente importante cuando pasemos de mappingGeoData.ts a PostgreSQL/PostGIS.
 */
export function updateZoneLayer(
  map: Map,
  data: ZoneFeatureCollection,
): void {

    // Recuperamos directamente la fuente tipada como GeoJSONSource.
    const source = map.getSource<GeoJSONSource>(ZONE_SOURCE_ID);

    // Si la fuente todavía no existe, no podemos actualizarla.
    if (!source) {
        return;
    }

    // Actualizamos el contenido GeoJSON.
    source.setData(data);
}


/**
 * Cambia la visibilidad de las zonas.
 *
 * Parámetros:
 * - map: instancia de MapLibre.
 * - visible: true muestra las zonas; false las oculta.
 */
export function setZoneLayerVisibility(
  map: Map,
  visible: boolean,
): void {

    // Convertimos el booleano a uno de los dos valores aceptados por la propiedad visibility de MapLibre.
    const visibility =
        visible ? "visible" : "none";

    // Comprobamos que el relleno exista antes de tocarlo.
    if (map.getLayer(ZONE_FILL_LAYER_ID)) {
        // Mostramos u ocultamos el relleno.
        map.setLayoutProperty(
            ZONE_FILL_LAYER_ID,
            "visibility",
            visibility,
        );
    }

    // Comprobamos que el borde exista.
    if (map.getLayer(ZONE_BORDER_LAYER_ID,)) {
        // Mostramos u ocultamos el perímetro.
        map.setLayoutProperty(
            ZONE_BORDER_LAYER_ID,
            "visibility",
            visibility,
        );
    }
}

/**
 * Elimina completamente las zonas del mapa.
 *
 * Parámetro:
 * - map: instancia activa de MapLibre.
 */
export function removeZoneLayer(
  map: Map,
): void {

  // Eliminamos primero el borde. Las layers deben desaparecer antes que la fuentede la que dependen.
  if (
    map.getLayer(ZONE_BORDER_LAYER_ID,)) {
        // Quitamos la capa de perímetro.
        map.removeLayer(ZONE_BORDER_LAYER_ID,);
    }

    // Eliminamos después el relleno.
    if (map.getLayer(ZONE_FILL_LAYER_ID,)) {
        // Quitamos la capa de superficie.
        map.removeLayer(ZONE_FILL_LAYER_ID,);
    }

    // Finalmente eliminamos la fuente GeoJSON.
    if (map.getSource(ZONE_SOURCE_ID,)) {
        // Quitamos los datos geográficos asociados.
        map.removeSource(ZONE_SOURCE_ID,);
    }
}
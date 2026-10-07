/**
 * =========================================
 * Field Layer
 * =========================================
 *
 * Capa GIS responsable de renderizar los fields agrícolas de AgroVision sobre MapLibre.
 *
 * Responsabilidad:
 * - registrar el GeoJSON de los fields;
 * - dibujar el relleno de cada field;
 * - dibujar su límite;
 * - controlar su visibilidad;
 * - eliminar correctamente la capa y su fuente.
 *
 * Relación con la BD:
 *
 * farms
 *   ↓
 * fields
 *   ↓
 * fieldLayer
 *   ↓
 * GeoJSON Polygon
 *   ↓
 * MapLibre
 *
 * Este archivo NO obtiene datos del backend.
 * Solo sabe cómo representar geográficamente los datos que recibe.
 *
 * =========================================*/

// se importan los tipos GeoJSON que utilizaremos para representar una colección de polígonos.

/**
 * Importamos únicamente los tipos necesarios de MapLibre.
 *  - Map es la instancia del mapa donde registraremos la capa.
 *  - GeoJSONSourceSpecification describe la fuente GeoJSON.
 *  - FillLayerSpecification describe la capa visual de relleno.
 *  - LineLayerSpecification describe el borde del polígono.
 */

import type { FillLayerSpecification, GeoJSONSource, GeoJSONSourceSpecification, LineLayerSpecification, Map } from "maplibre-gl"

// Identificador único de la fuente GeoJSON de fields.
// MapLibre utiliza este ID para encontrar posteriormente los datos geográficos registrados.
export const FIELD_SOURCE_ID = "agrovision-fields-source";

// Identificador único de la capa de relleno.
// Este ID permite actualizar, ocultar o eliminar visualmente el polígono posteriormente.
export const FIELD_FILL_LAYER_ID = "agrovision-fields-fill";

// Identificador único de la capa que dibuja el perímetro de cada field.
export const FIELD_BORDER_LAYER_ID = "agrovision-fields-border";

// Usamos una sola definición de geometría y propiedades para todo el GIS.
import type { FieldFeatureCollection } from "../types/mappingGeo.types";
export type { FieldFeatureCollection, FieldFeatureProperties } from "../types/mappingGeo.types";

// Configuración de la fuente GeoJSON.
// Separarla de addFieldLayer permite mantener la definición cartográfica fuera de la lógica.
export const FIELD_SOURCE: GeoJSONSourceSpecification = {
    // Indicamos a MapLibre que los datos vienen como GeoJSON. y El "data" real se inyectará dinámicamente al crear la capa.
    type: "geojson",
    data: {
        type: "FeatureCollection",
        features: [],
    },
};

// Configuración visual del relleno de los fields.
export const FIELD_FILL_LAYER: FillLayerSpecification = {
    // Tipo de layer utilizado para pintar polígonos.
    type: "fill",
    // Asociamos esta capa con nuestra fuente GeoJSON.
    source: FIELD_SOURCE_ID,
    // ID único de esta capa dentro de MapLibre.
    id: FIELD_FILL_LAYER_ID,
    // Configuración visual de la superficie.
    paint: {
        // Color base del área agrícola.
        "fill-color": "#a3e635",
        "fill-opacity": 0.16,
        // Añadimos un pequeño contorno visual interno al relleno para mejorar la lectura.
        "fill-outline-color": "#a3e635",
    },
};

// Configuración visual del perímetro de los fields.
export const FIELD_BORDER_LAYER: LineLayerSpecification = {
    // Utilizamos "line" porque estamos dibujando únicamente el perímetro del polígono.
    type: "line",
    source: FIELD_SOURCE_ID,
    id: FIELD_BORDER_LAYER_ID,
    paint: {
        "line-color": "#75a527",
        "line-width": 2,
        "line-opacity": 0.9,
    },
};

/** Agrega los fields al mapa de MapLibre.
 *
 * Parámetros:
 * - map: instancia activa de MapLibre.
 * - data: FeatureCollection con los polígonos de fields.
 *
 * Flujo:
 * data
 *   ↓
 * GeoJSON source
 *   ↓
 * fill layer
 *   ↓
 * border layer*/

export function addFieldLayer(map: Map, data: FieldFeatureCollection): void {
    // Reutilizamos la fuente cuando la capa ya está registrada.
    if (map.getSource(FIELD_SOURCE_ID)) updateFieldLayer(map, data);

    // Creamos una configuración nueva de la fuente.
    // No modificamos FIELD_SOURCE directamente porque queremos mantenerla como configuración base reutilizable.
    const source: GeoJSONSourceSpecification = {
        // Copiamos las propiedades de la configuración base.
        ...FIELD_SOURCE,
        // Inyectamos el GeoJSON real que recibió la función.
        data,
    };

    // Registramos la fuente geográfica en MapLibre.
    if (!map.getSource(FIELD_SOURCE_ID)) map.addSource(FIELD_SOURCE_ID, source);
    // Agregamos primero la capa de relleno. El field quedará visualmente debajo de su borde.
    if (!map.getLayer(FIELD_FILL_LAYER_ID)) map.addLayer(FIELD_FILL_LAYER);
    // Agregamos después el borde.
    if (!map.getLayer(FIELD_BORDER_LAYER_ID)) map.addLayer(FIELD_BORDER_LAYER);
}

/**
 * Cambia la visibilidad de los fields.
 *
 * Parámetros:
 * - map: instancia activa de MapLibre.
 * - visible: true muestra los fields; false los oculta.
 */
export function setFieldLayerVisibility(map: Map, visible: boolean): void {
    // Convertimos el booleano a la propiedad que MapLibre espera.
    const visibility = visible ? "visible" : "none";

    // Comprobamos que exista la capa antes de modificarla.
    if (map.getLayer(FIELD_FILL_LAYER_ID)) {
        // Ocultamos o mostramos el relleno.
        map.setLayoutProperty(FIELD_FILL_LAYER_ID, "visibility", visibility);
    }

    // Comprobamos que exista también el borde.
    if (map.getLayer(FIELD_BORDER_LAYER_ID)) {
        // Ocultamos o mostramos el perímetro.
        map.setLayoutProperty(FIELD_BORDER_LAYER_ID, "visibility", visibility);
    }
}

/**
 * Actualiza los datos GeoJSON de los fields sin destruir y reconstruir las capas.
 *
 * Parámetros:
 * - map: instancia activa de MapLibre.
 * - data: nueva colección GeoJSON.
 */
export function updateFieldLayer(map: Map, data: FieldFeatureCollection): void {
    // Recuperamos la fuente registrada previamente e indicamos a MapLibre que esta fuente es específicamente GeoJSON.
    const source = map.getSource<GeoJSONSource>(FIELD_SOURCE_ID);

    if (!source) {
        // Si no existe, no intentamos actualizarla.
        return;
    }
    // Reemplazamos únicamente los datos. La capa visual permanece intacta.
    source.setData(data);
}

/**
 * Elimina completamente la representación GIS de los fields.
 *
 * Parámetro:
 * - map: instancia activa de MapLibre.
 *
 * Orden:
 * layers primero
 * ↓
 * source después
 */
export function removeFieldLayer(map: Map): void {
    // Primero eliminamos el borde si está registrado.
    // Las capas deben eliminarse antes que su fuente.
    if (map.getLayer(FIELD_BORDER_LAYER_ID)) {
        map.removeLayer(FIELD_BORDER_LAYER_ID);
    }

    // Después eliminamos el relleno.
    if (map.getLayer(FIELD_FILL_LAYER_ID)) {
        map.removeLayer(FIELD_FILL_LAYER_ID);
    }

    // Finalmente eliminamos la fuente GeoJSON.
    if (map.getSource(FIELD_SOURCE_ID)) {
        map.removeSource(FIELD_SOURCE_ID);
    }
}

/**
 * =========================================
 * Base Map Configuration
 * =========================================
 *
 * Configuración central del mapa base
 *
 * Responsabilidad:
 * Definir en un único lugar el proveedor cartográfico,
 * posición inicial, zoom, atribución y comportamiento general de la cámara de MapLibre.
 *
 * Este archivo NO crea una instancia de MapLibre.
 * Solo proporciona configuración reutilizable.
 *
 * Flujo:
 *
 * baseMap.ts
 *      ↓
 * useAgroMap.ts
 *      ↓
 * MapLibre
 *      ↓
 * OpenFreeMap / OpenStreetMap
 *
 * =========================================*/

// importacion únicamente el tipo MapOptions.
// Al utilizar "type", TypeScript no genera ningún import JavaScript adicional en el bundle final.
import type { MapOptions } from "maplibre-gl";

// URL oficial del estilo Liberty publicado por OpenFreeMap. utiliza datos cartográficos basados en OpenStreetMap.
export const OPENFREEMAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
export const DEFAULT_MAP_CENTER: [number, number] = [-85.2, 12.9];
export const DEFAULT_MAP_ZOOM = 7;

// Configuración común del mapa base. NO contiene "container" porque ese elemento  depende del componente React que esté utilizando el mapa.
export const BASE_MAP_OPTIONS = {
    style: OPENFREEMAP_STYLE_URL,
    center: DEFAULT_MAP_CENTER,
    zoom: DEFAULT_MAP_ZOOM,
    attributionControl: {
        compact: true,
    },
    dragRotate: true,
    pitchWithRotate: true,
    maxPitch: 85,
} satisfies Omit<MapOptions, "container">;

// Función auxiliar para obtener una copia independiente de la configuración base.
// Evita que un consumidor modifique accidentalmente el objeto constante original.
export function getBaseMapOptions(): Omit<MapOptions, "container"> {
    // Devolvemos una copia superficial de la configuración.
    // Esto permite agregar o sobrescribir opciones localmente sin modificar BASE_MAP_OPTIONS.
    return {
        ...BASE_MAP_OPTIONS,
        // Copiamos también los valores anidados para aislar cada instancia.
        center: [...DEFAULT_MAP_CENTER],
        attributionControl: { ...BASE_MAP_OPTIONS.attributionControl },
    };
}

/**
 * **satisfies** hace que TypeScript compruebe que nuestra configuración
 * es válida para MapLibre sin perder la inferencia específica de los valores.
 */

/**
 * =========================================
 * NDVI Layer
 * =========================================
 *
 * Capa de vigor vegetal de AgroVision utilizando el producto NDVI
 * mediante Copernicus Data Space Sentinel Hub WMS.
 *
 * Responsabilidad:
 * - definir la fuente raster del producto NDVI;
 * - registrar su representación visual en MapLibre;
 * - controlar su visibilidad y opacidad;
 * - liberar la capa y su fuente.
 *
 * Integración:
 * copernicusWms.ts construye la plantilla de solicitudes.
 * El consumidor proporciona un mapa con el estilo cargado
 * y puede indicar una capa de referencia para ordenar el raster.
 *
 * Configuración requerida:
 * VITE_COPERNICUS_SENTINEL_INSTANCE_ID.
 *
 * =========================================
 */

// Importamos los tipos necesarios desde MapLibre.
import type { Map, RasterLayerSpecification, RasterSourceSpecification } from "maplibre-gl";

// Consumimos el constructor WMS compartido.
import { buildCopernicusWmsUrl } from "../utils/copernicusWms";

// =========================================
// IDS
// =========================================

// ID estable utilizado por la fuente raster NDVI.
export const NDVI_SOURCE_ID = "agrovision-ndvi-source";

// ID estable utilizado por la capa visual NDVI.
export const NDVI_LAYER_ID = "agrovision-ndvi-layer";

// =========================================
// CONFIGURATION
// =========================================

// Nombre del producto NDVI configurado en la instancia WMS.
export const NDVI_WMS_LAYER = "NDVI";

// Porcentaje máximo de nubosidad permitido.
export const NDVI_MAX_CLOUD_COVERAGE = 20;

// Tamaño estándar del tile raster.
export const NDVI_TILE_SIZE = 256;

// Límites de zoom configurados para la fuente raster.
export const NDVI_MIN_ZOOM = 6;
export const NDVI_MAX_ZOOM = 18;

// Opacidad inicial del producto NDVI.
export const NDVI_DEFAULT_OPACITY = 0.72;

// =========================================
// WMS URL
// =========================================

/**
 * Construye la plantilla WMS del producto NDVI.
 *
 * @returns Plantilla de tiles o null cuando falta la configuración.
 */
export const buildNdviWmsUrl = (): string | null => buildCopernicusWmsUrl(NDVI_WMS_LAYER, NDVI_TILE_SIZE, NDVI_MAX_CLOUD_COVERAGE);

// =========================================
// SOURCE
// =========================================

/**
 * Crea la fuente raster NDVI para MapLibre.
 *
 * @returns Fuente raster o null cuando falta la configuración.
 */
export const createNdviSource = (): RasterSourceSpecification | null => {
    // Construimos la URL WMS.
    const wmsUrl = buildNdviWmsUrl();
    if (!wmsUrl) return null;

    // Devolvemos la definición raster.
    return {
        type: "raster",
        // URL WMS que MapLibre utilizará por tile.
        tiles: [wmsUrl],
        // Coincide con las dimensiones solicitadas al WMS.
        tileSize: NDVI_TILE_SIZE,
        minzoom: NDVI_MIN_ZOOM,
        maxzoom: NDVI_MAX_ZOOM,
    };
};

// =========================================
// LAYER
// =========================================

/** Crea la definición visual de la capa NDVI. */
export const createNdviLayer = (): RasterLayerSpecification => {
    return {
        id: NDVI_LAYER_ID,
        type: "raster",
        source: NDVI_SOURCE_ID,
        paint: {
            // Conservamos la opacidad original.
            "raster-opacity": NDVI_DEFAULT_OPACITY,
            // Suavizado entre píxeles.
            "raster-resampling": "linear",
        },
        // NDVI comienza visible después de agregarse.
        layout: {
            visibility: "visible",
        },
    };
};

// =========================================
// ADD LAYER
// =========================================

/**
 * Registra la fuente y la capa NDVI.
 *
 * Reutiliza la fuente registrada y conserva una capa existente.
 * La descarga de imágenes se realiza posteriormente por MapLibre.
 *
 * @param map Instancia activa con el estilo cargado.
 * @param beforeLayerId Capa existente antes de la cual insertar el raster.
 * @returns true cuando registra la capa; false si ya existe o falta configuración.
 */
export const addNdviLayer = (map: Map, beforeLayerId?: string): boolean => {
    // Creamos la fuente cuando todavía falta su registro.
    if (!map.getSource(NDVI_SOURCE_ID)) {
        const source = createNdviSource();
        if (!source) return false;

        map.addSource(NDVI_SOURCE_ID, source);
    }

    // Conservamos la capa visual cuando ya está registrada.
    if (map.getLayer(NDVI_LAYER_ID)) return false;

    // Creamos la capa visual.
    const layer = createNdviLayer();

    // Utilizamos la referencia cuando existe; en otro caso insertamos al final del estilo.
    map.addLayer(layer, beforeLayerId && map.getLayer(beforeLayerId) ? beforeLayerId : undefined);

    return true;
};

// =========================================
// VISIBILITY
// =========================================

/**
 * Establece la visibilidad de la capa registrada.
 *
 * @param map Instancia activa de MapLibre.
 * @param visible true muestra el raster; false lo oculta.
 */
export const setNdviVisibility = (map: Map, visible: boolean): void => {
    // Verificamos que la capa exista.
    if (!map.getLayer(NDVI_LAYER_ID)) return;

    // Cambiamos únicamente la visibilidad.
    map.setLayoutProperty(NDVI_LAYER_ID, "visibility", visible ? "visible" : "none");
};

// =========================================
// TOGGLE
// =========================================

/** Alterna la visibilidad de NDVI, incluyendo la visibilidad predeterminada del estilo. */
export const toggleNdviVisibility = (map: Map): void => {
    if (!map.getLayer(NDVI_LAYER_ID)) return;

    // Leemos el estado actual.
    const visibility = map.getLayoutProperty(NDVI_LAYER_ID, "visibility");

    // Una capa oculta pasa a visible; la visibilidad explícita o predeterminada pasa a oculta.
    const nextVisible = visibility === "none";
    setNdviVisibility(map, nextVisible);
};

// =========================================
// OPACITY
// =========================================

/**
 * Ajusta la opacidad del raster registrado.
 *
 * Los valores finitos se limitan al intervalo 0-1.
 * Los valores no finitos conservan la opacidad vigente.
 *
 * @param map Instancia activa de MapLibre.
 * @param opacity Opacidad solicitada.
 */
export const setNdviOpacity = (map: Map, opacity: number): void => {
    // Comprobamos la capa y la validez numérica del valor recibido.
    if (!map.getLayer(NDVI_LAYER_ID) || !Number.isFinite(opacity)) return;

    // Limitamos la opacidad al rango válido 0-1.
    const safeOpacity = Math.min(1, Math.max(0, opacity));

    // Aplicamos la opacidad al raster.
    map.setPaintProperty(NDVI_LAYER_ID, "raster-opacity", safeOpacity);
};

// =========================================
// REMOVE
// =========================================

/** Libera primero la capa NDVI y después su fuente raster. */
export const removeNdviLayer = (map: Map): void => {
    // Eliminamos primero la capa visual.
    if (map.getLayer(NDVI_LAYER_ID)) {
        map.removeLayer(NDVI_LAYER_ID);
    }

    // Eliminamos después la fuente.
    if (map.getSource(NDVI_SOURCE_ID)) {
        map.removeSource(NDVI_SOURCE_ID);
    }
};
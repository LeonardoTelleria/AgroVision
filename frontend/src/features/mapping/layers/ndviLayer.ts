/**
 * =========================================
 *  NDVI Layer
 * =========================================
 *
 * Capa de vigor vegetal de AgroVision utilizando el producto NDVI de Sentinel-2 mediante Copernicus Data Space Sentinel Hub WMS.
 *
 * Responsabilidad:
 * - construir la fuente WMS de NDVI;
 * - agregar NDVI como raster a MapLibre;
 * - controlar su visibilidad;
 * - mantener NDVI independiente de las geometrías agrícolas y de las capas de riesgo.
 *
 * Flujo:
 *
 * Sentinel-2
 *      ↓
 * Copernicus Sentinel Hub
 *      ↓
 *      WMS
 *      ↓
 *     NDVI
 *      ↓
 *   MapLibre
 *
 * =========================================
 */


import type {
  Map,
  RasterLayerSpecification,
  RasterSourceSpecification,
} from "maplibre-gl";

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

// Producto NDVI oficial expuesto por Sentinel Hub WMS.
export const NDVI_WMS_LAYER = "NDVI";

// Porcentaje máximo de nubosidad permitido.
export const NDVI_MAX_CLOUD_COVERAGE = 20;

// Tamaño estándar del tile raster.
export const NDVI_TILE_SIZE = 256;

// Zoom mínimo para solicitar NDVI.
export const NDVI_MIN_ZOOM = 6;

// Zoom máximo razonable para la capa.
export const NDVI_MAX_ZOOM = 18;

// Opacidad inicial para permitir que las geometrías GIS puedan visualizarse sobre el NDVI posteriormente.
export const NDVI_DEFAULT_OPACITY = 0.72;

// =========================================
// INSTANCE ID
// =========================================

// Obtiene el Instance ID configurado en Vite.
const getSentinelInstanceId = (): string => {
  // Leemos la variable pública configurada en .env.
  return (
    import.meta.env
      .VITE_COPERNICUS_SENTINEL_INSTANCE_ID ?? ""
  ).trim();
};

// =========================================
// WMS URL
// =========================================

/**
 * Construye la URL WMS utilizada por MapLibre para solicitar los tiles NDVI.
 */
export const buildNdviWmsUrl = (): string | null => {
  // Obtenemos el Instance ID real y Evitamos construir una URL inválida.
  const instanceId = getSentinelInstanceId();

  if (!instanceId) {
    return null;
  }

  // Construimos el endpoint WMS de Sentinel Hub.
  const baseUrl = `https://sh.dataspace.copernicus.eu/ogc/wms/${instanceId}`;

  // Construimos la solicitud WMS.
  return [
    `${baseUrl}?`,
    "SERVICE=WMS",
    "&VERSION=1.1.1",
    "&REQUEST=GetMap",
    `&LAYERS=${NDVI_WMS_LAYER}`,
    "&STYLES=",
    "&FORMAT=image/png",
    "&TRANSPARENT=true",
    "&SRS=EPSG:3857",
    `&WIDTH=${NDVI_TILE_SIZE}`,
    `&HEIGHT=${NDVI_TILE_SIZE}`,
    `&MAXCC=${NDVI_MAX_CLOUD_COVERAGE}`,
    "&BBOX={bbox-epsg-3857}",
  ].join("");
};

// =========================================
// SOURCE
// =========================================

/**
 * Crea la fuente raster NDVI para MapLibre.
 */
export const createNdviSource =
  (): RasterSourceSpecification | null => {
    // Construimos la URL WMS.
    const wmsUrl = buildNdviWmsUrl();

    // Sin Instance ID no generamos una fuente inválida.
    if (!wmsUrl) {
      return null;
    }

    // Devolvemos la definición raster.
    return {
      // Tipo oficial de fuente.
      type: "raster",
      // URL WMS que MapLibre utilizará por tile.
      tiles: [wmsUrl],
      // Tamaño del tile solicitado.
      tileSize: NDVI_TILE_SIZE,
      // Nivel mínimo de zoom.
      minzoom: NDVI_MIN_ZOOM,
      // Nivel máximo de zoom.
      maxzoom: NDVI_MAX_ZOOM,
    };
  };

// =========================================
// LAYER
// =========================================

/**
 * Crea la definición visual de la capa NDVI.
 */
export const createNdviLayer =
  (): RasterLayerSpecification => {
    // Definimos la capa raster.
    return {
      // Identificador único.
      id: NDVI_LAYER_ID,
      // Tipo visual raster.
      type: "raster",
      // Fuente NDVI asociada.
      source: NDVI_SOURCE_ID,
      // Propiedades visuales del raster.
      paint: {
        // Permitimos ver las geometrías GIS debajo/sobre el raster durante la integración.
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
 * Agrega la fuente y la capa NDVI al mapa.
 */
export const addNdviLayer = (
  map: Map,
  beforeLayerId?: string,
): boolean => {
  // Comprobamos si la fuente ya existe.
  const sourceAlreadyExists =  Boolean(map.getSource(NDVI_SOURCE_ID));

  // Creamos la fuente solamente una vez.
  if (!sourceAlreadyExists) {
    // Construimos la fuente raster.
    const source = createNdviSource();

    // Sin configuración válida no continuamos.
    if (!source) {
      return false;
    }

    // Registramos la fuente en MapLibre.
    map.addSource( NDVI_SOURCE_ID, source);
  }

  // Evitamos duplicar la capa.
  if (map.getLayer(NDVI_LAYER_ID)) {
    return false;
  }

  // Creamos la capa visual.
  const layer = createNdviLayer();

  // Agregamos la capa normalmente o antes de otra capa cuando se indique.
  if (
    beforeLayerId && map.getLayer(beforeLayerId)
  ) {
    // Insertamos NDVI antes de la capa indicada.
    map.addLayer(layer, beforeLayerId);
  } else {
    // Si todavía no conocemos una capa de referencia, agregamos NDVI al final del stack.
    map.addLayer(layer);
  }

  // Indicamos que la capa fue creada.
  return true;
};

// =========================================
// VISIBILITY
// =========================================

/**
 * Controla la visibilidad de NDVI.
 */
export const setNdviVisibility = (
  map: Map,
  visible: boolean,
): void => {
  // Verificamos que la capa exista.
  if (!map.getLayer(NDVI_LAYER_ID)) {
    return;
  }

  // Cambiamos únicamente la visibilidad.
  map.setLayoutProperty(
    NDVI_LAYER_ID,
    "visibility",
    visible ? "visible" : "none",
  );
};

// =========================================
// TOGGLE
// =========================================

/**
 * Alterna la visibilidad actual de NDVI.
 */
export const toggleNdviVisibility = (
  map: Map,
): void => {
  // Verificamos que la capa exista.
  if (!map.getLayer(NDVI_LAYER_ID)) {
    return;
  }

  // Leemos el estado actual.
  const visibility = map.getLayoutProperty(
    NDVI_LAYER_ID,
    "visibility",
  );

  // Calculamos el siguiente estado.
  const nextVisible = visibility !== "visible";

  // Aplicamos el nuevo estado.
  setNdviVisibility(map, nextVisible);
};

// =========================================
// OPACITY
// =========================================

/**
 * Ajusta la opacidad de NDVI sin alterar el contenido ni la geometría del raster.
 */
export const setNdviOpacity = (
  map: Map,
  opacity: number,
): void => {
  // Verificamos que la capa exista.
  if (!map.getLayer(NDVI_LAYER_ID)) {
    return;
  }

  // Limitamos la opacidad al rango válido 0-1.
  const safeOpacity = Math.min(1, Math.max(0, opacity));

  // Aplicamos la opacidad al raster.
  map.setPaintProperty(
    NDVI_LAYER_ID,
    "raster-opacity",
    safeOpacity,
  );
};

// =========================================
// REMOVE
// =========================================

/**
 * Elimina completamente la capa NDVI.
 */
export const removeNdviLayer = (
  map: Map,
): void => {
  // Eliminamos primero la capa visual.
  if (map.getLayer(NDVI_LAYER_ID)) {
    map.removeLayer(NDVI_LAYER_ID);
  }

  // Eliminamos después la fuente.
  if (map.getSource(NDVI_SOURCE_ID)) {
    map.removeSource(NDVI_SOURCE_ID);
  }
};
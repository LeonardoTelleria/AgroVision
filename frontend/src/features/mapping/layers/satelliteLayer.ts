/**
 * =========================================
 * Sentinel-2 Layer
 * =========================================
 *
 * Capa satelital real de AgroVision utilizando Sentinel-2 mediante Copernicus Data Space.
 *
 * Responsabilidad:
 * - construir la fuente WMS de Sentinel-2;
 * - agregar la imagen satelital a MapLibre;
 * - controlar su visibilidad;
 * - mantener Sentinel-2 desacoplado de los polígonos, zonas y demás capas GIS.
 *
 * Flujo:
 *
 * Copernicus Data Space
 *          ↓
 *      Sentinel-2
 *          ↓
 *     Sentinel Hub
 *          ↓
 *         WMS
 *          ↓
 *      MapLibre
 *
 * Configuración requerida:
 *
 * VITE_COPERNICUS_SENTINEL_INSTANCE_ID
 *
 * El Instance ID NO debe escribirse directamentedentro del código.
 *
 * =========================================
 */

// Importamos los tipos necesarios desde MapLibre.
import type {
  Map,
  RasterLayerSpecification,
  RasterSourceSpecification,
} from "maplibre-gl";

// =========================================
// IDS
// =========================================

// ID estable utilizado por la fuente raster.
export const SENTINEL2_SOURCE_ID = "agrovision-sentinel2-source";

// ID estable utilizado por la capa visual.
export const SENTINEL2_LAYER_ID ="agrovision-sentinel2-layer";

// =========================================
// CONFIGURATION
// =========================================

// Nombre de la capa satelital configurada por el template Simple WMS de Copernicus.
export const SENTINEL2_WMS_LAYER = "NATURAL-COLOR";

// Porcentaje máximo de nubosidad permitido.
export const SENTINEL2_MAX_CLOUD_COVERAGE = 20;

// Tamaño estándar de los tiles raster.
export const SENTINEL2_TILE_SIZE = 256;

// Zoom mínimo para solicitar imágenes satelitales y el Zoom máximo razonable para la visualización.
export const SENTINEL2_MIN_ZOOM = 6;
export const SENTINEL2_MAX_ZOOM = 18;

// =========================================
// INSTANCE ID
// =========================================

// Obtenemos el Instance ID desde las variables de entorno públicas de Vite.
const getSentinel2InstanceId = (): string => {
  // Leemos la configuración sin exponerla en el código fuente.
  return (
    import.meta.env
      .VITE_COPERNICUS_SENTINEL_INSTANCE_ID ?? "").trim();
};

// =========================================
// WMS URL
// =========================================

/**
 * Construye la URL WMS que MapLibre utilizará
 * para solicitar cada tile satelital.
 */
export const buildSentinel2WmsUrl = (): string | null => {
  // Obtenemos el Instance ID configurado y si todavía no existe configuración, evitamos romper la aplicación.
  const instanceId = getSentinel2InstanceId();

  if (!instanceId) {
    return null;
  }

  // URL base del servicio WMS.
  const baseUrl = `https://sh.dataspace.copernicus.eu/ogc/wms/${instanceId}`;

  // Devolvemos la plantilla WMS compatible con MapLibre.
  return [
    `${baseUrl}?`,
    "SERVICE=WMS",
    "&VERSION=1.1.1",
    "&REQUEST=GetMap",
    `&LAYERS=${SENTINEL2_WMS_LAYER}`,
    "&STYLES=",
    "&FORMAT=image/png",
    "&TRANSPARENT=true",
    "&SRS=EPSG:3857",
    "&WIDTH=256",
    "&HEIGHT=256",
    `&MAXCC=${SENTINEL2_MAX_CLOUD_COVERAGE}`,
    "&BBOX={bbox-epsg-3857}",
  ].join("");
};

// =========================================
// SOURCE
// =========================================

/**
 * Crea la definición raster que MapLibre utilizará como fuente de Sentinel-2.
 */
export const createSentinel2Source = (): RasterSourceSpecification | null => {
    // Construimos la URL WMS.
    const wmsUrl = buildSentinel2WmsUrl();

    // Sin Instance ID no creamos una fuente inválida.
    if (!wmsUrl) {
      return null;
    }

    // Devolvemos la configuración oficial de una fuente raster compatible con WMS.
    return {
      // Indicamos que la fuente es raster.
      type: "raster",
      // MapLibre reemplazará el bbox dinámicamente.
      tiles: [wmsUrl],
      // Coincide con el tamaño solicitado al WMS.
      tileSize: SENTINEL2_TILE_SIZE,
      // Limita la solicitud a niveles útiles de zoom.
      minzoom: SENTINEL2_MIN_ZOOM,
      // Evita ampliar indefinidamente una imagen raster.
      maxzoom: SENTINEL2_MAX_ZOOM,
    };
  };

// =========================================
// LAYER
// =========================================

/**
 * Crea la definición visual de la capa Sentinel-2.
 */
export const createSentinel2Layer = (): RasterLayerSpecification => {
    // Definimos la capa raster.
    return {
      // Tipo de layer de MapLibre.
      id: SENTINEL2_LAYER_ID,
      // Tipo visual raster.
      type: "raster",
      // Fuente creada anteriormente.
      source: SENTINEL2_SOURCE_ID,
      // Opacidad controlada para permitir posteriormente superponer geometrías GIS.
      paint: {
        "raster-opacity": 0.82,
        // Suavizado visual del raster.
        "raster-resampling": "linear",
      },

      // La capa comienza visible cuando se agrega.
      layout: {
        visibility: "visible",
      },
    };
  };

// =========================================
// ADD LAYER
// =========================================

/**
 * Agrega Sentinel-2 al mapa de forma segura.
 *
 * Devuelve true cuando la capa fue agregada
 * correctamente y false cuando falta configuración o la capa ya existía.
 */
export const addSentinel2Layer = (
  map: Map,
): boolean => {
  // Evitamos agregar dos veces la misma fuente.
  const sourceAlreadyExists = Boolean(map.getSource(SENTINEL2_SOURCE_ID));

  // Si la fuente todavía no existe, intentamos crearla.
  if (!sourceAlreadyExists) {
    // Generamos la configuración raster.
    const source = createSentinel2Source();

    // Sin configuración válida no continuamos.
    if (!source) {
      return false;
    }

    // Registramos la fuente en MapLibre.
    map.addSource(SENTINEL2_SOURCE_ID, source);
  }

  // Evitamos duplicar la capa visual.
  if (map.getLayer(SENTINEL2_LAYER_ID)) {
    return false;
  }

  // Creamos la configuración visual y agregamos Sentinel-2 al mapa.
  const layer = createSentinel2Layer();
  map.addLayer(layer);

  // Informamos que la capa se agregó correctamente.
  return true;
};

// =========================================
// VISIBILITY
// =========================================

/**
 * Cambia la visibilidad de Sentinel-2 sin modificar la fuente ni la geometría.
 */
export const setSentinel2Visibility = (
  map: Map,
  visible: boolean,
): void => {
  // Obtenemos la capa satelital.
  const layer = map.getLayer(SENTINEL2_LAYER_ID);

  // Si todavía no existe, no hacemos nada.
  if (!layer) {
    return;
  }

  // Convertimos el booleano a la propiedad de visibilidad esperada por MapLibre.
  map.setLayoutProperty(
    SENTINEL2_LAYER_ID,
    "visibility",
    visible ? "visible" : "none",
  );
};

// =========================================
// TOGGLE
// =========================================

/**
 * Alterna automáticamente la visibilidad actual de Sentinel-2.
 */
export const toggleSentinel2Visibility = (
  map: Map,
): void => {
  // Obtenemos la capa actual.
  const layer = map.getLayer(SENTINEL2_LAYER_ID,);

  // Si todavía no existe, no podemos alternarla.
  if (!layer) {
    return;
  }

  // Consultamos la visibilidad actual.
  const visibility = map.getLayoutProperty(
    SENTINEL2_LAYER_ID,
    "visibility",
  );

  // Determinamos el siguiente estado y Aplicamos el nuevo estado
  const nextVisible = visibility !== "visible";
  setSentinel2Visibility( map, nextVisible);

};

// =========================================
// REMOVE
// =========================================

/**
 * Elimina completamente la capa Sentinel-2 cuando sea necesario desmontar el módulo.
 */
export const removeSentinel2Layer = (
  map: Map,
): void => {
  // Eliminamos primero la capa visual.
  if (map.getLayer(SENTINEL2_LAYER_ID)) {
    map.removeLayer(SENTINEL2_LAYER_ID);
  }

  // Eliminamos después la fuente raster.
  if (map.getSource(SENTINEL2_SOURCE_ID)) {
    map.removeSource(SENTINEL2_SOURCE_ID);
  }
};
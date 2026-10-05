/**
 * =========================================
 * GeoJSON Data
 * =========================================
 *
 * Punto de salida de los datos geográficos utilizados por las capas GIS de AgroVision.
 *
 * Responsabilidad:
 * - exponer las colecciones GeoJSON;
 * - mantener una estructura estable para MapLibre;
 * - centralizar el acceso a farm, fields y zones;
 * - evitar duplicar geometrías o propiedades.
 *
 * Fuente de datos:
 *
 * mappingGeoData.ts
 *        ↓
 *     geojson.ts
 *        ↓
 *     MapLibre
 *
 * Este archivo NO:
 * - crea coordenadas;
 * - modifica geometrías;
 * - calcula riesgos;
 * - controla la cámara;
 * - define estilos visuales.
 * =========================================
*/

// Importamos los datos GIS definidos en el archivo fuente
import { agroVisionFarms, agroVisionFields, agroVisionZones } from "../data/mappingGeoData"

// Importamos los tipos de colecciones GIS
import type {
    FarmFeatureCollection,
    FieldFeatureCollection,
    ZoneFeatureCollection,
} from  "../types/mappingGeo.types";

/**
 * =========================================
 * FARM GEOJSON
 * =========================================
*/ 
// exponemos la colección de fincas como GEOJSON listo para MapLibre
export const farmsGeoJSON: FarmFeatureCollection = agroVisionFarms;

/**
 * =========================================
 * FIELD GEOJSON
 * =========================================
*/ 
// Exponemos la colección de fields como GeoJSON listo para MapLibre.
export const fieldsGeoJSON: FieldFeatureCollection = agroVisionFields;

/**
 * =========================================
 * ZONE GEOJSON
 * =========================================
*/ 
// Exponemos la colección de zonas como GeoJSON listo para MapLibre.
export const zonesGeoJSON: ZoneFeatureCollection = agroVisionZones;

/**
 * =========================================
 * GIS DATASET
 * =========================================
*/ 
// Agrupamos todas las coleccione espaciales disponibles
export const agroVisionGeoJSON = {
    // coleccion espacial de fincas, fields y zonas
    farms: farmsGeoJSON,
    fields: fieldsGeoJSON,
    zones: zonesGeoJSON
} as const;


/** 
 * mappingGeo.types.ts
        │
        │ contratos
        ▼
   mappingGeoData.ts
        │
        │ datos + geometrías
        ▼
    geojson.ts
        │
        │ GeoJSON listo
        ▼
   fieldLayer.ts
   zoneLayer.ts
   ...
        │
        ▼
     MapLibre
*/

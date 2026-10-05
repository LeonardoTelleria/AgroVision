/**
 * =========================================
 * GIS Demo Data
 * =========================================
 *
 * Datos GeoJSON iniciales utilizados por el sistema GIS 
 *
 * Responsabilidad:
 * - representar una finca;
 * - representar sus fields;
 * - representar las zones;
 * - asociar riesgo y métricas analíticas y proporcionar datos listos para MapLibre.
 *
 * Flujo conceptual:
 *
 * Farm
 *   ↓
 * Fields
 *   ↓
 * Zones
 *   ↓
 * Risk / Health Score
 *
 * Estos datos son sintéticos y sirven para:
 * - desarrollo;
 * - pruebas visuales;
 * - integración del mapa;
 * - demostraciones del MVP.
 * =========================================
 */

// importamos los contratos GIS
import type {  
    FarmFeature,
    FieldFeature,
    ZoneFeature,
    FarmFeatureCollection,
    FieldFeatureCollection,
    ZoneFeatureCollection,
} from "../types/mappingGeo.types";


/**
 * =========================================
 * FARM DEMO
 * =========================================
*/ 

// Definimos la finca principal utilizada en la demostración.
export const agroVisionFarm: FarmFeature = {
  // Tipo oficial de objeto GeoJSON.
  type: "Feature",
  // Identificador espacial único de la finca.
  id: "farm-001",
  // Geometría de la finca.
  geometry: {
    // La finca se representa como un Polygon.
    type: "Polygon",
    // Coordenadas del perímetro de la finca.
    coordinates: [
      [
        // Punto suroeste.
        [-87.1324, 12.6248],

        // Punto oeste superior.
        [-87.1321, 12.6289],

        // Punto noroeste.
        [-87.1274, 12.6302],

        // Punto norte central.
        [-87.1231, 12.6294],

        // Punto noreste.
        [-87.1207, 12.6268],

        // Punto sureste.
        [-87.1215, 12.6229],

        // Punto sur central.
        [-87.1266, 12.6218],

        // Cerramos nuevamente el Polygon.
        [-87.1324, 12.6248],
      ],
    ],
  },

  // Propiedades descriptivas de la finca.
  properties: {
    // ID utilizado por AgroVision.
    farmId: "farm-001",
    // Usuario propietario de la finca.
    ownerId: 101,
    // Nombre visible en la interfaz.
    name: "Finca 001",
    // Ubicación textual de referencia.
    location: "Chinandega, Nicaragua",
    // Área aproximada de la finca.
    totalAreaSquareMeters: 285000,
    // Fecha de creación del registro.
    createdAt: "2026-09-15T08:00:00Z",
  },
};

/** =========================================
 * FIELD 01
 * =========================================
 */

// Primer field agrícola de la finca.
export const agroVisionField01: FieldFeature = {
  // Tipo oficial de Feature GeoJSON.
  type: "Feature",
  // Identificador espacial del field.
  id: "field-001",
  // Geometría del field.
  geometry: {
    // Los fields agrícolas se representan como Polygon.
    type: "Polygon",
    // Perímetro del primer field.
    coordinates: [
      [
        // Esquina suroeste.
        [-87.1317, 12.6250],

        // Esquina noroeste.
        [-87.1314, 12.6280],

        // Parte superior del field.
        [-87.1283, 12.6288],

        // Parte superior derecha.
        [-87.1269, 12.6279],

        // Esquina sureste.
        [-87.1273, 12.6244],

        // Parte inferior.
        [-87.1306, 12.6242],

        // Cerramos el Polygon.
        [-87.1317, 12.6250],
      ],
    ],
  },

  // Propiedades agrícolas del field.
  properties: {
    // Finca a la que pertenece.
    farmId: "farm-001",
    // ID único del field.
    fieldId: "field-001",
    // Nombre visible.
    name: "Lote Norte",
    // Área aproximada.
    areaSquareMeters: 74000,
    // Tipo de suelo registrado.
    soilType: "Franco arcilloso",
    // Sistema de irrigación.
    irrigationType: "Goteo",
    // Estado operativo.
    status: "ACTIVE",
    // Fecha de creación.
    createdAt: "2026-09-16T08:00:00Z",
  },
};

/** =========================================
 * FIELD 02
 * =========================================
 */

// Segundo field agrícola de la finca.
export const agroVisionField02: FieldFeature = {
  // Tipo oficial de Feature GeoJSON.
  type: "Feature",
  // Identificador espacial del field.
  id: "field-002",
  // Geometría del field.
  geometry: {
    // El field se representa mediante Polygon.
    type: "Polygon",

    // Perímetro del segundo field.
    coordinates: [
      [
        // Esquina suroeste.
        [-87.1265, 12.6242],

        // Esquina noroeste.
        [-87.1268, 12.6280],

        // Parte superior.
        [-87.1244, 12.6288],

        // Parte superior derecha.
        [-87.1221, 12.6278],

        // Esquina sureste.
        [-87.1220, 12.6240],

        // Parte inferior.
        [-87.1243, 12.6234],

        // Cerramos el Polygon.
        [-87.1265, 12.6242],
      ],
    ],
  },

  // Propiedades agrícolas del field.
  properties: {
    // Finca propietaria.
    farmId: "farm-001",
    // Identificador del field.
    fieldId: "field-002",
    // Nombre visible.
    name: "Lote Central",
    // Área aproximada.
    areaSquareMeters: 68000,
    // Tipo de suelo.
    soilType: "Franco limoso",
    // Sistema de irrigación.
    irrigationType: "Aspersión",
    // Estado operativo.
    status: "ACTIVE",
    // Fecha de creación.
    createdAt: "2026-09-16T08:15:00Z",
  },
};



/** =========================================
 * FIELD 03
 * =========================================
 */

// Tercer field agrícola de la finca.
export const agroVisionField03: FieldFeature = {
  // Tipo oficial de Feature GeoJSON.
  type: "Feature",
  // Identificador espacial.
  id: "field-003",
  // Geometría del field.
  geometry: {
    // Representamos el field mediante Polygon.
    type: "Polygon",

    // Perímetro del tercer field.
    coordinates: [
      [
        // Esquina suroeste.
        [-87.1219, 12.6241],

        // Esquina noroeste.
        [-87.1220, 12.6277],

        // Parte superior izquierda.
        [-87.1208, 12.6290],

        // Parte superior derecha.
        [-87.1240, 12.6295],

        // Parte norte.
        [-87.1258, 12.6279],

        // Parte sureste.
        [-87.1252, 12.6242],

        // Cerramos el Polygon.
        [-87.1219, 12.6241],
      ],
    ],
  },

  // Propiedades del field.
  properties: {
    // Finca asociada.
    farmId: "farm-001",
    // Identificador del field.
    fieldId: "field-003",
    // Nombre visible.
    name: "Lote Sur",
    // Área aproximada.
    areaSquareMeters: 62000,
    // Tipo de suelo.
    soilType: "Franco arenoso",
    // Sistema de irrigación.
    irrigationType: "Goteo",
    // Estado operativo.
    status: "ACTIVE",
    // Fecha de creación.
    createdAt: "2026-09-16T08:30:00Z",
  },
};


/** =========================================
 * ZONE 01
 * =========================================
 */

// Zona de bajo riesgo perteneciente al field 001.
export const agroVisionZone01: ZoneFeature = {
  // Tipo oficial de Feature.
  type: "Feature",
  // Identificador de la zona.
  id: "zone-001",
  // Geometría espcial de la zona.
  geometry: {
    // Las zonas se representan como Polygon.
    type: "Polygon",
    // Perímetro de la zona.
    coordinates: [
      [
        // Punto inicial.
        [-87.1317, 12.6250],
        // Límite norte.
        [-87.1314, 12.6266],
        // Límite superior derecho.
        [-87.1282, 12.6273],
        // Límite este.
        [-87.1273, 12.6264],
        // Límite sur.
        [-87.1275, 12.6244],
        // Cierre de la geometría.
        [-87.1317, 12.6250],
      ],
    ],
  },
  // Datos analíticos de la zona.
  properties: {
    // Identificador de la zona.
    zoneId: "zone-001",
    // Field padre.
    fieldId: "field-001",
    // Nombre visible.
    name: "Zona A",
    // Riesgo calculado.
    riskLevel: "LOW",
    // Puntuación sanitaria.
    healthScore: 91,
    // Estado operativo.
    status: "ACTIVE",
  },
};


/** =========================================
 * ZONE 02
 * =========================================
 */

// Zona de riesgo medio perteneciente al field 001.
export const agroVisionZone02: ZoneFeature = {
  // Tipo oficial de Feature.
  type: "Feature",
  // Identificador de la zona.
  id: "zone-002",
  // Geometría espacial.
  geometry: {
    // Polygon agrícola.
    type: "Polygon",

    // Perímetro de la zona.
    coordinates: [
      [
        // Punto inicial.
        [-87.1314, 12.6266],
        // Límite norte.
        [-87.1314, 12.6280],
        // Parte superior derecha.
        [-87.1283, 12.6288],
        // Parte este.
        [-87.1269, 12.6279],
        // Límite sur.
        [-87.1282, 12.6273],
        // Cierre.
        [-87.1314, 12.6266],
      ],
    ],
  },

  // Propiedades de la zona.
  properties: {
    // Identificador.
    zoneId: "zone-002",
    // Field padre.
    fieldId: "field-001",
    // Nombre.
    name: "Zona B",
    // Riesgo analítico.
    riskLevel: "MEDIUM",
    // Salud estimada.
    healthScore: 76,
    // Estado actual.
    status: "ACTIVE",
  },
};


/** =========================================
 * ZONE 03
 * =========================================
 */

// Zona de riesgo bajo perteneciente al field 002.
export const agroVisionZone03: ZoneFeature = {
 
  type: "Feature",
  id: "zone-003",
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        // Punto inicial.
        [-87.1265, 12.6242],
        // Límite norte.
        [-87.1268, 12.6263],
        // Parte superior.
        [-87.1244, 12.6270],
        // Parte derecha.
        [-87.1221, 12.6262],
        // Parte inferior.
        [-87.1220, 12.6240],
        // Cierre.
        [-87.1265, 12.6242],
      ],
    ],
  },
  properties: {

    zoneId: "zone-003",
    fieldId: "field-002",
    name: "Zona C",
    riskLevel: "LOW",
    healthScore: 88,
    status: "ACTIVE",
  },
};


/** =========================================
 * ZONE 04
 * =========================================
 */

// Zona de alto riesgo perteneciente al field 002.
export const agroVisionZone04: ZoneFeature = {
  type: "Feature",
  id: "zone-004",
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        // Punto inicial.
        [-87.1268, 12.6263],
        // Límite norte.
        [-87.1268, 12.6280],
        // Parte superior.
        [-87.1244, 12.6288],
        // Parte superior derecha.
        [-87.1221, 12.6278],
        // Límite sur.
        [-87.1221, 12.6262],
        // Cierre.
        [-87.1268, 12.6263],
      ],
    ],
  },
  properties: {
   
    zoneId: "zone-004",
    fieldId: "field-002",
    name: "Zona D",
    riskLevel: "HIGH",
    healthScore: 58,
    status: "ACTIVE",
  },
};


/** =========================================
 * ZONE 05
 * =========================================
 */
// Zona crítica perteneciente al field 003.
export const agroVisionZone05: ZoneFeature = {

  type: "Feature",
  id: "zone-005",
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        // Punto inicial.
        [-87.1219, 12.6241],
        // Límite norte.
        [-87.1220, 12.6260],
        // Límite superior.
        [-87.1208, 12.6272],
        // Parte superior derecha.
        [-87.1240, 12.6276],
        // Límite este.
        [-87.1253, 12.6259],
        // Límite inferior.
        [-87.1252, 12.6242],
        // Cierre.
        [-87.1219, 12.6241],
      ],
    ],
  },
  properties: {

    zoneId: "zone-005",
    fieldId: "field-003",
    name: "Zona E",
    riskLevel: "CRITICAL",
    healthScore: 39,
    status: "ACTIVE",
  },
};

/** =========================================
 * ZONE 06
 * =========================================
 */

// Zona de riesgo medio perteneciente al field 003.
export const agroVisionZone06: ZoneFeature = {
  
  type: "Feature",
  id: "zone-006",
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        // Punto inicial.
        [-87.1220, 12.6260],
        // Límite norte.
        [-87.1220, 12.6277],
        // Punto superior.
        [-87.1208, 12.6290],
        // Parte superior derecha.
        [-87.1240, 12.6295],
        // Parte derecha.
        [-87.1258, 12.6279],
        // Límite sur.
        [-87.1240, 12.6276],
        // Cierre.
        [-87.1220, 12.6260],
      ],
    ],
  },
  properties: {
    zoneId: "zone-006",
    fieldId: "field-003",
    name: "Zona F",
    riskLevel: "MEDIUM",
    healthScore: 72,
    status: "ACTIVE",
  },
};

/** =========================================
 * FARM COLLECTION
 * =========================================
 */

// Creamos la colección GeoJSON de fincas.
export const agroVisionFarms: FarmFeatureCollection = {
  type: "FeatureCollection",
  // Lista de fincas.
  features: [agroVisionFarm] // Insertamos nuestra finca principal.
};


/** =========================================
 * FIELD COLLECTIONS
 * =========================================
 */

// Creamos la colección GeoJSON de fields.
export const agroVisionFields: FieldFeatureCollection = {

  type: "FeatureCollection",
  // Fields disponibles.
  features: [

    agroVisionField01,
    agroVisionField02,
    agroVisionField03,
  ],
};

/** =========================================
 * ZONE COLLECTION
 * =========================================
 */

// Creamos la colección GeoJSON de zonas.
export const agroVisionZones: ZoneFeatureCollection = {

  type: "FeatureCollection",
  // Zonas agrícolas.
  features: [
    // Zona A.
    agroVisionZone01,
    // Zona B.
    agroVisionZone02,
    // Zona C.
    agroVisionZone03,
    // Zona D.
    agroVisionZone04,
    // Zona E.
    agroVisionZone05,
    // Zona F.
    agroVisionZone06,
  ],
};


/** =========================================
 * COMPLETE GIS DATASET
 * =========================================
 */

// Punto de entrada único para consumir los datos GIS.
export const agroVisionMappingData = {
  // Colección de fincas, fields y zonas
  farms: agroVisionFarms,
  fields: agroVisionFields,
  zones: agroVisionZones,
} as const;


/**
 * =========================================
 * La fuente definitiva futura será:
 *
 * PostgreSQL + PostGIS
 *        ↓
 *       API
 *        ↓
 *     GeoJSON
 *        ↓
 * mappingGeoData
 *        ↓
 *     MapLibre
 * =========================================
 */
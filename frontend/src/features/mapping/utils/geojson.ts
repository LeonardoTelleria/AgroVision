/**
 * AgroVision Intelligence — Salida cartográfica compartida.
 *
 * La geometría de referencia se conserva independiente de los datos
 * agrícolas. Los nombres y propiedades de campo se toman de PostgreSQL
 * cuando están disponibles mediante FieldsContext.
 */

import { agroVisionFarms } from "../data/mappingGeoData";
import {
  expandedAgroVisionFields,
  expandedAgroVisionZones,
} from "../data/expandedFieldGeometry";
import type {
  FarmFeatureCollection,
  FieldFeatureCollection,
  ZoneFeatureCollection,
} from "../types/mappingGeo.types";
import type { Field } from "../../fields/types/field.types";

export const farmsGeoJSON: FarmFeatureCollection = agroVisionFarms;
export const fieldsGeoJSON: FieldFeatureCollection = expandedAgroVisionFields;
export const zonesGeoJSON: ZoneFeatureCollection = expandedAgroVisionZones;

export const agroVisionGeoJSON = {
  farms: farmsGeoJSON,
  fields: fieldsGeoJSON,
  zones: zonesGeoJSON,
} as const;

/**
 * Vincula cada polígono con el registro REAL de la parcela utilizando su ID.
 * No modifica la geometría ni mezcla propiedades de campos diferentes.
 * Cuando aún no ha respondido Neon, conserva únicamente los datos
 * descriptivos de la geometría referencial, no inventa KPIs.
 */
export function bindFieldsToGeometry(
  persistedFields: ReadonlyArray<Field>,
): FieldFeatureCollection {
  const byId = new Map(
    persistedFields.map((field) => [
      `field-${String(field.id).padStart(3, "0")}`,
      field,
    ]),
  );

  return {
    ...fieldsGeoJSON,
    features: fieldsGeoJSON.features.map((feature) => {
      const persisted = byId.get(String(feature.properties.fieldId));
      if (!persisted) return feature;

      return {
        ...feature,
        properties: {
          ...feature.properties,
          farmId: `farm-${String(persisted.farmId).padStart(3, "0")}`,
          name: persisted.name,
          areaSquareMeters: persisted.areaSquareMeters,
          soilType: persisted.soilType,
          irrigationType: persisted.irrigationType,
          status: persisted.status,
          createdAt: persisted.createdAt,
        },
      };
    }),
  };
}

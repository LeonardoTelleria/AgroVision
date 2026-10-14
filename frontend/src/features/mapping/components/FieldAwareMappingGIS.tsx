/**
 * AgroVision Intelligence — GIS que responde a FieldsContext.
 *
 * Reutiliza íntegramente MappingGIS sin modificar su motor.
 * Este adaptador se usa en el Dashboard compacto.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Map } from "maplibre-gl";
import { useFields } from "../../fields/context/useFields";
import { bindFieldsToGeometry, zonesGeoJSON } from "../utils/geojson";
import { fitGisGeometry } from "../utils/gisCamera";
import { MappingGIS, type MappingGISProps } from "./MappingGIS";

export function FieldAwareMappingGIS(props: MappingGISProps) {
  const { onMapReady: notifyMapReady } = props;
  const { fields: persistedFields, selectedFieldId } = useFields();
  const [map, setMap] = useState<Map | null>(null);

  const selectedId = selectedFieldId === null
    ? null
    : `field-${String(selectedFieldId).padStart(3, "0")}`;

  const completeFields = useMemo(
    () => bindFieldsToGeometry(persistedFields),
    [persistedFields],
  );

  const filteredFields = useMemo(() => ({
    ...completeFields,
    features: completeFields.features.filter(
      (field) => selectedId === null || String(field.properties.fieldId) === selectedId,
    ),
  }), [completeFields, selectedId]);

  const filteredZones = useMemo(() => ({
    ...zonesGeoJSON,
    features: zonesGeoJSON.features.filter(
      (zone) => selectedId === null || String(zone.properties.fieldId) === selectedId,
    ),
  }), [selectedId]);

  const visibleSelectedZone = props.selectedZoneId && filteredZones.features.some(
    (zone) => zone.properties.zoneId === props.selectedZoneId,
  ) ? props.selectedZoneId : null;

  useEffect(() => {
    if (map && filteredFields.features.length > 0) {
      fitGisGeometry(map, filteredFields, 450);
    }
  }, [map, filteredFields]);

  const onMapReady = useCallback((instance: Map) => {
    setMap(instance);
    notifyMapReady?.(instance);
  }, [notifyMapReady]);

  return (
    <MappingGIS
      {...props}
      fields={filteredFields}
      zones={filteredZones}
      selectedZoneId={visibleSelectedZone}
      onMapReady={onMapReady}
    />
  );
}
 
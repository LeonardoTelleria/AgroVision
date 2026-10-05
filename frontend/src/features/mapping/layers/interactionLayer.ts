/**
 * =========================================
 * Interaction Layer
 * =========================================
 *
 * Interactividad GIS de AgroVision.
 *
 * Responsabilidad:
 * - detectar zonas bajo el cursor;
 * - aplicar estado visual de hover;
 * - seleccionar una zona mediante click;
 * - exponer zoneId y propiedades al componente padre;
 * - controlar el cursor del mapa;
 * - limpiar correctamente estados y listeners.
 *
 * Este archivo NO obtiene datos del backend. Tampoco crea las geometrías.
 * Trabaja sobre las layers creadas por zoneLayer.ts.
 *
 * Flujo:
 *
 * zoneLayer.ts
 *      ↓
 * GeoJSON + layers
 *      ↓
 * interactionLayer.ts
 *      ↓
 * hover / click
 *      ↓
 * ZonePopup / UI
 * =========================================
 */

import type { MapGeoJSONFeature, MapLayerMouseEvent, LineLayerSpecification, Map } from 'maplibre-gl';

// Importamos las propiedades que definimos anteriormente para nuestras zonas.
import type { ZoneFeatureProperties } from './zoneLayer';

// ID de la capa visual adicional utilizada xclusivamente para resaltar zonas en hover/selección.
export const ZONE_INTERACTION_LAYER_ID = 'agrovision-zones-interaction';
// ID de la fuente GeoJSON que contiene las zonas. Debe coincidir exactamente con zoneLayer.ts.
export const ZONE_INTERACTION_SOURCE_ID = 'agrovision-zones-source';
// ID de la layer sobre la cual escucharemos los eventos de interacción.
export const ZONE_INTERACTION_TARGET_LAYER_ID = 'agrovision-zones-fill';

// Propiedades entregadas al seleccionar una zona.
export interface SelectedZoneData {
  readonly zoneId: string;
  readonly properties: ZoneFeatureProperties; // Propiedades completas del feature seleccionado.
}

// Callbacks que el componente superior puede proporcionar.
export interface ZoneInteractionOptions {
  // Se ejecuta cuando el cursor entra, cambia de zona o sale de una zona.
  readonly onZoneHover?: (zoneId: string | null) => void;

  // Se ejecuta cuando el usuario hace click sobre una zona válida.
  readonly onZoneSelect?: (zone: SelectedZoneData) => void;

  // Se ejecuta cuando se limpia la selección.
  readonly onZoneClear?: () => void;
}

// Layer auxiliar utilizada para dibujar el resaltado visual de hover y selección.
const ZONE_INTERACTION_LAYER: LineLayerSpecification = {
  // Utilizamos "line" porque solo necesitamos dibujar el perímetro de la zona.
  type: 'line',
  // Utilizamos exactamente la misma fuente GeoJSON utilizada por zoneLayer.ts.
  source: ZONE_INTERACTION_SOURCE_ID,
  // Asignamos el ID único de esta layer.
  id: ZONE_INTERACTION_LAYER_ID,
  paint: {
    'line-color': '#ffffff',

    // El grosor depende del estado temporal de cada feature.
    // selected -> más grueso
    // hover    -> intermedio
    // ninguno  -> invisible
    'line-width': [
      'case',

      // Si la zona está seleccionada...
      ['boolean', ['feature-state', 'selected'], false],
      3.5, // ...utilizamos un borde más grueso.

      // Si no está seleccionada, verificamos hover.
      ['boolean', ['feature-state', 'hover'], false],
      2.5, // Borde ligeramente más fino para hover.

      // Si no tiene ningún estado, la layer no aporta grosor visible.
      0,
    ],

    // La línea permanece completamente visible cuando alguno de los estados está activo.
    'line-opacity': [
      'case',

      // selected activo.
      ['boolean', ['feature-state', 'selected'], false],
      1, // Opacidad del estado seleccionado.

      // hover activo.
      ['boolean', ['feature-state', 'hover'], false],
      0.95, // Opacidad del estado hover.

      // Sin interacción.
      0,
    ],
  },
};

/**
 * Agrega la layer auxiliar de interacción.
 *
 * Parámetro:
 * - map: instancia activa de MapLibre.
 *
 * Esta layer utiliza exactamente la misma fuenteGeoJSON que las zonas.
 */
export function addZoneInteractionLayer(map: Map): void {
  // Si la layer ya existe, no la registramos nuevamente.
  if (map.getLayer(ZONE_INTERACTION_LAYER_ID)) {
    return;
  }

  // Verificamos que la fuente de zonas exista.
  if (!map.getSource(ZONE_INTERACTION_SOURCE_ID)) {
    // Detenemos la ejecución porque registrar la layer sin su source produciría un error.
    throw new Error('Zone interaction layer requires the zone GeoJSON source.');
  }

  // Agregamos la layer de interacción.
  map.addLayer(ZONE_INTERACTION_LAYER);
}

/**
 * Registra todos los eventos interactivos de las zonas.
 *
 * Parámetros:
 * - map: instancia activa de MapLibre.
 * - options: callbacks opcionales del consumidor.
 *
 * Retorna:
 * - función cleanup para eliminar listeners y estados temporales.
 */
export function setupZoneInteractions(
  map: Map,
  options: ZoneInteractionOptions = {}
): () => void {
  // Aseguramos que la layer visual de interacción exista antes de registrar los eventos.
  addZoneInteractionLayer(map);

  // Guardamos el ID de la zona que actualmente está debajo del cursor.
  let hoveredZoneId: string | null = null;

  // Guardamos el ID de la última zona seleccionada.
  let selectedZoneId: string | null = null;

  // Cambiamos el cursor cuando entra en una zona interactiva.
  const handleMouseEnter = (): void => {
    // El cursor pasa a indicar que el elemento puede ser seleccionado.
    map.getCanvas().style.cursor = 'pointer';
  };

  // Gestionamos el movimiento dentro de las zonas.
  const handleMouseMove = (event: MapLayerMouseEvent): void => {
    // Obtenemos la primera feature encontrada bajo el cursor.
    const feature = event.features?.[0];

    // Si no existe una feature válida, no hacemos nada.
    if (!feature) {
      return;
    }

    // Extraemos el zoneId desde las propiedades GeoJSON de la feature.
    const zoneId = getZoneIdFromFeature(feature);

    // Si la zona actual ya es la misma que la zona anterior, no necesitamos actualizar el estado.
    if (!zoneId || zoneId === hoveredZoneId) {
      return;
    }

    // Si existía una zona anterior bajo el cursor, eliminamos su estado hover.
    if (hoveredZoneId) {
      clearFeatureState(map, hoveredZoneId, 'hover');
    }

    // Guardamos la nueva zona bajo el cursor.
    hoveredZoneId = zoneId;

    // Activamos el estado hover en esa feature.
    setFeatureState(map, zoneId, { hover: true });

    // Informamos al componente consumidor qué zona está siendo inspeccionada.
    options.onZoneHover?.(zoneId);
  };

  // Gestionamos la salida del cursor de la superficie de la layer.
  const handleMouseLeave = (): void => {
    // Restauramos el cursor normal.
    map.getCanvas().style.cursor = '';

    // Si existe una zona actualmente en estado hover, la limpiamos.
    if (hoveredZoneId) {
      // Eliminamos solo la propiedad hover. Eliminamos nuestra referencia local.
      clearFeatureState(map, hoveredZoneId, 'hover');
      hoveredZoneId = null;
    }

    // Informamos que ya no existe una zona debajo del cursor.
    options.onZoneHover?.(null);
  };

  // Gestionamos el click sobre una zona.
  const handleClick = (event: MapLayerMouseEvent): void => {
    // Obtenemos la primera feature bajo el cursor.
    const feature = event.features?.[0];

    // Si no encontramos ninguna feature válida, cancelamos el proceso.
    if (!feature) {
      return;
    }

    // Extraemos el zoneId.
    const zoneId = getZoneIdFromFeature(feature);

    // Si el feature no tiene un zoneId válido, no puede convertirse en una zona AgroVision.
    if (!zoneId) {
      return;
    }

    // Si había otra zona seleccionada, eliminamos su estado selected.
    if (selectedZoneId && selectedZoneId !== zoneId) {
      clearFeatureState(map, selectedZoneId, 'selected');
    }

    // Guardamos la nueva selección y activamos el estado selected.
    selectedZoneId = zoneId;
    setFeatureState(map, zoneId, {selected: true});

    // Convertimos las propiedades del feature al contrato TypeScript esperado
    const properties = toZoneProperties(feature.properties);

    // Entregamos toda la información relevante al componente padre.
    options.onZoneSelect?.({zoneId, properties});
  };

  // Registramos el evento cuando el cursor entra en la layer de zonas.
  map.on('mouseenter', ZONE_INTERACTION_TARGET_LAYER_ID, handleMouseEnter);

  // Registramos el movimiento del cursor dentro de las features de la layer.
  map.on('mousemove', ZONE_INTERACTION_TARGET_LAYER_ID, handleMouseMove);

  // Registramos la salida del cursor.
  map.on('mouseleave', ZONE_INTERACTION_TARGET_LAYER_ID, handleMouseLeave);

  // Registramos el click.
  map.on('click', ZONE_INTERACTION_TARGET_LAYER_ID, handleClick);

  // Devolvemos la función de limpieza.
  return () => {
    // Eliminamos todos los listeners registrados.
    map.off('mouseenter', ZONE_INTERACTION_TARGET_LAYER_ID, handleMouseEnter);
    map.off('mousemove', ZONE_INTERACTION_TARGET_LAYER_ID, handleMouseMove);
    map.off('mouseleave', ZONE_INTERACTION_TARGET_LAYER_ID, handleMouseLeave);
    map.off('click', ZONE_INTERACTION_TARGET_LAYER_ID, handleClick);

    // Restauramos el cursor.
    map.getCanvas().style.cursor = '';

    // Eliminamos el estado hover si todavía existe.
    if (hoveredZoneId) {
      clearFeatureState(map, hoveredZoneId, 'hover');
    }

    // Eliminamos el estado selected si todavía existe.
    if (selectedZoneId) {
      clearFeatureState(map, selectedZoneId, 'selected');
    }

    // Informamos al consumidor que ya no existe una selección activa.
    options.onZoneClear?.();
  };
}

/**
 * Extrae el zoneId de una feature de MapLibre.
 *
 * Parámetro:
 * - feature: feature detectada por un evento del mapa.
 *
 * Priorizamos properties.zoneId porque es el metodo explícito de nuestras zonas.
 * Si no existe, utilizamos feature.id como respaldo.
 */
function getZoneIdFromFeature(
  feature: MapGeoJSONFeature
): string | null {
  // Recuperamos el zoneId desde las propiedades.
  const propertyZoneId = feature.properties?.zoneId;

  // Si existe, lo convertimos a string.
  if (propertyZoneId !== undefined && propertyZoneId !== null) {
    return String(propertyZoneId);
  }
  // Utilizamos feature.id como segundo mecanismo.
  if (feature.id !== undefined && feature.id !== null) {
    return String(feature.id);
  }

  // Si ninguno existe, no podemos identificar la zona de forma segura.
  return null;
}

/**
 * Convierte propiedades GeoJSON a nuestro contrato Field/Zone de AgroVision.
 *
 * Parámetro:
 * - properties: propiedades crudas entregadas por MapLibre.
 */
function toZoneProperties(
  properties: Record<string, unknown> | null | undefined
): ZoneFeatureProperties {
  // Convertimos cada propiedad al tipo esperado.
  return {
    zoneId: String(properties?.zoneId ?? ''),
    fieldId: String(properties?.fieldId ?? ''),
    name: String(properties?.name ?? 'Zona sin nombre'),
    cropId: toNullableNumber(properties?.cropId),
    riskLevel: toNullableRiskLevel(properties?.riskLevel),
    healthScore: toNullableNumber(properties?.healthScore),
    status:
      properties?.status !== undefined && properties?.status !== null ? String(properties.status) : null,
  };
}

/**
 * Convierte un valor desconocido a number cuando es posible.
 *
 * Parámetro:
 * - value: valor recibido desde GeoJSON.
 */
function toNullableNumber(value: unknown): number | null {
  // Si no existe ningún valor, devolvemos null.
  if (value === undefined || value === null || value === '') {
    return null;
  }

  // Convertimos el valor a número.
  const numericValue = Number(value);

  // Si la conversión produce NaN, consideramos que no existe un valor válido.
  return Number.isFinite(numericValue) ? numericValue : null;
}

/**
 * Valida que un valor sea uno de nuestros niveles de riesgo conocidos.
 *
 * Parámetro:
 * - value: valor recibido desde GeoJSON.
 */
function toNullableRiskLevel(
  value: unknown
): ZoneFeatureProperties['riskLevel'] {
  // Normalizamos el valor a string.
  const risk = String(value ?? '').toUpperCase();

  // Validamos cada nivel permitido.
  if (
    risk === 'LOW' ||
    risk === 'MEDIUM' ||
    risk === 'HIGH' ||
    risk === 'CRITICAL'
  ) {
    return risk;
  }
  // Si el valor no coincide con el contrato, devolvemos null.
  return null;
}

/**
 * Activa un estado temporal sobre una feature.
 *
 * Parámetros:
 * - map: instancia MapLibre.
 * - zoneId: identificador de la zona.
 * - state: valores temporales de la feature.
 */
function setFeatureState(
  map: Map,
  zoneId: string,
  state: {
    readonly hover?: boolean;
    readonly selected?: boolean;
  }
): void {
  // MapLibre necesita el source y el ID de la feature para almacenar su estado.
  map.setFeatureState(
    {
      source: ZONE_INTERACTION_SOURCE_ID,
      id: zoneId,
    }, state
  );
}

/**
 * Elimina una propiedad específica del estado temporal de una feature.
 *
 * Parámetros:
 * - map: instancia MapLibre.
 * - zoneId: identificador de la zona.
 * - key: propiedad temporal que queremos limpiar.
 */
function clearFeatureState(
  map: Map,
  zoneId: string,
  key: 'hover' | 'selected'
): void {
  // Eliminamos únicamente la propiedad indicada sin tocar otros estados temporales.
  map.removeFeatureState(
    {
      source: ZONE_INTERACTION_SOURCE_ID,
      id: zoneId,
    }, key
  );
}

/**
 * Elimina completamente la layer auxiliar de interacción.
 *
 * Parámetro:
 * - map: instancia MapLibre.
 */
export function removeZoneInteractionLayer(map: Map): void {
  // Primero eliminamos cualquier estado temporal  asociado a las features de la fuente.
  if (map.getSource(ZONE_INTERACTION_SOURCE_ID)) {
    map.removeFeatureState({
      source: ZONE_INTERACTION_SOURCE_ID,
    });
  }

  // Después eliminamos la layer auxiliar.
  if (map.getLayer(ZONE_INTERACTION_LAYER_ID)) {
    map.removeLayer(ZONE_INTERACTION_LAYER_ID);
  }
}

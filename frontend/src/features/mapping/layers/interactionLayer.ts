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
 * - entregar su identificador, propiedades y coordenadas;
 * - controlar el cursor del mapa;
 * - liberar estados temporales y listeners.
 *
 * Integración:
 * Utiliza la fuente y la capa de relleno de zoneLayer.ts.
 * La propiedad zoneId identifica las zonas mediante promoteId.
 *
 * Ciclo de vida:
 * El consumidor registra una interacción por mapa y ejecuta
 * su función de limpieza antes de retirar las capas de zonas.
 * removeZoneInteractionLayer libera después la capa de resaltado.
 *
 * =========================================
 */

// Importamos los tipos utilizados para las capas y eventos de MapLibre.
import type { LineLayerSpecification, Map, MapGeoJSONFeature, MapLayerMouseEvent } from "maplibre-gl";

// Consumimos las propiedades y coordenadas del contrato GIS compartido.
import type { LngLat, ZoneFeatureProperties } from "../types/mappingGeo.types";

// Consumimos los identificadores oficiales de la fuente y la capa de zonas.
import { ZONE_FILL_LAYER_ID, ZONE_SOURCE_ID } from "./zoneLayer";

// ID de la capa visual adicional utilizada para resaltar zonas en hover y selección.
export const ZONE_INTERACTION_LAYER_ID = "agrovision-zones-interaction";

// Conservamos los nombres públicos vinculándolos con los identificadores de zoneLayer.
export const ZONE_INTERACTION_SOURCE_ID = ZONE_SOURCE_ID;
export const ZONE_INTERACTION_TARGET_LAYER_ID = ZONE_FILL_LAYER_ID;

// Información entregada al seleccionar una zona.
export interface SelectedZoneData {
    readonly zoneId: string;
    // Coordenadas del click utilizadas para posicionar el popup.
    readonly coordinates: LngLat;
    // Propiedades descriptivas y analíticas de la zona seleccionada.
    readonly properties: ZoneFeatureProperties;
}

// Callbacks que el componente superior puede proporcionar.
export interface ZoneInteractionOptions {
    // Se ejecuta cuando el cursor cambia de zona o sale de una zona.
    readonly onZoneHover?: (zoneId: string | null) => void;
    // Se ejecuta cuando el usuario hace click sobre una zona válida.
    readonly onZoneSelect?: (zone: SelectedZoneData) => void;
    // Se ejecuta cuando la limpieza libera la selección.
    readonly onZoneClear?: () => void;
}

// Layer auxiliar utilizada para dibujar el resaltado visual de hover y selección.
const ZONE_INTERACTION_LAYER: LineLayerSpecification = {
    // Utilizamos "line" para dibujar el perímetro de la zona.
    type: "line",
    // Utilizamos la misma fuente GeoJSON registrada por zoneLayer.
    source: ZONE_INTERACTION_SOURCE_ID,
    id: ZONE_INTERACTION_LAYER_ID,
    paint: {
        "line-color": "#ffffff",
        // La selección tiene prioridad sobre el hover.
        "line-width": [
            "case",
            // Borde más grueso para la zona seleccionada.
            ["boolean", ["feature-state", "selected"], false], 3.5,
            // Borde intermedio para la zona bajo el cursor.
            ["boolean", ["feature-state", "hover"], false], 2.5,
            // Grosor del estado inactivo.
            0,
        ],
        // La opacidad depende del estado temporal de la feature.
        "line-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false], 1,
            ["boolean", ["feature-state", "hover"], false], 0.95,
            0,
        ],
    },
};

/**
 * Registra la capa auxiliar de resaltado utilizando la fuente de zonas.
 *
 * Las llamadas posteriores conservan la capa registrada.
 *
 * @param map Instancia activa de MapLibre con la fuente de zonas registrada.
 * @throws Error cuando falta la fuente GeoJSON de zonas.
 */
export function addZoneInteractionLayer(map: Map): void {
    // Conservamos la capa cuando ya está registrada.
    if (map.getLayer(ZONE_INTERACTION_LAYER_ID)) return;

    // Comprobamos la dependencia cartográfica antes de registrar la capa.
    if (!map.getSource(ZONE_INTERACTION_SOURCE_ID)) {
        throw new Error("Zone interaction layer requires the zone GeoJSON source.");
    }

    // Agregamos la layer de interacción.
    map.addLayer(ZONE_INTERACTION_LAYER);
}

/**
 * Registra los eventos de hover y selección de las zonas.
 *
 * Mantiene una selección activa y una zona bajo el cursor.
 * Los callbacks reciben los cambios producidos por la interacción.
 *
 * @param map Instancia activa con la fuente y la capa de relleno de zonas registradas.
 * @param options Callbacks opcionales del consumidor.
 * @returns Función de limpieza de listeners, cursor y estados temporales.
 */
export function setupZoneInteractions(map: Map, options: ZoneInteractionOptions = {}): () => void {
    // Aseguramos que la layer visual de interacción exista antes de registrar los eventos.
    addZoneInteractionLayer(map);

    // Guardamos el ID de la zona que actualmente está debajo del cursor.
    let hoveredZoneId: string | null = null;

    // Guardamos el ID de la última zona seleccionada.
    let selectedZoneId: string | null = null;

    // Controlamos que la limpieza se ejecute una sola vez por registro.
    let disposed = false;

    // Cambiamos el cursor cuando entra en una zona interactiva.
    const handleMouseEnter = (): void => {
        map.getCanvas().style.cursor = "pointer";
    };

    // Gestionamos el movimiento dentro de las zonas.
    const handleMouseMove = (event: MapLayerMouseEvent): void => {
        // Obtenemos la primera feature encontrada bajo el cursor.
        const feature = event.features?.[0];
        if (!feature) return;

        // Extraemos el identificador de la zona detectada.
        const zoneId = getZoneIdFromFeature(feature);
        if (!zoneId || zoneId === hoveredZoneId) return;

        // Liberamos el hover de la zona anterior.
        if (hoveredZoneId) {
            clearFeatureState(map, hoveredZoneId, "hover");
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
        map.getCanvas().style.cursor = "";

        // Liberamos el estado hover y su referencia local.
        if (hoveredZoneId) {
            clearFeatureState(map, hoveredZoneId, "hover");
            hoveredZoneId = null;
        }

        // Informamos que terminó la inspección de la zona.
        options.onZoneHover?.(null);
    };

    // Gestionamos el click sobre una zona.
    const handleClick = (event: MapLayerMouseEvent): void => {
        // Obtenemos la primera feature bajo el cursor.
        const feature = event.features?.[0];
        if (!feature) return;

        // Extraemos el identificador de la zona.
        const zoneId = getZoneIdFromFeature(feature);
        if (!zoneId) return;

        // Liberamos la selección anterior cuando el usuario cambia de zona.
        if (selectedZoneId && selectedZoneId !== zoneId) {
            clearFeatureState(map, selectedZoneId, "selected");
        }

        // Guardamos la nueva selección y activamos el estado selected.
        selectedZoneId = zoneId;
        setFeatureState(map, zoneId, { selected: true });

        // Normalizamos las propiedades utilizando el mismo identificador de la selección.
        const properties = toZoneProperties(feature.properties, zoneId);

        // Entregamos las propiedades y la posición del click al componente consumidor.
        options.onZoneSelect?.({ zoneId, properties, coordinates: [event.lngLat.lng, event.lngLat.lat] });
    };

    // Registramos los eventos sobre la capa de relleno de las zonas.
    map.on("mouseenter", ZONE_INTERACTION_TARGET_LAYER_ID, handleMouseEnter);
    map.on("mousemove", ZONE_INTERACTION_TARGET_LAYER_ID, handleMouseMove);
    map.on("mouseleave", ZONE_INTERACTION_TARGET_LAYER_ID, handleMouseLeave);
    map.on("click", ZONE_INTERACTION_TARGET_LAYER_ID, handleClick);

    // Devolvemos la función de limpieza.
    return () => {
        if (disposed) return;
        disposed = true;

        // Eliminamos todos los listeners registrados.
        map.off("mouseenter", ZONE_INTERACTION_TARGET_LAYER_ID, handleMouseEnter);
        map.off("mousemove", ZONE_INTERACTION_TARGET_LAYER_ID, handleMouseMove);
        map.off("mouseleave", ZONE_INTERACTION_TARGET_LAYER_ID, handleMouseLeave);
        map.off("click", ZONE_INTERACTION_TARGET_LAYER_ID, handleClick);

        // Restauramos el cursor.
        map.getCanvas().style.cursor = "";

        // Liberamos los estados temporales administrados por este registro.
        if (hoveredZoneId) {
            clearFeatureState(map, hoveredZoneId, "hover");
        }

        if (selectedZoneId) {
            clearFeatureState(map, selectedZoneId, "selected");
        }

        // Limpiamos las referencias locales.
        hoveredZoneId = null;
        selectedZoneId = null;

        // Sincronizamos el estado del consumidor con la limpieza de la interacción.
        options.onZoneHover?.(null);
        options.onZoneClear?.();
    };
}

/**
 * Obtiene el identificador lógico de una zona.
 *
 * Prioriza properties.zoneId y utiliza feature.id como respaldo.
 *
 * @param feature Feature detectada por un evento de MapLibre.
 * @returns Identificador válido o null.
 */
function getZoneIdFromFeature(feature: MapGeoJSONFeature): string | null {
    // Revisamos primero la propiedad lógica y después el identificador espacial.
    for (const value of [feature.properties?.zoneId, feature.id]) {
        if (typeof value === "string" && value.trim().length > 0) return value;
        if (typeof value === "number" && Number.isFinite(value)) return String(value);
    }

    return null;
}

/**
 * Normaliza las propiedades entregadas por MapLibre al contrato GIS.
 *
 * Conserva los identificadores numéricos o textuales y las métricas
 * analíticas disponibles para los consumidores de la selección.
 *
 * @param properties Propiedades crudas de la feature.
 * @param zoneId Identificador resuelto para la zona seleccionada.
 */
function toZoneProperties(properties: Record<string, unknown> | null | undefined, zoneId: string): ZoneFeatureProperties {
    return {
        zoneId,
        fieldId: typeof properties?.fieldId === "number" ? properties.fieldId : String(properties?.fieldId ?? ""),
        name: String(properties?.name ?? "Zona sin nombre"),
        cropId: typeof properties?.cropId === "string" || typeof properties?.cropId === "number" ? properties.cropId : null,
        riskLevel: toNullableRiskLevel(properties?.riskLevel),
        healthScore: toNullableNumber(properties?.healthScore),
        mainCause: toNullableString(properties?.mainCause),
        summary: toNullableString(properties?.summary),
        recommendedAction: toNullableString(properties?.recommendedAction),
        generatedAt: toNullableString(properties?.generatedAt),
        status: toNullableString(properties?.status),
    };
}

/**
 * Convierte números o cadenas numéricas a un valor finito.
 *
 * @param value Valor recibido desde GeoJSON.
 * @returns Número normalizado o null.
 */
function toNullableNumber(value: unknown): number | null {
    // Admitimos números y cadenas con contenido numérico.
    if (typeof value !== "number" && typeof value !== "string") return null;
    if (typeof value === "string" && value.trim().length === 0) return null;

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
}

/**
 * Normaliza y valida el nivel de riesgo recibido.
 *
 * @param value Valor recibido desde GeoJSON.
 * @returns Nivel de riesgo reconocido o null.
 */
function toNullableRiskLevel(value: unknown): ZoneFeatureProperties["riskLevel"] {
    const risk = typeof value === "string" ? value.trim().toUpperCase() : "";

    // Validamos los niveles definidos por el contrato GIS.
    if (risk === "LOW" || risk === "MEDIUM" || risk === "HIGH" || risk === "CRITICAL") return risk;

    return null;
}

/**
 * Conserva los valores textuales opcionales de una feature.
 *
 * @param value Valor recibido desde GeoJSON.
 * @returns Texto disponible o null.
 */
function toNullableString(value: unknown): string | null {
    return typeof value === "string" ? value : null;
}

/**
 * Activa estados temporales sobre una zona de la fuente registrada.
 *
 * @param map Instancia activa de MapLibre.
 * @param zoneId Identificador de la zona.
 * @param state Estados de hover o selección.
 */
function setFeatureState(map: Map, zoneId: string, state: { readonly hover?: boolean; readonly selected?: boolean }): void {
    // Comprobamos la fuente porque el estilo puede estar siendo reemplazado.
    if (!map.getSource(ZONE_INTERACTION_SOURCE_ID)) return;

    // MapLibre utiliza la fuente y el ID de la feature para almacenar su estado.
    map.setFeatureState({ source: ZONE_INTERACTION_SOURCE_ID, id: zoneId }, state);
}

/**
 * Libera una propiedad del estado temporal de una zona.
 *
 * @param map Instancia activa de MapLibre.
 * @param zoneId Identificador de la zona.
 * @param key Estado que debe liberarse.
 */
function clearFeatureState(map: Map, zoneId: string, key: "hover" | "selected"): void {
    // Comprobamos que la fuente siga registrada durante la limpieza.
    if (!map.getSource(ZONE_INTERACTION_SOURCE_ID)) return;

    // Eliminamos únicamente la propiedad indicada.
    map.removeFeatureState({ source: ZONE_INTERACTION_SOURCE_ID, id: zoneId }, key);
}

/**
 * Libera la capa auxiliar y los estados temporales de la fuente de zonas.
 *
 * El consumidor ejecuta previamente la limpieza de setupZoneInteractions.
 *
 * @param map Instancia activa de MapLibre.
 */
export function removeZoneInteractionLayer(map: Map): void {
    // Liberamos los estados temporales asociados a las features de la fuente.
    if (map.getSource(ZONE_INTERACTION_SOURCE_ID)) {
        map.removeFeatureState({ source: ZONE_INTERACTION_SOURCE_ID });
    }

    // Eliminamos la layer auxiliar cuando está registrada.
    if (map.getLayer(ZONE_INTERACTION_LAYER_ID)) {
        map.removeLayer(ZONE_INTERACTION_LAYER_ID);
    }
}
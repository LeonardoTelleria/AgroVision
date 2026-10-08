/**
 * =========================================
 * Zone Popup
 * =========================================
 *
 * Popup informativo para las zonas agrícolas representadas en el mapa.
 *
 * Responsabilidad:
 * - presentar el identificador y el nombre de la zona;
 * - mostrar riesgo, salud, field y estado operativo;
 * - incorporar diagnóstico, recomendaciones y fecha del análisis;
 * - construir el contenido DOM y posicionar el popup.
 *
 * Integración:
 * El consumidor entrega las propiedades de la zona y las
 * coordenadas de selección. openZonePopup devuelve la instancia
 * para actualizar su contenido o gestionar su cierre.
 *
 * Presentación:
 * Los valores se insertan mediante textContent.
 * Los campos opcionales utilizan valores neutros o se presentan
 * cuando contienen información disponible.
 *
 * =========================================
 */

// Importamos Popup y el tipo de instancia cartográfica.
import { Popup, type Map } from "maplibre-gl";

// Consumimos los contratos compartidos de riesgo, coordenadas y propiedades de zona.
import type { GISRiskLevel, LngLat, ZoneFeatureProperties } from "../types/mappingGeo.types";

/** Presentación visual y textual de un nivel de riesgo. */
interface RiskPresentation {
    readonly label: string;
    readonly className: string;
}

// Asociamos cada nivel con su texto y su clase CSS en una única definición.
const RISK_PRESENTATION: Readonly<Record<GISRiskLevel, RiskPresentation>> = {
    LOW: { label: "Bajo", className: "risk-low" },
    MEDIUM: { label: "Medio", className: "risk-medium" },
    HIGH: { label: "Alto", className: "risk-high" },
    CRITICAL: { label: "Crítico", className: "risk-critical" },
};

// Presentación neutra para una zona pendiente de evaluación.
const UNKNOWN_RISK_PRESENTATION: RiskPresentation = { label: "Sin evaluar", className: "risk-unknown" };

/**
 * Construye una fila reutilizable del popup utilizando contenido textual.
 *
 * @param label Nombre del dato presentado.
 * @param value Valor visible.
 * @param valueClassName Clase CSS del valor.
 */
function createPopupRow(label: string, value: string, valueClassName = "agrovision-zone-popup__value"): HTMLDivElement {
    // Creamos la fila y su clase visual.
    const row = document.createElement("div");
    row.className = "agrovision-zone-popup__row";

    // Creamos la etiqueta descriptiva.
    const labelElement = document.createElement("span");
    labelElement.textContent = label;

    // Mostramos el valor como texto y aplicamos su clase.
    const valueElement = document.createElement("span");
    valueElement.textContent = value;
    valueElement.className = valueClassName;

    row.append(labelElement, valueElement);
    return row;
}

/**
 * Construye el contenido visual del popup a partir de las propiedades GIS.
 *
 * @param properties Propiedades descriptivas y analíticas de la zona.
 * @returns Contenedor DOM listo para insertarse en un Popup.
 */
export const createZonePopupElement = (properties: ZoneFeatureProperties): HTMLDivElement => {
    // Creamos el contenedor principal.
    const container = document.createElement("div");
    container.className = "agrovision-zone-popup";

    // Creamos el encabezado.
    const header = document.createElement("div");
    header.className = "agrovision-zone-popup__header";

    // Mostramos el nombre sin insertar HTML externo.
    const title = document.createElement("strong");
    title.textContent = properties.name;

    // Mostramos el ID como texto seguro.
    const zoneId = document.createElement("span");
    zoneId.textContent = properties.zoneId;
    zoneId.className = "agrovision-zone-popup__zone-id";

    // Insertamos nombre e ID dentro del encabezado.
    header.append(title, zoneId);

    // Creamos el cuerpo del popup.
    const body = document.createElement("div");
    body.className = "agrovision-zone-popup__body";

    // Resolvemos conjuntamente el texto y la clase del riesgo.
    const risk = properties.riskLevel ? RISK_PRESENTATION[properties.riskLevel] ?? UNKNOWN_RISK_PRESENTATION : UNKNOWN_RISK_PRESENTATION;

    // Mostramos una puntuación sanitaria finita dentro del rango del contrato.
    const score = properties.healthScore;
    const healthLabel = typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 100 ? `${score}/100` : "Sin datos";

    // Conservamos las filas principales y sus clases CSS originales.
    body.append(createPopupRow("Riesgo", risk.label, `agrovision-zone-popup__risk ${risk.className}`), createPopupRow("Salud", healthLabel), createPopupRow("Field", String(properties.fieldId)), createPopupRow("Estado", properties.status ?? "Sin estado"));

    // Incorporamos las propiedades analíticas opcionales entregadas por el adaptador.
    const analyticalRows = [
        ["Causa", properties.mainCause],
        ["Resumen", properties.summary],
        ["Acción", properties.recommendedAction],
        ["Actualizado", properties.generatedAt],
    ] as const;

    for (const [label, value] of analyticalRows) {
        if (typeof value === "string" && value.trim().length > 0) body.append(createPopupRow(label, value));
    }

    // Insertamos encabezado y cuerpo en el contenedor.
    container.append(header, body);
    return container;
};

/**
 * Abre el popup de una zona en la coordenada indicada.
 *
 * @param map Instancia activa de MapLibre.
 * @param coordinates Posición del popup en orden longitud, latitud.
 * @param properties Propiedades descriptivas y analíticas de la zona.
 * @returns Instancia del popup disponible para el consumidor.
 */
export const openZonePopup = (map: Map, coordinates: LngLat, properties: ZoneFeatureProperties): Popup => {
    // Creamos el contenido del popup.
    const content = createZonePopupElement(properties);

    // Creamos la instancia conservando la configuración original.
    const popup = new Popup({
        // Permitimos cerrar el popup mediante el botón.
        closeButton: true,
        // Permitimos cerrar al hacer click fuera del popup.
        closeOnClick: true,
        // Cerramos la información contextual al encuadrar otra zona o mover la cámara.
        closeOnMove: true,
        // Limitamos el ancho del contenido.
        maxWidth: "320px",
        // Elevamos ligeramente el popup respecto al punto de interacción.
        offset: 12,
    });

    // Posicionamos el popup exactamente donde ocurrió la interacción.
    popup.setLngLat(coordinates);
    // Insertamos nuestro contenido DOM seguro.
    popup.setDOMContent(content);
    // Mostramos el popup sobre el mapa.
    popup.addTo(map);
    // Devolvemos la instancia para poder controlarla posteriormente.
    return popup;
};

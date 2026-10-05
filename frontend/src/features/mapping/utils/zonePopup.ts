/**
 * =========================================
 * Zone Popup
 * =========================================
 *
 * Popup informativo para las zonas agrícolas representadas dentro del mapa.
 *
 * Responsabilidad:
 * - mostrar información de una ZoneFeature;
 * - presentar riesgo y estado de la zona;
 * - mostrar el healthScore disponible;
 * - mantener la información visual separada de la geometría del mapa.
 *
 * Flujo conceptual:
 *
 * MapLibre click
 *      ↓
 * ZoneFeature
 *      ↓
 * ZonePopup
 *      ↓
 * Información de la zona
 *
 * Este archivo NO:
 * - modifica geometrías;
 * - modifica layers;
 *
 * =========================================
 */

// Importamos Popup y Map desde MapLibre.
import { Popup, type Map } from "maplibre-gl";

// Importamos solamente el contrato de las propiedades de una zona.
import type { ZoneFeatureProperties } from "../types/mappingGeo.types";

/**
 * =========================================
 * RISK LABEL
 * =========================================
*/ 
// Convierte el código interno del riesgo en un texto visible.
const getRiskLabel = (
    riskLevel: ZoneFeatureProperties["riskLevel"]
): string => {
    // Todos los tipos de riesgo disponibles
    if (riskLevel == 'LOW') return 'Bajo';
    if (riskLevel == 'MEDIUM') return 'Medio';
    if (riskLevel == 'HIGH') return 'Alto';
    if (riskLevel == 'CRITICAL') return 'Bajo'

    // Cuando todavía no existe información de riesgo.
    return "Sin evaluar"
}

/**
 * =========================================
 * RISK CLASS
 * =========================================
*/
// Convierte el riesgo en una clase CSS semántica.
const getRiskClass = (
  riskLevel: ZoneFeatureProperties["riskLevel"],
): string => {
  // Clase para riesgo bajo, medio, alto y critico 
  if (riskLevel === "LOW") return "risk-low";
  if (riskLevel === "MEDIUM") return "risk-medium";
  if (riskLevel === "HIGH") return "risk-high";
  if (riskLevel === "CRITICAL") return "risk-critical";

  // Clase neutra cuando no existe riesgo.
  return "risk-unknown";
};

/**
 * =========================================
 * POPUP CONTENT
 * =========================================
*/ 

// Construye el contenido visual del popup.
export const createZonePopupElement = (
  properties: ZoneFeatureProperties,
): HTMLDivElement => {
  // Creamos el contenedor principal.
  const container = document.createElement("div");
  // Asignamos una clase raíz.
  container.className = "agrovision-zone-popup";
  // Creamos el encabezado.
  const header = document.createElement("div");
  // Asignamos clase al encabezado.
  header.className = "agrovision-zone-popup__header";
  // Creamos el nombre de la zona.
  const title = document.createElement("strong");
  // Mostramos el nombre sin insertar HTML externo.
  title.textContent = properties.name;
  // Creamos el identificador de la zona.
  const zoneId = document.createElement("span");
  // Mostramos el ID como texto seguro.
  zoneId.textContent = properties.zoneId;
  // Asignamos clase al identificador.
  zoneId.className = "agrovision-zone-popup__zone-id";
  // Insertamos nombre e ID dentro del encabezado.
  header.append(title, zoneId);
  // Creamos el cuerpo.
  const body = document.createElement("div");
  // Asignamos clase al cuerpo.
  body.className = "agrovision-zone-popup__body";

  /**
 * =========================================
 * RISK ROW 
 * =========================================
 */ 

  // Creamos la fila del riesgo.
  const riskRow = document.createElement("div");
  // Asignamos clase a la fila.
  riskRow.className = "agrovision-zone-popup__row";
  // Creamos la etiqueta.
  const riskLabel = document.createElement("span");
  // Texto descriptivo.
  riskLabel.textContent = "Riesgo";
  // Creamos el valor.
  const riskValue = document.createElement("span");
  // Convertimos el riesgo a texto legible.
  riskValue.textContent = getRiskLabel(properties.riskLevel);
  // Aplicamos clase semántica según el nivel.
  riskValue.className = `agrovision-zone-popup__risk ${getRiskClass(properties.riskLevel)}`;
  // Agregamos los elementos a la fila.
  riskRow.append(riskLabel, riskValue);

  /**
 * =========================================
 * HEALTH SCORE ROW
 * =========================================
 */ 

  // Creamos la fila de salud.
  const healthRow = document.createElement("div");
  // Asignamos clase.
  healthRow.className = "agrovision-zone-popup__row";
  // Creamos la etiqueta.
  const healthLabel = document.createElement("span");
  // Texto visible.
  healthLabel.textContent = "Salud";
  // Creamos el valor.
  const healthValue = document.createElement("span");
  // Mostramos la puntuación cuando existe.
  healthValue.textContent = properties.healthScore !== null && properties.healthScore !== undefined ? `${properties.healthScore}/100` : "Sin datos";
  // Asignamos clase al valor.
  healthValue.className = "agrovision-zone-popup__value";
  // Insertamos los elementos de la fila.
  healthRow.append(healthLabel, healthValue);

 /**
 * =========================================
 * FIELD ROW 
 * =========================================
 */ 
  // Creamos la fila del field.
  const fieldRow = document.createElement("div");
  // Asignamos clase.
  fieldRow.className = "agrovision-zone-popup__row";
  // Creamos la etiqueta.
  const fieldLabel = document.createElement("span");
  // Texto visible.
  fieldLabel.textContent = "Field";
  // Creamos el valor.
  const fieldValue = document.createElement("span");
  // Mostramos el ID del field asociado.
  fieldValue.textContent = String(properties.fieldId);
  // Asignamos clase.
  fieldValue.className = "agrovision-zone-popup__value";
  // Insertamos los elmentos.
  fieldRow.append(fieldLabel, fieldValue);

  /**
 * =========================================
 * STATUS ROW
 * =========================================
 */ 

  // Creamos la fila del estado.
  const statusRow = document.createElement("div");
  // Asignamos clase.
  statusRow.className = "agrovision-zone-popup__row";
  // Creamos la etiqueta.
  const statusLabel = document.createElement("span");
  // Texto visible.
  statusLabel.textContent = "Estado";
  // Creamos el valor.
  const statusValue = document.createElement("span");
  // Mostramos el estado o un valor neutro.
  statusValue.textContent = properties.status ?? "Sin estado";
  // Asignamos clase
  statusValue.className = "agrovision-zone-popup__value";
  // Insertamos los elementos.
  statusRow.append(statusLabel, statusValue);


  // Insertamos todas las filas dentro del cuerpo.
  body.append( riskRow, healthRow, fieldRow, statusRow);
  // Insertamos encabezado y cuerpo en el contenedor.
  container.append(header, body);

  // Devolvemos el DOM completo.
  return container;
};

/**
 * =========================================
 * OPEN ZONE POPUP
 * =========================================
 */ 
// Abre el popup de una zona en la coordenada indicada.
export const openZonePopup = (
  map: Map,
  coordinates: [number, number],
  properties: ZoneFeatureProperties,
): Popup => {
  // Creamos el contenido del popup.
  const content = createZonePopupElement(properties);

  // Creamos la instancia de Popup.
  const popup = new Popup({
    // Permitimos cerrar el popup mediante el botón.
    closeButton: true,
    // Permitimos cerrar al hacer click fuera del popup.
    closeOnClick: true,
    // Evitamos que el contenido ocupe demasiado ancho.
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

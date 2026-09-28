/**
 * =========================================
 * Field Notebook Service
 * =========================================
 *
 * Capa de acceso a datos del Cuaderno de campo.
 *
 * Flujo:
 *
 * FieldNotebookPage
 *        ↓
 * fieldNotebookService
 *        ↓
 * GET /api/field-notebook
 *        ↓
 * fallback controlado si backend no responde
 *
 * La UI nunca consume mocks directamente.
 */

import { API_ENDPOINTS } from "../../../shared/api/endpoints";
import type { ApiResponse, FieldNotebookData, FieldNotebookRecord, FieldObservationForm } from "../types/fieldNotebook.types";

/**
 * Endpoint centralizado.
 *
 * No escribimos "/api/field-notebook"
 * directamente dentro de páginas o componentes.
 */
const FIELD_NOTEBOOK_ENDPOINT = API_ENDPOINTS.fieldNotebook;

/**
 * Fallback visual alineado con el caso demo.
 *
 * Se utiliza únicamente cuando backend
 * todavía no responde.
 */
const fieldNotebookFallback: FieldNotebookData = {
  totalRecords: 4,
  pendingObservations: 1,
  appliedActions: 3,
  registeredZones: 2,
  registeredEvidence: 4,

  records: [
    {
      id: "notebook-001",
      createdAt: "2026-06-29T15:00:00.000Z",
      responsible: "Juan Pérez",
      fieldId: "field-001",
      zoneId: "zone-03",
      cropType: "ORANGE",
      eventType: "INSPECTION",
      evidenceCount: 2,
      note: "Se detectan manchas y reducción localizada de vigor.",
    },
    {
      id: "notebook-002",
      createdAt: "2026-06-30T17:00:00.000Z",
      responsible: "María López",
      fieldId: "field-001",
      zoneId: "zone-03",
      cropType: "ORANGE",
      eventType: "IRRIGATION",
      evidenceCount: 1,
      note: "Riego correctivo aplicado en la zona crítica.",
    },
    {
      id: "notebook-003",
      createdAt: "2026-07-01T08:00:00.000Z",
      responsible: "Juan Pérez",
      fieldId: "field-001",
      zoneId: "zone-03",
      cropType: "ORANGE",
      eventType: "FERTILIZATION",
      evidenceCount: 1,
      note: "Aplicación registrada y pendiente de seguimiento.",
    },
    {
      id: "notebook-004",
      createdAt: "2026-07-01T10:15:00.000Z",
      responsible: "Ana Torres",
      fieldId: "field-001",
      zoneId: "zone-02",
      cropType: "ORANGE",
      eventType: "PEST_CONTROL",
      evidenceCount: 2,
      note: "Aplicación de insecticida documentada.",
    },
  ],

  linkedItems: [
    {
      id: "alert-001",
      type: "ALERT",
      title: "Anomalía visual detectada",
      zoneId: "zone-03",
      priority: "HIGH",
      createdAt: "2026-06-29T15:10:00.000Z",
    },
    {
      id: "recommendation-001",
      type: "RECOMMENDATION",
      title: "Verificar visualmente la zona crítica",
      zoneId: "zone-03",
      priority: "MEDIUM",
      createdAt: "2026-06-29T15:20:00.000Z",
    },
    {
      id: "report-zone-03",
      type: "REPORT",
      title: "Reporte prescriptivo de zone-03",
      zoneId: "zone-03",
      priority: "LOW",
      createdAt: "2026-06-29T16:00:00.000Z",
    },
  ],

  evidenceFiles: [
    {
      id: "evidence-001",
      type: "IMAGE",
      name: "Inspeccion-zone-03.jpg",
      sizeLabel: "1.2 MB",
      previewUrl: null,
    },
    {
      id: "evidence-002",
      type: "IMAGE",
      name: "Riego-zone-03.jpg",
      sizeLabel: "1.1 MB",
      previewUrl: null,
    },
    {
      id: "evidence-003",
      type: "IMAGE",
      name: "Estado-cultivo.jpg",
      sizeLabel: "2.3 MB",
      previewUrl: null,
    },
    {
      id: "evidence-004",
      type: "PDF",
      name: "Reporte-prescriptivo.pdf",
      sizeLabel: "580 KB",
      previewUrl: null,
    },
    {
      id: "evidence-005",
      type: "IMAGE",
      name: "Monitoreo-NDVI.jpg",
      sizeLabel: "1.6 MB",
      previewUrl: null,
    },
    {
      id: "evidence-006",
      type: "PDF",
      name: "Plan-de-manejo.pdf",
      sizeLabel: "1.4 MB",
      previewUrl: null,
    },
  ],
};

/**
 * Obtiene información del Cuaderno de campo.
 *
 * 1. intenta backend;
 * 2. valida HTTP;
 * 3. valida ApiResponse;
 * 4. usa fallback si el endpoint todavía no responde.
 */
export async function getFieldNotebookData(): Promise<FieldNotebookData> {
  try {
    const response = await fetch(FIELD_NOTEBOOK_ENDPOINT);

    if (!response.ok) {
      return cloneFallbackData();
    }

    const json = (await response.json()) as ApiResponse<FieldNotebookData>;

    if (!json.success || !json.data) {
      return cloneFallbackData();
    }

    return json.data;
  } catch {
    return cloneFallbackData();
  }
}

/**
 * Registra una observación.
 *
 * Se intenta POST real.
 * Si backend aún no está disponible se genera
 * un registro local compatible para mantener la demo funcional.
 */
export async function createFieldObservation(form: FieldObservationForm): Promise<FieldNotebookRecord> {
  try {
    const response = await fetch(FIELD_NOTEBOOK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fieldId: "field-001",
        cropType: form.cropType,
        zoneId: form.zoneId,
        observation: form.observation,
        severity: form.severity,
        action: form.action,
        responsible: form.responsible,
        createdAt: new Date(form.date).toISOString(),
      }),
    });

    if (response.ok) {
      const json = (await response.json()) as ApiResponse<FieldNotebookRecord>;

      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch {
    // Backend todavía puede no estar disponible.
  }

  return buildLocalRecord(form);
}

/**
 * Genera un registro local cuando POST no está disponible.
 *
 * Esto mantiene funcional el botón
 * "Guardar observación" durante el MVP.
 */
function buildLocalRecord(form: FieldObservationForm): FieldNotebookRecord {
  return {
    id: `notebook-local-${Date.now()}`,
    createdAt: new Date(form.date).toISOString(),
    responsible: form.responsible,
    fieldId: "field-001",
    zoneId: form.zoneId,
    cropType: form.cropType,
    eventType: mapActionToEventType(form.action),
    evidenceCount: 0,
    note: form.observation,
  };
}

/**
 * Convierte la acción del formulario
 * al tipo de evento que usa el historial.
 */
function mapActionToEventType(action: FieldObservationForm["action"]): FieldNotebookRecord["eventType"] {
  if (action === "IRRIGATION") return "IRRIGATION";
  if (action === "FERTILIZATION") return "FERTILIZATION";
  if (action === "PEST_CONTROL") return "PEST_CONTROL";

  return "INSPECTION";
}

/**
 * Devuelve nuevas referencias para evitar
 * que la UI modifique directamente el fallback base.
 */
function cloneFallbackData(): FieldNotebookData {
  return {
    ...fieldNotebookFallback,
    records: [...fieldNotebookFallback.records],
    linkedItems: [...fieldNotebookFallback.linkedItems],
    evidenceFiles: [...fieldNotebookFallback.evidenceFiles],
  };
}
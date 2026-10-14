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


/**
 * =========================================
 * AgroVision - Field Notebook Service
 * =========================================
 *
 * Lectura:
 * PostgreSQL -> Prisma -> Express -> NotebookPage
 *
 * Transforma las entradas persistidas al
 * formato de la interfaz existente.
 *
 * No utiliza registros simulados para GET.
 */

import { API_ENDPOINTS } from "../../../shared/api/endpoints";
import { apiGet } from "../../../shared/api/apiClient";

import type {
  ApiResponse,
  FieldNotebookData,
  FieldNotebookRecord,
  FieldNotebookEventType,
  FieldObservationForm,
  FieldNotebookEvidenceFile,
} from "../types/fieldNotebook.types";

/**
 * Contrato de entrada del backend.
 *
 * El campo cropType procede de la relación
 * real con la tabla crops.
 */
interface PersistedNotebookEntry {
  readonly id: string;
  readonly fieldId: string;
  readonly zoneId: string;
  readonly cropId: string;
  readonly cropType: string;
  readonly activityType: string;
  readonly description: string;
  readonly problemObserved: string;
  readonly actionTaken: string;
  readonly responsibleUser: string;
  readonly createdAt: string;
  readonly evidence?: ReadonlyArray<{
    readonly id: string;
    readonly type: string;
    readonly description: string;
    readonly url?: string;
  }>;
}

const NOTEBOOK_ENDPOINT = API_ENDPOINTS.fieldNotebook;

/**
 * Comprueba la estructura mínima de una
 * entrada recibida desde PostgreSQL.
 */
function isPersistedEntry(
  value: unknown,
): value is PersistedNotebookEntry {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const entry = value as Record<string, unknown>;

  return (
    typeof entry.id === "string" &&
    typeof entry.fieldId === "string" &&
    typeof entry.zoneId === "string" &&
    typeof entry.cropId === "string" &&
    typeof entry.cropType === "string" &&
    typeof entry.activityType === "string" &&
    typeof entry.description === "string" &&
    typeof entry.problemObserved === "string" &&
    typeof entry.actionTaken === "string" &&
    typeof entry.responsibleUser === "string" &&
    typeof entry.createdAt === "string" &&
    (
      entry.evidence === undefined ||
      Array.isArray(entry.evidence)
    )
  );
}

/**
 * Adapta categorías adicionales de la BD
 * a los cuatro tipos visuales soportados
 * actualmente por NotebookPage.
 */
function mapEventType(
  activityType: string,
): FieldNotebookEventType {
  switch (activityType) {
    case "IRRIGATION":
      return "IRRIGATION";

    case "FERTILIZATION":
    case "SOIL_CORRECTION":
      return "FERTILIZATION";

    case "PEST_CONTROL":
    case "DISEASE_CONTROL":
      return "PEST_CONTROL";

    case "INSPECTION":
      return "INSPECTION";

    default:
      return "INSPECTION";
  }
}

function isDirectEventType(
  activityType: string,
): boolean {
  return [
    "IRRIGATION",
    "FERTILIZATION",
    "PEST_CONTROL",
    "INSPECTION",
  ].includes(activityType);
}

/**
 * Convierte una entrada real en una fila
 * compatible con la tabla del Cuaderno.
 */
function adaptNotebookEntry(
  entry: PersistedNotebookEntry,
): FieldNotebookRecord {
  const eventType = mapEventType(entry.activityType);

  const details = [
    entry.description,
    entry.problemObserved,
    entry.actionTaken,
  ]
    .map((value) => value.trim())
    .filter(Boolean);

  const note = details.join(" | ");

  // Cuando la UI no tiene una categoría específica,
  // conservamos el código original en la descripción.
  const normalizedNote = isDirectEventType(entry.activityType)
    ? note
    : `[${entry.activityType}] ${note}`;

  return {
    id: entry.id,
    createdAt: entry.createdAt,
    responsible: entry.responsibleUser,
    fieldId: entry.fieldId,
    zoneId: entry.zoneId,
    cropType: entry.cropType,
    eventType,
    evidenceCount: entry.evidence?.length ?? 0,
    note: normalizedNote || "Sin descripción registrada.",
  };
}

/**
 * Utiliza únicamente archivos que realmente
 * tengan metadatos en la respuesta.
 */
function collectEvidenceFiles(
  entries: ReadonlyArray<PersistedNotebookEntry>,
): FieldNotebookEvidenceFile[] {
  const files: FieldNotebookEvidenceFile[] = [];

  for (const entry of entries) {
    for (const item of entry.evidence ?? []) {
      if (
        item.type !== "image" &&
        item.type !== "document"
      ) {
        continue;
      }

      files.push({
        id: item.id,
        type: item.type === "image" ? "IMAGE" : "PDF",
        name: item.description || "Archivo adjunto",
        sizeLabel: "Tamaño no disponible",
        previewUrl: item.url ?? null,
      });
    }
  }

  return files;
}

/**
 * GET /api/field-notebook
 *
 * Construye los datos de la pantalla a
 * partir de los registros de PostgreSQL.
 */
export async function getFieldNotebookData():
  Promise<FieldNotebookData> {
  const response = await apiGet<unknown>(
    NOTEBOOK_ENDPOINT,
  );

  if (
    !Array.isArray(response) ||
    !response.every(isPersistedEntry)
  ) {
    throw new Error(
      "El Cuaderno de campo devolvió un contrato inválido.",
    );
  }

  const entries = [...response].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime(),
  );

  const records = entries.map(adaptNotebookEntry);

  const pendingObservations = entries.filter(
    (entry) =>
      /pendiente|pending/i.test(
        `${entry.description} ${entry.actionTaken}`,
      ),
  ).length;

  const appliedActions = entries.filter(
    (entry) =>
      entry.actionTaken.trim().length > 0 &&
      !/pendiente|pending/i.test(entry.actionTaken),
  ).length;

  const registeredZones = new Set(
    entries.map(
      (entry) => `${entry.fieldId}:${entry.zoneId}`,
    ),
  ).size;

  const registeredEvidence = entries.reduce(
    (total, entry) =>
      total + (entry.evidence?.length ?? 0),
    0,
  );

  return {
    totalRecords: records.length,
    pendingObservations,
    appliedActions,
    registeredZones,
    registeredEvidence,
    records,

    // Sin asociaciones persistidas expuestas
    // por el endpoint actual.
    linkedItems: [],

    evidenceFiles: collectEvidenceFiles(entries),
  };
}

/**
 * =========================================
 * Creación de observaciones (compatibilidad)
 * =========================================
 *
 * Se conserva la función utilizada por el
 * formulario actual.
 *
 * La lectura GET ya es real, pero la ruta POST
 * todavía debe implementarse para garantizar
 * que nuevas observaciones se guarden en Neon.
 */

export async function createFieldObservation(
  form: FieldObservationForm,
): Promise<FieldNotebookRecord> {
  try {
    const response = await fetch(NOTEBOOK_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
      const payload =
        (await response.json()) as ApiResponse<FieldNotebookRecord>;

      if (payload.success && payload.data) {
        return payload.data;
      }
    }
  } catch {
    // Conserva compatibilidad con el flujo local
    // hasta implementar la persistencia de POST.
  }

  return {
    id: `notebook-local-${Date.now()}`,
    createdAt: new Date(form.date).toISOString(),
    responsible: form.responsible,
    fieldId: "field-001",
    zoneId: form.zoneId,
    cropType: form.cropType,
    eventType: mapEventType(form.action),
    evidenceCount: 0,
    note: `[Sin sincronizar con PostgreSQL] ${form.observation}`,
  };
}

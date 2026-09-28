/**
 * =========================================
 * Field Notebook Types
 * =========================================
 *
 * Tipos utilizados exclusivamente por la interfaz
 * del Cuaderno de campo.
 *
 * La página no trabaja con objetos arbitrarios:
 * todos los registros, vínculos y evidencias
 * utilizan estas estructuras.
 */

export type FieldNotebookSeverity = "LOW" | "MEDIUM" | "HIGH";
export type FieldNotebookAction = "INSPECTION" | "IRRIGATION" | "FERTILIZATION" | "MONITORING" | "PEST_CONTROL";
export type FieldNotebookEventType = "INSPECTION" | "IRRIGATION" | "FERTILIZATION" | "PEST_CONTROL";
export type LinkedItemPriority = "LOW" | "MEDIUM" | "HIGH";
export type EvidenceFileType = "IMAGE" | "PDF";

/**
 * Registro principal del historial de campo.
 */
export interface FieldNotebookRecord {
  readonly id: string;
  readonly createdAt: string;
  readonly responsible: string;
  readonly fieldId: string;
  readonly zoneId: string;
  readonly cropType: string;
  readonly eventType: FieldNotebookEventType;
  readonly evidenceCount: number;
  readonly note: string;
}

/**
 * Elemento relacionado con una alerta,
 * recomendación o reporte.
 */
export interface FieldNotebookLinkedItem {
  readonly id: string;
  readonly type: "ALERT" | "RECOMMENDATION" | "REPORT";
  readonly title: string;
  readonly zoneId: string;
  readonly priority: LinkedItemPriority;
  readonly createdAt: string;
}

/**
 * Archivo mostrado en la sección inferior.
 */
export interface FieldNotebookEvidenceFile {
  readonly id: string;
  readonly type: EvidenceFileType;
  readonly name: string;
  readonly sizeLabel: string;
  readonly previewUrl?: string | null;
}

/**
 * Datos agregados de la pantalla.
 */
export interface FieldNotebookData {
  readonly totalRecords: number;
  readonly pendingObservations: number;
  readonly appliedActions: number;
  readonly registeredZones: number;
  readonly registeredEvidence: number;
  readonly records: ReadonlyArray<FieldNotebookRecord>;
  readonly linkedItems: ReadonlyArray<FieldNotebookLinkedItem>;
  readonly evidenceFiles: ReadonlyArray<FieldNotebookEvidenceFile>;
}

/**
 * Valores manejados por el formulario.
 */
export interface FieldObservationForm {
  readonly cropType: string;
  readonly zoneId: string;
  readonly date: string;
  readonly observation: string;
  readonly severity: FieldNotebookSeverity;
  readonly action: FieldNotebookAction;
  readonly responsible: string;
}

/**
 * Estructura estándar de respuesta.
 */
export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data: T | null;
  readonly message?: string;
  readonly error?: string;
  readonly timestamp: string;
}
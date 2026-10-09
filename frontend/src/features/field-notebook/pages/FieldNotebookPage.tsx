/**
 * =========================================
 * FieldNotebookPage
 * =========================================
 *
 * Implementación basada en el frame oficial
 * del Cuaderno de campo en Figma.
 *
 * Conserva:
 * - fieldNotebookService;
 * - backend + fallback;
 * - creación de observaciones;
 * - tipos existentes.
 */

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { MetricCard } from "../../../shared/components/ui/MetricCard";
import { Panel } from "../../../shared/components/ui/Panel";
import { StatusBadge } from "../../../shared/components/ui/StatusBadge";
import {
  createFieldObservation,
  getFieldNotebookData,
} from "../services/fieldNotebookService";
import type {
  FieldNotebookData,
  FieldNotebookEventType,
  FieldNotebookRecord,
  FieldObservationForm,
  LinkedItemPriority,
} from "../types/fieldNotebook.types";
import "../field-notebook.css";
import bugIcon from "../../../assets/icons/bug-icon.svg";
import alertIcon from "../../../assets/icons/alert-icon.svg";
import cameraIcon from "../../../assets/icons/camera-icon.svg";
import infoIcon from "../../../assets/icons/info-icon.svg";
import locationIcon from "../../../assets/icons/location-icon.svg";
import plantIcon from "../../../assets/icons/plant-01-icon.svg";
import notebookIcon from "../../../assets/icons/notebook-icon.svg";
import uploadFileIcon from "../../../assets/icons/subirArchivo-icon.png";
import waterIcon from "../../../assets/icons/water-icon.svg";


const INITIAL_FORM: FieldObservationForm = {
  cropType: "ORANGE",
  zoneId: "zone-03",
  date: new Date().toISOString().slice(0, 10),
  observation: "",
  severity: "MEDIUM",
  action: "MONITORING",
  responsible: "Juan Pérez",
};

export function FieldNotebookPage() {
  const [notebookData, setNotebookData] = useState<FieldNotebookData | null>(
    null,
  );
  const [records, setRecords] = useState<ReadonlyArray<FieldNotebookRecord>>(
    [],
  );
  const [form, setForm] = useState<FieldObservationForm>(INITIAL_FORM);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  /**
   * Carga backend/fallback mediante service.
   */
  useEffect(() => {
    async function loadNotebook() {
      try {
        const data = await getFieldNotebookData();

        setNotebookData(data);
        setRecords(data.records);
      } finally {
        setIsLoading(false);
      }
    }

    void loadNotebook();
  }, []);

  /**
   * Orden descendente para mostrar primero
   * la actividad más reciente.
   */
  const sortedRecords = useMemo(() => {
    return [...records].sort(
      (first, second) =>
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime(),
    );
  }, [records]);

  /**
   * Control común de formulario.
   */
  function handleFieldChange(
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  /**
   * Registra observación.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.observation.trim()) {
      setFeedbackMessage("Describe la observación antes de guardar.");
      return;
    }

    setIsSaving(true);
    setFeedbackMessage(null);

    try {
      const createdRecord = await createFieldObservation(form);

      setRecords((currentRecords) => [createdRecord, ...currentRecords]);

      setForm((currentForm) => ({
        ...currentForm,
        observation: "",
      }));

      setFeedbackMessage("Observación registrada correctamente.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleResetForm() {
    setForm(INITIAL_FORM);
    setFeedbackMessage(null);
  }

  if (isLoading) {
    return (
      <section className="avState">
        <strong>Cargando Cuaderno de campo</strong>
      </section>
    );
  }

  if (!notebookData) {
    return (
      <section className="avState">
        <strong>No fue posible cargar el Cuaderno de campo</strong>
      </section>
    );
  }

  return (
    <section className="avScreen fieldNotebookFigma">
       <h1 className="avScreenTitle">Notebook</h1>
      {/* =====================================
          KPIS
          ===================================== */}

      <section className="avMetricGrid">
        <MetricCard
          title="Registros recientes"
          value="100%"
          description={`${records.length} actividades registradas.`}
          progress={100}
          actionLabel="Ver todos los registros"
        />

        <MetricCard
          title="Observaciones pendientes"
          value="25%"
          description="Requiere seguimiento."
          progress={25}
          tone="AMBER"
          showRing
          actionLabel="Ver listado completo"
        />

        <MetricCard
          title="Acciones aplicadas"
          value="75%"
          description="Intervenciones documentadas."
          progress={75}
          tone="TEAL"
          showRing
          actionLabel="Ver intervenciones"
        />
      </section>

      {/* =====================================
          FORMULARIO + SIDEBAR
          ===================================== */}

      <section className="fieldNotebookFigma__workspace">
        <Panel title="Nueva observación" showInfo={false}>
          <form className="fieldNotebookForm" onSubmit={handleSubmit}>
            <div className="fieldNotebookForm__three">
              <NotebookField label="Cultivo *">
                <select
                  name="cropType"
                  value={form.cropType}
                  onChange={handleFieldChange}
                >
                  <option value="CORN">Maíz</option>
                  <option value="ORANGE">Naranjo</option>
                  <option value="RED_BEAN">Frijol rojo</option>
                  <option value="CASSAVA">Yuca</option>
                  <option value="SORGHUM">Sorgo</option>
                </select>
              </NotebookField>

              <NotebookField label="Zona *">
                <select
                  name="zoneId"
                  value={form.zoneId}
                  onChange={handleFieldChange}
                >
                  <option value="zone-03">Zona 03</option>
                  <option value="zone-02">Zona 02</option>
                  <option value="zone-01">Zona 01</option>
                </select>
              </NotebookField>

              <NotebookField label="Fecha *">
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleFieldChange}
                />
              </NotebookField>
            </div>

            <NotebookField label="Observación *">
              <textarea
                name="observation"
                value={form.observation}
                placeholder="Describe lo observado en el lote..."
                rows={3}
                onChange={handleFieldChange}
              />
            </NotebookField>

            <div className="fieldNotebookForm__three">
              <NotebookField label="Severidad">
                <select
                  name="severity"
                  value={form.severity}
                  onChange={handleFieldChange}
                >
                  <option value="LOW">Baja</option>
                  <option value="MEDIUM">Moderada</option>
                  <option value="HIGH">Alta</option>
                </select>
              </NotebookField>

              <NotebookField label="Acción tomada *">
                <select
                  name="action"
                  value={form.action}
                  onChange={handleFieldChange}
                >
                  <option value="MONITORING">Monitoreo</option>
                  <option value="INSPECTION">Inspección</option>
                  <option value="IRRIGATION">Riego</option>
                  <option value="FERTILIZATION">Fertilización</option>
                  <option value="PEST_CONTROL">Control de plagas</option>
                </select>
              </NotebookField>

              <NotebookField label="Responsable">
                <select
                  name="responsible"
                  value={form.responsible}
                  onChange={handleFieldChange}
                >
                  <option value="Juan Pérez">Juan Pérez</option>
                  <option value="María López">María López</option>
                  <option value="Ana Torres">Ana Torres</option>
                </select>
              </NotebookField>
            </div>

            <label className="fieldNotebookUpload">
              <span>
                <img src={uploadFileIcon} alt="" aria-hidden="true" />
              </span>

              <div>
                <strong>Arrastra y sube archivos aquí</strong>
                <small>Imágenes, documentos, notas, etc.</small>
              </div>

              <input type="file" multiple />
            </label>

            {feedbackMessage && (
              <p className="fieldNotebookFeedback">{feedbackMessage}</p>
            )}

            <div className="fieldNotebookForm__actions">
              <button
                type="button"
                className="fieldNotebookButton fieldNotebookButton--secondary avActionButton avActionButton--secondary"
                onClick={handleResetForm}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="fieldNotebookButton fieldNotebookButton--primary avActionButton"
                disabled={isSaving}
              >
                {isSaving ? "Guardando..." : "Guardar observación"}
              </button>
            </div>
          </form>
        </Panel>

        <aside className="fieldNotebookFigma__sidebar">
          <Panel title="Resumen del día" showInfo={false}>
            <div className="fieldDaySummary">
              <DaySummaryRow
                label="Registros totales"
                value={String(records.length)}
                icon={notebookIcon}
              />
              <DaySummaryRow
                label="Zonas registradas"
                value={String(notebookData.registeredZones)}
                icon={locationIcon}
              />
              <DaySummaryRow
                label="Observaciones pendientes"
                value={String(notebookData.pendingObservations)}
                icon={alertIcon}
              />
              <DaySummaryRow
                label="Acciones aplicadas"
                value={String(notebookData.appliedActions)}
                icon={plantIcon}
              />
              <DaySummaryRow
                label="Evidencias registradas"
                value={String(notebookData.registeredEvidence)}
                icon={cameraIcon}
              />
            </div>
          </Panel>

          <Panel title="Atajos de registro" showInfo={false}>
            <div className="fieldNotebookShortcuts">
              <Shortcut label="Registrar inspección" icon={infoIcon} />
              <Shortcut label="Registrar riego" icon={waterIcon} />
              <Shortcut label="Registrar fertilización" icon={plantIcon} />
              <Shortcut label="Registrar control de plagas" icon={bugIcon} />
              <Shortcut
                label="Registrar control de enfermedades"
                icon={cameraIcon}
              />
            </div>
          </Panel>
        </aside>
      </section>

      {/* =====================================
          HISTORIAL + RELACIONES
          ===================================== */}

      <section className="fieldNotebookFigma__information">
        <Panel
          title="Historial de campo"
          showInfo={false}
          headerAction={
            <div className="fieldNotebookHistoryTools">
              <button type="button">▽ Filtrar</button>
              <select>
                <option>Todos</option>
              </select>
            </div>
          }
        >
          <div className="avTableWrap">
            <table className="avTable fieldNotebookHistoryTable">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Usuario</th>
                  <th>Zona</th>
                  <th>Tipo de evento</th>
                  <th>Evidencia</th>
                  <th>Nota</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {sortedRecords.slice(0, 5).map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.createdAt)}</td>
                    <td>{record.responsible}</td>
                    <td>{formatZone(record.zoneId)}</td>
                    <td>
                      <EventBadge eventType={record.eventType} />
                    </td>
                    <td>
                      <span className="fieldNotebookEvidenceCount">
                        <img src={cameraIcon} alt="" aria-hidden="true" />
                        {record.evidenceCount}
                      </span>
                    </td>
                    <td>{record.note}</td>
                    <td>›</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            className="avTextAction fieldNotebookCenteredAction avActionButton"
          >
            Ver todo el historial
          </button>
        </Panel>

        <Panel title="Relación con alertas y recomendaciones" showInfo={false}>
          <div className="fieldNotebookRelations">
            {notebookData.linkedItems.map((item) => (
              <article key={item.id} className="fieldNotebookRelation">
                <span
                  className={`fieldNotebookRelation__icon fieldNotebookRelation__icon--${item.priority.toLowerCase()}`}
                >
                  {/*'<img src={warningAlertIcon} alt="" />'*/}
                </span>

                <div>
                  <strong>{item.title}</strong>
                  <small>en {formatZone(item.zoneId)}</small>
                </div>

                <PriorityBadge priority={item.priority} />

                <time>{formatShortDate(item.createdAt)}</time>

                <b>›</b>
              </article>
            ))}
          </div>

          <button
            type="button"
            className="avTextAction fieldNotebookCenteredAction avActionButton"
          >
            Ver las vinculaciones
          </button>
        </Panel>
      </section>

      {/* =====================================
          ARCHIVOS
          ===================================== */}

      <Panel
        title="Archivos evidencia"
        showInfo={false}
        headerAction={
          <button type="button" className="avTextAction avActionButton">
            Ver todos los archivos
          </button>
        }
      >
        <div className="fieldEvidenceStrip">
          {notebookData.evidenceFiles.slice(0, 6).map((file) => (
            <article key={file.id} className="fieldEvidenceFile">
              <div
                className={`fieldEvidenceFile__preview fieldEvidenceFile__preview--${file.type.toLowerCase()}`}
              >
                {file.previewUrl && <img src={file.previewUrl} alt="" />}
                {file.type === "PDF" && <strong>PDF</strong>}
              </div>

              <div className="fieldEvidenceFile__copy">
                <span>{file.type === "PDF" ? "Doc PDF" : "Imagen"}</span>
                <strong>{file.name}</strong>
                <small>{file.sizeLabel}</small>
              </div>
            </article>
          ))}

          <label className="fieldEvidenceFile fieldEvidenceFile--add">
            <span>
              <img src={uploadFileIcon} alt="" aria-hidden="true" />
            </span>
            <strong>Subir más</strong>
            <small>evidencias</small>
            <input type="file" multiple />
          </label>
        </div>
      </Panel>
    </section>
  );
}

function NotebookField({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <label className="fieldNotebookField">
      <span>{label}</span>
      {children}
    </label>
  );
}

function DaySummaryRow({
  label,
  value,
  icon,
}: {
  readonly label: string;
  readonly value: string;
  readonly icon: string;
}) {
  return (
    <div className="fieldDaySummaryRow">
      <span>
        <img src={icon} alt="" aria-hidden="true" />
      </span>
      <strong>{label}</strong>
      <b>{value}</b>
    </div>
  );
}

function Shortcut({
  label,
  icon,
}: {
  readonly label: string;
  readonly icon: string;
}) {
  return (
    <button type="button" className="fieldNotebookShortcut">
      <span>
        <img src={icon} alt="" />
      </span>
      <strong>{label}</strong>
      <b>›</b>
    </button>
  );
}

function EventBadge({
  eventType,
}: {
  readonly eventType: FieldNotebookEventType;
}) {
  const tone =
    eventType === "INSPECTION"
      ? "SUCCESS"
      : eventType === "IRRIGATION"
        ? "INFO"
        : eventType === "PEST_CONTROL"
          ? "DANGER"
          : "WARNING";

  return <StatusBadge tone={tone}>{formatEventType(eventType)}</StatusBadge>;
}

function PriorityBadge({
  priority,
}: {
  readonly priority: LinkedItemPriority;
}) {
  const tone =
    priority === "HIGH"
      ? "DANGER"
      : priority === "MEDIUM"
        ? "WARNING"
        : "SUCCESS";

  return (
    <StatusBadge tone={tone}>
      {priority === "HIGH" ? "Alta" : priority === "MEDIUM" ? "Media" : "Baja"}
    </StatusBadge>
  );
}

function formatEventType(value: FieldNotebookEventType): string {
  if (value === "INSPECTION") return "Inspección";
  if (value === "IRRIGATION") return "Riego";
  if (value === "FERTILIZATION") return "Fertilización";

  return "Control de plagas";
}

function formatZone(value: string): string {
  return value.replace("zone-", "Zona ");
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-NI", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("es-NI", { dateStyle: "short" }).format(
    new Date(value),
  );
}

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { MetricCard } from "../../../shared/components/ui/MetricCard";
import { Panel } from "../../../shared/components/ui/Panel";
import { StatusBadge } from "../../../shared/components/ui/StatusBadge";
import { getAlertsData } from "../services/alertsService";
import type { AgriculturalAlert, AlertsData } from "../types/alerts.types";
import warningRedIcon from "../../../assets/icons/warning-red-icon.svg";
import checkIcon from "../../../assets/icons/check.png";
import temperatureIcon from "../../../assets/icons/termometro-icon.png";
import relojIcon from "../../../assets/icons/reloj-icon.png";
import sateliteIcon from "../../../assets/icons/satellite-icon.svg";
import aiBrainIcon from "../../../assets/icons/ai-brain-icon.svg";
import estreshidricoIcon from "../../../assets/icons/hidric-stress-icon.svg";
import historyImage1 from "../../../assets/images/image-mock-plant2.jpg";
import historyImage2 from "../../../assets/images/image-mock-plant3.png";
import historyImage3 from "../../../assets/images/image-mock-plant4.png";
import historyImage4 from "../../../assets/images/plagaDetectada.png";
import fieldReferenceImage from "../../../assets/images/parcelasCampoConcept.png";
import ndviReferenceImage from "../../../assets/images/image-mock-plant3.png";

//import locationIcon from "../../../assets/icons/location-icon.svg";

import "../alerts.css";

const HISTORY_IMAGES = [
  historyImage1,
  historyImage2,
  historyImage3,
  historyImage4,
];

export function AlertsPage() {
  const [alertsData, setAlertsData] = useState<AlertsData | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [fieldFilter, setFieldFilter] = useState("ALL");
  const [zoneFilter, setZoneFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [showAllHistory, setShowAllHistory] = useState(false);

  useEffect(() => {
    async function loadAlerts() {
      try {
        const data = await getAlertsData();

        setAlertsData(data);
        setSelectedAlertId(data.alerts[0]?.id ?? null);
      } catch {
        setErrorMessage("No se pudieron cargar las alertas.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadAlerts();
  }, []);

  const selectedAlert = useMemo(() => {
    return (
      alertsData?.alerts.find((alert) => alert.id === selectedAlertId) ??
      alertsData?.alerts[0] ??
      null
    );
  }, [alertsData, selectedAlertId]);

  const filteredAlerts = useMemo(() => {
    if (!alertsData) return [];

    return alertsData.alerts
      .filter((alert) => {
        const matchesSeverity =
          severityFilter === "ALL" || alert.severity === severityFilter;
        const matchesField =
          fieldFilter === "ALL" || alert.fieldId === fieldFilter;
        const matchesZone = zoneFilter === "ALL" || alert.zoneId === zoneFilter;
        const matchesStatus =
          statusFilter === "ALL" || alert.status === statusFilter;
        const matchesSource =
          sourceFilter === "ALL" ||
          alert.evidence.some((evidence) => evidence.source === sourceFilter);

        return (
          matchesSeverity &&
          matchesField &&
          matchesZone &&
          matchesStatus &&
          matchesSource
        );
      })
      .sort((first, second) => {
        const dateDelta =
          new Date(first.createdAt).getTime() -
          new Date(second.createdAt).getTime();
        return sortOrder === "newest" ? -dateDelta : dateDelta;
      });
  }, [
    alertsData,
    fieldFilter,
    severityFilter,
    sortOrder,
    sourceFilter,
    statusFilter,
    zoneFilter,
  ]);

  function clearFilters() {
    setSeverityFilter("ALL");
    setFieldFilter("ALL");
    setZoneFilter("ALL");
    setStatusFilter("ALL");
    setSourceFilter("ALL");
    setSortOrder("newest");
  }

  if (isLoading)
    return (
      <section className="avState">
        <strong>Cargando alertas</strong>
      </section>
    );
  if (errorMessage || !alertsData)
    return (
      <section className="avState">
        <strong>{errorMessage}</strong>
      </section>
    );

  const resolved = alertsData.alerts.filter(
    (alert) => alert.status === "RESOLVED",
  ).length;
  const totalAlerts = alertsData.alerts.length;
  const activeProgress =
    totalAlerts > 0 ? (alertsData.totalActive / totalAlerts) * 100 : 0;
  const criticalProgress =
    alertsData.totalActive > 0
      ? (alertsData.totalCritical / alertsData.totalActive) * 100
      : 0;
  const resolvedProgress = totalAlerts > 0 ? (resolved / totalAlerts) * 100 : 0;

  return (
    <section className="avScreen alertsFigma">
      <header className="alertsHeading">
        <span className="alertsHeading__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
          </svg>
        </span>
        <div>
          <h1 className="avScreenTitle">Panel de alertas</h1>
          <p>
            Monitorea, analiza y actúa sobre los eventos críticos de tus
            cultivos.
          </p>
        </div>
      </header>

      <section className="avMetricGrid">
        <div
          className="alertsMetricWrap"
          style={ringProgressStyle(activeProgress)}
        >
          <MetricCard
            title="Alertas activas"
            value={alertsData.totalActive}
            description="Alertas que requieren seguimiento."
            progress={activeProgress}
            showRing
            showDescriptionWithRing
            actionLabel="Ver todas las alertas"
          />
        </div>

        <div
          className="alertsMetricWrap"
          style={ringProgressStyle(criticalProgress)}
        >
          <MetricCard
            title="Críticas"
            value={alertsData.totalCritical}
            description="De las activas requieren atención inmediata."
            progress={criticalProgress}
            tone="AMBER"
            icon={<span aria-hidden="true">!</span>}
            showRing
            showDescriptionWithRing
            actionLabel="Ver las críticas"
          />
        </div>

        <div
          className="alertsMetricWrap"
          style={ringProgressStyle(resolvedProgress)}
        >
          <MetricCard
            title="Resueltas"
            value={resolved}
            description="Alertas cerradas correctamente."
            progress={resolvedProgress}
            tone="TEAL"
            showRing
            showDescriptionWithRing
            actionLabel="Ver resueltas"
          />
        </div>
      </section>

      <section
        className="avFilterBar alertsFilters"
        aria-label="Filtros de alertas"
      >
        <Filter
          label="Severidad"
          icon="severity"
          value={severityFilter}
          onChange={setSeverityFilter}
          options={[
            ["CRITICAL", "Crítica"],
            ["HIGH", "Alta"],
            ["MEDIUM", "Media"],
            ["LOW", "Baja"],
          ]}
        />
        <Filter
          label="Cultivo"
          icon="crop"
          value={fieldFilter}
          onChange={setFieldFilter}
          options={uniqueOptions(
            alertsData.alerts.map(
              (alert) => [alert.fieldId, alert.fieldId] as const,
            ),
          )}
        />
        <Filter
          label="Zona"
          icon="zone"
          value={zoneFilter}
          onChange={setZoneFilter}
          options={uniqueOptions(
            alertsData.alerts.flatMap((alert) =>
              alert.zoneId ? [[alert.zoneId, alert.zoneId] as const] : [],
            ),
          )}
        />
        <Filter
          label="Estado"
          icon="status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            ["ACTIVE", "Activa"],
            ["RESOLVED", "Resuelta"],
            ["IGNORED", "Ignorada"],
          ]}
        />
        <Filter
          label="Fuente"
          icon="source"
          value={sourceFilter}
          onChange={setSourceFilter}
          options={uniqueOptions(
            alertsData.alerts.flatMap((alert) =>
              alert.evidence.map(
                (evidence) =>
                  [evidence.source, formatSource(evidence.source)] as const,
              ),
            ),
          )}
        />

        <button
          type="button"
          className="alertsActionButton alertsClearButton"
          onClick={clearFilters}
        >
          <span aria-hidden="true">↻</span>
          Limpiar
        </button>
      </section>

      <section className="alertsFigma__workspace">
        <Panel
          className="alertsPanel alertsListPanel"
          title={<PanelTitle icon="list">Listado de alertas</PanelTitle>}
          headerAction={
            <div className="alertsToolbar">
              <label>
                <svg
                  className="alertsToolbar__sortIcon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M8 4v15m0 0-3-3m3 3 3-3M16 20V5m0 0-3 3m3-3 3 3" />
                </svg>
                Ordenar por
                <select
                  value={sortOrder}
                  onChange={(event) =>
                    setSortOrder(event.target.value as "newest" | "oldest")
                  }
                >
                  <option value="newest">{"M\u00e1s recientes"}</option>
                  <option value="oldest">{"M\u00e1s antiguas"}</option>
                </select>
              </label>
            </div>
          }
        >
          <div className="alertsFigma__list">
            {filteredAlerts.map((alert) => (
              <button
                key={alert.id}
                type="button"
                className={
                  selectedAlert?.id === alert.id
                    ? "alertListRow is-selected"
                    : "alertListRow"
                }
                onClick={() => setSelectedAlertId(alert.id)}
              >
                <span
                  className={`alertListRow__indicator alertListRow__indicator--${severityTone(alert)}`}
                >
                  <img src={warningRedIcon} alt="" />
                </span>
                <span className="alertListRow__copy">
                  <strong>{alert.title}</strong>
                  <small>{alert.message}</small>
                </span>
                <span
                  className={`alertListRow__type alertListRow__type--${severityTone(alert)}`}
                >
                  {formatAlertType(alert.type)}
                </span>
                <span className="alertListRow__zone">
                  {alert.zoneId ?? "—"}
                  <small>{alert.fieldId}</small>
                </span>

                <StatusBadge
                  tone={
                    alert.status === "RESOLVED"
                      ? "SUCCESS"
                      : alert.severity === "CRITICAL" ||
                          alert.severity === "HIGH"
                        ? "DANGER"
                        : "WARNING"
                  }
                >
                  {formatStatus(alert.status)}
                </StatusBadge>
                <b aria-hidden="true">›</b>
              </button>
            ))}
            {filteredAlerts.length === 0 && (
              <p className="alertsEmpty">
                No hay alertas que coincidan con estos filtros.
              </p>
            )}
          </div>

          <footer className="alertsPagination">
            Mostrando {filteredAlerts.length} de {alertsData.alerts.length}{" "}
            alertas
          </footer>
        </Panel>
        <Panel
          className="alertsPanel alertsDetailPanel alertsDetailPanel--expanded"
          title={<PanelTitle icon="detail">Detalle de la alerta</PanelTitle>}
          headerAction={
            <span className="alertsDetailPanel__counter">
              {Math.max(
                1,
                alertsData.alerts.findIndex(
                  (alert) => alert.id === selectedAlert?.id,
                ) + 1,
              )}{" "}
              de {alertsData.alerts.length}
            </span>
          }
        >
          {selectedAlert && <AlertDetail alert={selectedAlert} />}
        </Panel>
      </section>

      <Panel
        className="alertsPanel alertsHistoryPanel"
        title={
          <>
            <span className="relojIcon">
              <img src={relojIcon} alt="" />
            </span>
            Historial de alertas
          </>
        }
        headerAction={
          <button
            type="button"
            className="alertsActionButton alertsHistoryPanel__all"
            onClick={() => setShowAllHistory((showAll) => !showAll)}
          >
            {showAllHistory ? "Ver menos" : "Ver todos"}{" "}
            <span aria-hidden="true">⌄</span>
          </button>
        }
      >
        <div className="alertsHistory">
          {alertsData.alerts
            .slice(0, showAllHistory ? alertsData.alerts.length : 4)
            .map((alert, index) => (
              <div key={`history-${alert.id}`} className="alertsHistory__row">
                <span
                  className={`alertsHistory__marker alertsHistory__marker--${severityTone(alert)}`}
                >
                  <img
                    src={
                      index === 0
                        ? temperatureIcon
                        : alert.status === "RESOLVED"
                          ? checkIcon
                          : warningRedIcon
                    }
                    alt=""
                  />
                </span>
                <time>
                  <span>{formatDate(alert.createdAt)}</span>
                </time>
                <span className="alertsHistory__description">
                  <strong>{alert.title}</strong>
                  <small>{alert.message}</small>
                </span>
                <span className="alertsHistory__source">
                  {alert.evidence[0]?.source === "SATELLITE" && (
                    <img src={sateliteIcon} alt="" />
                  )}
                  {alert.evidence[0]?.source === "VISION" && (
                    <img src={aiBrainIcon} alt="" />
                  )}
                  {alert.evidence[0]?.source === "WEATHER" && (
                    <img
                      className="alertsHistory__hydricIcon"
                      src={estreshidricoIcon}
                      alt=""
                    />
                  )}
                  <span className="alertsHistory__sourceText">
                    <small>Fuente</small>
                    <span className="alertsHistory__sourceValue">
                      {formatSource(alert.evidence[0]?.source)}
                    </span>
                  </span>
                </span>
                <span
                  className={`alertsHistory__risk alertsHistory__risk--${riskLevel(alert.severity)}`}
                >
                  <span>{formatRisk(alert.severity)}</span>
                </span>
                <span className="alertsHistory__affected">Ver detalles</span>
                <span className="alertsHistory__image">
                  <img
                    src={HISTORY_IMAGES[index % HISTORY_IMAGES.length]}
                    alt={`Evidencia visual de ${alert.title}`}
                    loading="lazy"
                  />
                </span>
              </div>
            ))}
        </div>
      </Panel>
    </section>
  );
}

function AlertDetail({ alert }: { readonly alert: AgriculturalAlert }) {
  const recommendationItems = alert.recommendedAction
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);

  return (
    <div className="alertDetailExpanded">
      <section
        className={`alertDetailSummary alertDetailSummary--${riskLevel(alert.severity)}`}
      >
        <span className="alertDetailSummary__icon" aria-hidden="true">
          <img
            src={alert.status === "RESOLVED" ? checkIcon : warningRedIcon}
            alt=""
          />
        </span>
        <div className="alertDetailSummary__copy">
          <h3>{alert.title}</h3>
          <p>
            Detectada el {formatDateTime(alert.createdAt)}
            <span aria-hidden="true">•</span>
            {alert.zoneId ?? "Zona sin especificar"}
            <span aria-hidden="true">•</span>
            {alert.fieldId}
          </p>
          <div className="alertDetailSummary__tags">
            <span>{formatAlertType(alert.type)}</span>
            <span>{formatStatus(alert.status)}</span>
            <span>{formatSource(alert.evidence[0]?.source)}</span>
          </div>
        </div>
        <div className="alertDetailSummary__severity">
          <small>Nivel de riesgo</small>
          <strong>{formatRisk(alert.severity)}</strong>
          <span>{alert.severity}</span>
        </div>
      </section>

      <div className="alertDetailMain">
        <section className="alertDetailSection alertDetailMetrics">
          <h3>
            <span aria-hidden="true">◈</span>
            Métricas clave del lote
          </h3>
          {alert.evidence.length > 0 ? (
            <div className="alertDetailMetrics__grid">
              {alert.evidence.map((evidence) => (
                <article
                  className="alertMetric"
                  key={`${evidence.source}-${evidence.metric}`}
                >
                  <span className="alertMetric__icon" aria-hidden="true">
                    {evidenceIcon(evidence.metric)}
                  </span>
                  <strong>
                    {evidence.value == null
                      ? "—"
                      : `${String(evidence.value)}${evidence.unit ?? ""}`}
                  </strong>
                  <span>{formatMetricName(evidence.metric)}</span>
                  <small>{formatEvidenceStatus(evidence.status)}</small>
                </article>
              ))}
            </div>
          ) : (
            <p className="alertDetailEmpty">No hay métricas para esta alerta.</p>
          )}
        </section>

        <section className="alertDetailSection alertDetailViews">
          <h3>
            <span aria-hidden="true">▧</span>
            Vista del lote
          </h3>
          <div className="alertDetailViews__grid">
            <figure>
              <img
                src={fieldReferenceImage}
                alt="Vista referencial de parcelas agrícolas"
              />
              <figcaption>
                <strong>Vista del cultivo</strong>
                <small>Imagen de referencia · lote {alert.fieldId}</small>
              </figcaption>
            </figure>
            <figure>
              <img
                src={ndviReferenceImage}
                alt="Visualización referencial de vigor vegetal"
              />
              <figcaption>
                <strong>Vigor vegetal</strong>
                <small>Visualización de referencia</small>
              </figcaption>
            </figure>
          </div>
        </section>
      </div>

      <div className="alertDetailBottom">
        <section className="alertDetailSection alertInterpretation">
          <h3>
            <span aria-hidden="true">◉</span>
            Análisis e interpretación
          </h3>
          <p>{alert.message}</p>
          {alert.evidence.length > 0 && (
            <ul>
              {alert.evidence.map((evidence) => (
                <li key={`${evidence.source}-${evidence.metric}`}>
                  {evidence.explanation}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="alertDetailSection alertRecommendation">
          <h3>
            <span className="alertRecommendation__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M9 18h6m-5 3h4m-6-6a7 7 0 1 1 8 0c-1 1-1 2-1 3h-6c0-1 0-2-1-3Z" />
              </svg>
            </span>
            Acciones recomendadas
          </h3>
          <ol>
            {recommendationItems.map((item, index) => (
              <li key={`${index}-${item}`}>{item}</li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

function Filter({
  label,
  icon,
  value,
  options,
  onChange,
}: {
  readonly label: string;
  readonly icon: "severity" | "crop" | "zone" | "status" | "source";
  readonly value: string;
  readonly options: ReadonlyArray<readonly [string, string]>;
  readonly onChange: (value: string) => void;
}) {
  return (
    <div className="avFilterGroup">
      <label>
        <span className="alertsFilter__label">{label}</span>
        <span className="alertsFilter__selectWrap">
          <FilterIcon name={icon} />
          <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
          >
            <option value="ALL">Todos</option>
            {options
              .filter(([optionValue]) => optionValue !== "ALL")
              .map(([optionValue, optionLabel]) => (
                <option key={optionValue} value={optionValue}>
                  {optionLabel}
                </option>
              ))}
          </select>
        </span>
      </label>
    </div>
  );
}

function FilterIcon({
  name,
}: {
  readonly name: "severity" | "crop" | "zone" | "status" | "source";
}) {
  const shared = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  if (name === "severity")
    return (
      <svg {...shared}>
        <path d="m12 3 9 17H3L12 3Z" />
        <path d="M12 9v5m0 3h.01" />
      </svg>
    );
  if (name === "crop")
    return (
      <svg {...shared}>
        <path d="M20 4c-8 0-14 3-14 10a6 6 0 0 0 6 6c7 0 10-7 8-16Z" />
        <path d="M5 21c3-5 6-8 11-11" />
      </svg>
    );
  if (name === "zone")
    return (
      <svg {...shared}>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    );
  if (name === "status")
    return (
      <svg {...shared}>
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
      </svg>
    );
  return (
    <svg {...shared}>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5m-16 7v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" />
    </svg>
  );
}

function PanelTitle({
  icon,
  children,
}: {
  readonly icon: "list" | "detail" | "history";
  readonly children: string;
}) {
  return (
    <>
      <span
        className={`alertsPanelIcon alertsPanelIcon--${icon}`}
        aria-hidden="true"
      />
      <span>{children}</span>
    </>
  );
}

function ringProgressStyle(
  progress: number,
): CSSProperties & { "--alerts-ring-progress": string } {
  const normalizedProgress = Math.max(0, Math.min(progress, 100));
  return {
    "--alerts-ring-progress": `${normalizedProgress * 3.6}deg`,
  };
}

function uniqueOptions(
  options: ReadonlyArray<readonly [string, string]>,
): ReadonlyArray<readonly [string, string]> {
  return [...new Map(options).entries()];
}

function severityTone(alert: AgriculturalAlert): string {
  if (alert.status === "RESOLVED") return "resolved";
  if (alert.severity === "CRITICAL" || alert.severity === "HIGH")
    return "danger";

  return "warning";
}

function riskLevel(severity: AgriculturalAlert["severity"]): string {
  if (severity === "CRITICAL" || severity === "HIGH") return "high";
  if (severity === "MEDIUM") return "medium";
  return "low";
}

function formatRisk(severity: AgriculturalAlert["severity"]): string {
  const level = riskLevel(severity);
  return level === "high" ? "Alto" : level === "medium" ? "Medio" : "Bajo";
}

function formatAlertType(type: AgriculturalAlert["type"]): string {
  const labels: Record<AgriculturalAlert["type"], string> = {
    WATER_STRESS: "Estrés hídrico",
    FUNGAL_RISK: "Riesgo fúngico",
    LOW_VIGOR: "Bajo vigor",
    VISUAL_ANOMALY: "Anomalía visual",
    HEAT_STRESS: "Estrés térmico",
    SYSTEM: "Sistema",
  };
  return labels[type];
}

function formatSource(source?: string): string {
  const labels: Record<string, string> = {
    SATELLITE: "Satélite",
    SENSOR: "Sensor",
    VISION: "Visión AI",
    WEATHER: "Meteorología",
    HISTORY: "Historial",
    MANUAL: "Manual",
    MAPPING: "Mapping",
    SIMULATION: "Simulación",
  };
  return source ? (labels[source] ?? source) : "Sin fuente";
}

function formatStatus(status: AgriculturalAlert["status"]): string {
  if (status === "ACTIVE") return "Activa";
  if (status === "RESOLVED") return "Resuelta";
  return "Ignorada";
}

function evidenceIcon(metric: string): string {
  if (metric.toLowerCase().includes("moisture")) return "◉";
  if (metric.toLowerCase().includes("temperature")) return "♨";
  if (metric.toLowerCase().includes("ndvi")) return "♧";
  return "⌁";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-NI", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-NI", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMetricName(metric: string): string {
  const labels: Record<string, string> = {
    ndvi: "NDVI",
    soilMoisturePercentage: "Humedad del suelo",
    relativeHumidityPercentage: "Humedad relativa",
    temperatureCelsius: "Temperatura",
    prediction: "Predicción visual",
    previousIncidents: "Incidentes previos",
  };
  return labels[metric] ?? metric.replaceAll(/([a-z])([A-Z])/g, "$1 $2");
}

function formatEvidenceStatus(status: AgriculturalAlert["evidence"][number]["status"]): string {
  const labels: Record<typeof status, string> = {
    NORMAL: "Normal",
    WATCH: "En observación",
    WARNING: "Advertencia",
    CRITICAL: "Crítico",
  };
  return labels[status];
}

import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "../../../shared/components/ui/MetricCard";
import { Panel } from "../../../shared/components/ui/Panel";
import { StatusBadge } from "../../../shared/components/ui/StatusBadge";
import { getAlertsData } from "../services/alertsService";
import type { AgriculturalAlert, AlertsData } from "../types/alerts.types";
import warningRedIcon from "../../../assets/icons/warning-red-icon.svg";
import checkIcon from "../../../assets/icons/check.png";

import "../alerts.css";

export function AlertsPage() {
  const [alertsData, setAlertsData] = useState<AlertsData | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
  const resolvedProgress =
    totalAlerts > 0 ? (resolved / totalAlerts) * 100 : 0;

  return (
    <section className="avScreen alertsFigma">
      <section className="avMetricGrid">
        <MetricCard
          title="Alertas activas"
          value={alertsData.totalActive}
          description="Alertas que requieren seguimiento."
          progress={activeProgress}
          showRing
          showDescriptionWithRing
          actionLabel="Ver todas las alertas"
        />

        <MetricCard
          title="Críticas"
          value={alertsData.totalCritical}
          description="De las activas requieren atención inmediata."
          progress={criticalProgress}
          tone="AMBER"
          showRing
          showDescriptionWithRing
          actionLabel="Ver las críticas"
        />

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
      </section>

      <section className="avFilterBar">
        <Filter label="Severidad" />
        <Filter label="Cultivo" />
        <Filter label="Zona" />
        <Filter label="Estado" />
        <Filter label="Fuente" />

        <button type="button" className="alertsClearButton">
          ↻ Limpiar
        </button>
      </section>

      <section className="alertsFigma__workspace">
        <Panel title="Listado de alertas">
          <div className="alertsToolbar">
            <span />
            <label>
              Ordenar por{" "}
              <select>
                <option>Más recientes</option>
              </select>
            </label>
          </div>

          <div className="alertsFigma__list">
            {alertsData.alerts.map((alert) => (
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
                  <img className="imgWarningIcon" src={warningRedIcon} alt="" />
                </span>

                <strong>{alert.title}</strong>

                <span>{alert.zoneId ?? "—"}</span>

                <span>{formatDate(alert.createdAt)}</span>

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
                  {alert.status === "RESOLVED" ? "Resuelta" : "Activa"}
                </StatusBadge>

                <b>›</b>
              </button>
            ))}
          </div>

          <footer className="alertsPagination">
            <span>Mostrando {alertsData.alerts.length} alertas</span>

            <div>
              <button type="button">‹</button>
              <button type="button" className="is-active">
                1
              </button>
              <button type="button">›</button>
            </div>
          </footer>
        </Panel>

        <Panel title="Detalle de la alerta">
          {selectedAlert && <AlertDetail alert={selectedAlert} />}
        </Panel>
      </section>

      <Panel title="Historial de alertas">
        <div className="alertsHistory">
          {alertsData.alerts.slice(0, 5).map((alert) => (
            <div key={`history-${alert.id}`} className="alertsHistory__row">
              <img className="alertsHistory_dot" src={checkIcon} alt="Check" />
              <time>{formatDate(alert.createdAt)}</time>
              <p>{alert.message}</p>
              <small>Entidad afectada</small>
            </div>
          ))}
        </div>

        <button type="button" className="avTextAction alertsCenteredAction">
          Ver todo el historial →
        </button>
      </Panel>
    </section>
  );
}

function AlertDetail({ alert }: { readonly alert: AgriculturalAlert }) {
  return (
    <div className="alertDetail">
      <div className="alertDetail__evidence">
        {alert.evidence.map((evidence) => (
          <div
            key={`${evidence.source}-${evidence.metric}`}
            className="alertDetailRow"
          >
            <strong>{formatMetric(evidence.metric)}</strong>
            <span>
              {String(evidence.value ?? "—")} {evidence.unit ?? ""}
            </span>
          </div>
        ))}
      </div>

      <div className="alertImpact">
        <h3>Impacto potencial</h3>

        <div className="alertImpactRows">
          <ImpactRow
            label="Protección del rendimiento"
            value={alert.recommendedAction}
            tone="DANGER"
          />
          <ImpactRow
            label="Salud del cultivo"
            value={alert.message}
            tone="WARNING"
          />
          <ImpactRow
            label="Zonas vecinas"
            value={`Seguimiento de ${alert.zoneId ?? "zona"}`}
            tone="AMBER"
          />
        </div>
      </div>
    </div>
  );
}

function Filter({ label }: { readonly label: string }) {
  return (
    <div className="avFilterGroup">
      <label>{label}</label>

      <select>
        <option>Todos</option>
      </select>
    </div>
  );
}

function ImpactRow({
  label,
  value,
  tone,
}: {
  readonly label: string;
  readonly value: string;
  readonly tone: "DANGER" | "WARNING" | "AMBER";
}) {
  return (
    <div className="alertImpactRow">
      <span
        className={`alertImpactDot alertImpactDot--${tone.toLowerCase()}`}
      />
      <strong>{label}</strong>
      <p>{value}</p>
    </div>
  );
}

function severityTone(alert: AgriculturalAlert): string {
  if (alert.status === "RESOLVED") return "resolved";
  if (alert.severity === "CRITICAL" || alert.severity === "HIGH")
    return "danger";

  return "warning";
}

function formatMetric(value: string): string {
  return value.replaceAll("_", " ");
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-NI", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

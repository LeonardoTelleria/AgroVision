import { useEffect, useState } from "react";
import { MetricCard } from "../../../shared/components/ui/MetricCard";
import { Panel } from "../../../shared/components/ui/Panel";
import { StatusBadge } from "../../../shared/components/ui/StatusBadge";
import { getDashboardData } from "../services/dashboardService";
import type { DashboardData } from "../types/dashboard.types";
import "../dashboard.css";

export function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const data = await getDashboardData();

        setDashboardData(data);
        setErrorMessage(null);
      } catch {
        setErrorMessage("No fue posible cargar Dashboard.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();
  }, []);

  if (isLoading) {
    return <section className="avState"><strong>Cargando Dashboard</strong><p>Preparando inteligencia agrícola.</p></section>;
  }

  if (errorMessage || !dashboardData) {
    return <section className="avState"><strong>Dashboard no disponible</strong><p>{errorMessage}</p></section>;
  }

  const { summary } = dashboardData;
  const mainAlert = summary.alerts.criticalAlerts[0];
  const recommendation = summary.recommendations.mainRecommendation;
  const zoneId = summary.intelligence.mostAffectedZoneId ?? "zone-03";

  return (
    <section className="avScreen dashboardFigma">
      <h1 className="avScreenTitle">Resumen del cultivo</h1>

      <section className="avMetricGrid">
        <MetricCard title="Salud general" value={summary.healthScore} valueSuffix="/100" description="Salud moderada" progress={summary.healthScore} actionLabel="↑ +4 vs. semana anterior" />

        <MetricCard title="Alertas activas" value={summary.alerts.active} description={`${summary.alerts.critical} críticas · ${summary.alerts.warning} moderadas`} progress={Math.min(summary.alerts.active * 15, 100)} tone="AMBER" actionLabel="Ver todas las alertas" />

        <MetricCard title="Recomendaciones urgentes" value={summary.recommendations.urgent} description="Requieren atención" progress={Math.min(summary.recommendations.urgent * 24, 100)} tone="TEAL" actionLabel="Ver recomendaciones" />
      </section>

      <section className="dashboardFigma__main">
        <div className="dashboardFigma__left">
          <Panel title="Mapa / Zona crítica" showCardTag>
            <div className="dashboardMap">
              <div className="dashboardMap__legend">
                <strong>Leyenda</strong>
                <span><i className="legendDot legendDot--low" /> Bajo riesgo</span>
                <span><i className="legendDot legendDot--medium" /> Riesgo moderado</span>
                <span><i className="legendDot legendDot--high" /> Riesgo alto</span>
                <span><i className="legendLine" /> Límite del lote</span>
              </div>

              <div className="dashboardMap__zone">
                <strong>ZONA CRÍTICA</strong>
                <span>(Riesgo alto)</span>
              </div>

              <div className="dashboardMap__controls">
                <button type="button">+</button>
                <button type="button">−</button>
                <button type="button">{/* SVG center */}</button>
                <button type="button">{/* SVG layer */}</button>
              </div>

              <button type="button" className="dashboardMap__flight">{/* SVG drone */} Bajo aéreo</button>
            </div>
          </Panel>

          <div className="dashboardFigma__insights">
            <Panel title="Capa satelital simulada" showCardTag>
              <div className="satelliteMiniGrid">
                <SatelliteMetric label="NDVI" value={summary.vegetation.ndvi?.toFixed(2) ?? "—"} status={summary.vegetation.vigorLevel} />
                <SatelliteMetric label="NDWI" value="—" status="N/A" />
                <SatelliteMetric label="GNDVI" value="—" status="N/A" />
                <SatelliteMetric label="SAVI" value="—" status="N/A" />
              </div>

              <footer className="dashboardPanelFooter">
                <span>Última actualización: {formatTime(summary.lastUpdatedAt)}</span>
                <button className="avTextAction" type="button">Ver detalles →</button>
              </footer>
            </Panel>

            <Panel title="Zone Insight" showCardTag>
              <div className="zoneInsightRows">
                <InfoRow label="Zona" value={zoneId} />
                <InfoRow label="Score de riesgo" value={formatRisk(summary.intelligence.dominantRisk)} highlight />
                <InfoRow label="Evidencia principal" value={recommendation.evidence[0]?.source ?? "—"} />
                <InfoRow label="Acción sugerida" value={recommendation.suggestedAction} />
              </div>

              <button className="avTextAction zoneInsightAction" type="button">Ver detalle de la zona →</button>
            </Panel>
          </div>
        </div>

        <div className="dashboardFigma__right">
          <Panel title="Resumen prescriptivo" showCardTag>
            <div className="prescriptiveRows">
              <SummaryRow label="Riesgo dominante" value={formatRisk(summary.intelligence.dominantRisk)} badge="DANGER" />
              <SummaryRow label="Causa probable" value={summary.intelligence.prescriptiveSummary} />
              <SummaryRow label="Acción recomendada" value={recommendation.suggestedAction} />
              <SummaryRow label="Impacto esperado" value={recommendation.expectedImpact.description} />
            </div>
          </Panel>

          <Panel title="Alertas críticas" showCardTag>
            <div className="avCompactList">
              {summary.alerts.criticalAlerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="avCompactRow">
                  <div className="avCompactRow__main">
                    <span className="alertTriangle">△</span>

                    <div className="avCompactRow__copy">
                      <strong>{alert.title}</strong>
                    </div>
                  </div>

                  <StatusBadge tone={alert.severity === "CRITICAL" ? "DANGER" : "WARNING"}>{alert.severity === "CRITICAL" ? "Alto" : "Media"}</StatusBadge>
                </div>
              ))}
            </div>

            <button type="button" className="avTextAction dashboardCenteredAction">Ver todas las alertas →</button>
          </Panel>

          <Panel title="Evidencias" showCardTag>
            <ul className="dashboardEvidenceBullets">
              {recommendation.evidence.slice(0, 4).map((evidence) => (
                <li key={`${evidence.source}-${evidence.metric}`}>{evidence.explanation ?? `${evidence.metric}: ${String(evidence.value ?? "—")}`}</li>
              ))}
            </ul>

            <button type="button" className="avTextAction dashboardCenteredAction">Ver todas las evidencias →</button>
          </Panel>
        </div>
      </section>

      <section className="dashboardFigma__bottom">
        <Panel title="Actividad reciente">
          <div className="dashboardTimeline">
            {mainAlert && <TimelineItem time={formatTime(mainAlert.createdAt)} text={`Alerta crítica: ${mainAlert.title}`} status="Máxima" tone="DANGER" />}
            <TimelineItem time="Hoy" text="Nueva evidencia registrada" status="Sistema" tone="LIME" />
            <TimelineItem time="Ayer" text={`Recomendación generada: ${recommendation.suggestedAction}`} status="AgroVision AI" tone="INFO" />
            <TimelineItem time="Ayer" text="Registro de campo actualizado" status="Productor" tone="SUCCESS" />
          </div>

          <button type="button" className="avTextAction dashboardCenteredAction">Ver toda la actividad →</button>
        </Panel>

        <Panel title="Próximas acciones">
          <div className="nextActionList">
            <NextAction text={recommendation.suggestedAction} date="Hoy" priority="Alta" />
            <NextAction text={`Monitorear ${zoneId} en 48 h`} date="48 h" priority="Alta" />
            <NextAction text="Revisar trampas y muestreo de plagas" date="Próximo control" priority="Media" />
            <NextAction text="Registrar observaciones de campo" date="Pendiente" priority="Baja" />
          </div>

          <button type="button" className="avTextAction dashboardCenteredAction">Ver todas las acciones →</button>
        </Panel>
      </section>
    </section>
  );
}

function SatelliteMetric({ label, value, status }: { readonly label: string; readonly value: string; readonly status: string }) {
  return (
    <article className="satelliteMetric">
      <strong>{label}</strong>
      <b>{value}</b>
      <span>{status}</span>
      <div className="satelliteSparkline" />
      <small>Chart</small>
    </article>
  );
}

function InfoRow({ label, value, highlight = false }: { readonly label: string; readonly value: string; readonly highlight?: boolean }) {
  return (
    <div className="figmaInfoRow">
      <span>{label}</span>
      <strong className={highlight ? "is-highlighted" : ""}>{value}</strong>
    </div>
  );
}

function SummaryRow({ label, value, badge }: { readonly label: string; readonly value: string; readonly badge?: "DANGER" }) {
  return (
    <div className="prescriptiveRow">
      <span>{/* SVG */}</span>
      <strong>{label}</strong>
      {badge && <StatusBadge tone="DANGER">Alto</StatusBadge>}
      <p>{value}</p>
    </div>
  );
}

function TimelineItem({ time, text, status, tone }: { readonly time: string; readonly text: string; readonly status: string; readonly tone: "DANGER" | "LIME" | "INFO" | "SUCCESS" }) {
  return (
    <div className="dashboardTimeline__item">
      <span className="dashboardTimeline__point" />
      <time>{time}</time>
      <p>{text}</p>
      <StatusBadge tone={tone}>{status}</StatusBadge>
    </div>
  );
}

function NextAction({ text, date, priority }: { readonly text: string; readonly date: string; readonly priority: "Alta" | "Media" | "Baja" }) {
  return (
    <div className="nextAction">
      <input type="checkbox" aria-label={text} />
      <p>{text}</p>
      <span>{date}</span>
      <StatusBadge tone={priority === "Alta" ? "DANGER" : priority === "Media" ? "WARNING" : "SUCCESS"}>{priority}</StatusBadge>
    </div>
  );
}

function formatRisk(value: string): string {
  return value.replaceAll("_", " ");
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("es-NI", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
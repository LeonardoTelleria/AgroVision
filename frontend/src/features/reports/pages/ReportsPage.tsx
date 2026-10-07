import { useEffect, useState } from "react";
import { MetricCard } from "../../../shared/components/ui/MetricCard";
import { Panel } from "../../../shared/components/ui/Panel";
import { StatusBadge } from "../../../shared/components/ui/StatusBadge";
import { getPrescriptiveReportByZone } from "../services/reportsService";
import type { ReportsData } from "../types/reports.types";
import "../reports.css";

const DEFAULT_REPORT_ZONE_ID = "zone-03";

export function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadReport() {
      try {
        setData(await getPrescriptiveReportByZone(DEFAULT_REPORT_ZONE_ID));
      } catch {
        setErrorMessage("No fue posible cargar el reporte.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadReport();
  }, []);

  if (isLoading) return <section className="avState"><strong>Cargando reportes</strong></section>;
  if (!data || errorMessage) return <section className="avState"><strong>{errorMessage}</strong></section>;

  const report = data.report;

  return (
    <section className="avScreen reportsFigma">
       <h1 className="avScreenTitle">Reportes prescriptivos</h1>
      <section className="avMetricGrid">
        <MetricCard title="Reportes generados" value="1" description="Reporte prescriptivo disponible" progress={78} actionLabel="Ver todos los reportes" />

        <MetricCard title="Campos evaluados" value="1" description={report.fieldId} progress={53} tone="TEAL" actionLabel="Ver todos los campos" />

        <MetricCard title="Reportes pendientes" value={report.pendingActions.length} description="Acciones pendientes vinculadas" progress={20} tone="AMBER" actionLabel="Ver pendientes" />
      </section>

      <section className="reportsFigma__top">
        <Panel title="Reporte">
          <div className="reportModuleList">
            <ReportModule title="Estado del cultivo" description={report.summary} />
            <ReportModule title="Riesgos y alertas" description={`${report.activeAlerts.length} alertas activas`} />
            <ReportModule title="Recomendaciones" description={`${report.recommendations.length} recomendaciones agronómicas`} />
            <ReportModule title="Clima e histórico" description="Evidencia climática e histórica" />
            <ReportModule title="Monitoreo" description={`${report.evidence.length} evidencias registradas`} />
            <ReportModule title="Acciones" description={`${report.actionsTaken.length} acciones ejecutadas`} />
            <ReportModule title="Rendimiento estimado" description={`Salud general ${report.healthScore}/100`} />
          </div>
        </Panel>

        <div className="reportsFigma__side">
          <Panel title="Exportar">
            <div className="reportExportButtons">
              <button type="button">{/* SVG PDF */} Doc PDF</button>
              <button type="button">{/* SVG chart */} Resumen</button>
              <button type="button">{/* SVG share */} Compartir</button>
            </div>
          </Panel>

          <Panel title="Resumen del último reporte">
            <div className="reportSummaryRows">
              <ReportSummaryRow tone="SUCCESS" label="Estado" value="Reporte generado" />
              <ReportSummaryRow tone="WARNING" label="Riesgo" value={report.finalRiskLevel} />
              <ReportSummaryRow tone="INFO" label="Fecha" value={formatDate(report.createdAt)} />
              <ReportSummaryRow tone="NEUTRAL" label="Generado por" value="AgroVision AI" />
            </div>
          </Panel>
        </div>
      </section>

      <Panel title="Historial de reportes">
        <div className="avTableWrap">
          <table className="avTable">
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha</th>
                <th>Campo</th>
                <th>Cultivo</th>
                <th>Zona crítica</th>
                <th>Riesgo dominante</th>
                <th>Estado</th>
                <th>Generado por</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>{report.reportId}</td>
                <td>{formatDate(report.createdAt)}</td>
                <td>{report.fieldId}</td>
                <td>{report.cropType}</td>
                <td>{report.zoneId}</td>
                <td><StatusBadge tone={report.finalRiskLevel === "HIGH" || report.finalRiskLevel === "CRITICAL" ? "DANGER" : "WARNING"}>{report.finalRiskLevel}</StatusBadge></td>
                <td><StatusBadge tone="SUCCESS">Completado</StatusBadge></td>
                <td>AgroVision AI</td>
                <td><button type="button" className="reportIconButton">◉</button></td>
              </tr>
            </tbody>
          </table>
        </div>

        <button type="button" className="avTextAction reportsCenteredAction">Ver todos los reportes →</button>
      </Panel>

      <Panel title="Línea de tiempo de eventos">
        <div className="reportTimeline">
          <TimelineNode label="Reporte generado" date={formatDate(report.createdAt)} tone="SUCCESS" />
          <TimelineNode label="Alerta crítica detectada" date={report.activeAlerts[0] ? formatDate(report.activeAlerts[0].createdAt) : "—"} tone="WARNING" />
          <TimelineNode label="Datos actualizados" date={report.evidence[0]?.capturedAt ? formatDate(report.evidence[0].capturedAt) : "—"} tone="INFO" />
          <TimelineNode label="Monitoreo programado" date="Pendiente" tone="SUCCESS" />
        </div>
      </Panel>
    </section>
  );
}

function ReportModule({ title, description }: { readonly title: string; readonly description: string }) {
  return (
    <div className="reportModule">
      <span>{/* SVG */}</span>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

function ReportSummaryRow({ tone, label, value }: { readonly tone: "SUCCESS" | "WARNING" | "INFO" | "NEUTRAL"; readonly label: string; readonly value: string }) {
  return (
    <div className="reportSummaryRow">
      <i className={`reportSummaryDot reportSummaryDot--${tone.toLowerCase()}`} />
      <strong>{label}</strong>
      <span>{value}</span>
    </div>
  );
}

function TimelineNode({ label, date, tone }: { readonly label: string; readonly date: string; readonly tone: "SUCCESS" | "WARNING" | "INFO" }) {
  return (
    <article className={`reportTimelineNode reportTimelineNode--${tone.toLowerCase()}`}>
      <span />
      <strong>{date}</strong>
      <p>{label}</p>
    </article>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-NI", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
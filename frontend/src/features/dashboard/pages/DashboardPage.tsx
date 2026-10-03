import { useEffect, useState } from "react";

import { MetricCard } from "../../../shared/components/ui/MetricCard";
import { Panel } from "../../../shared/components/ui/Panel";
import { StatusBadge } from "../../../shared/components/ui/StatusBadge";

import { getDashboardData } from "../services/dashboardService";
import type { DashboardData } from "../types/dashboard.types";

import "../dashboard.css";

import warningAlertIcon from "../../../assets/icons/warning-icon.svg";
import bugIcon from "../../../assets/icons/bug-icon.svg";
import hidricStressIcon from "../../../assets/icons/hidric-stress-icon.svg";
import nitrogenIcon from "../../../assets/icons/nitrogen-icon.svg";
import irrigationIcon from "../../../assets/icons/water-icon.svg";
import protectionIcon from "../../../assets/icons/protection-icon.svg";
import infoIcon from '../../../assets/icons/info-icon2.svg'
import arrowRightIcon from '../../../assets/icons/arrow-icon.png'
import img1 from '../../../assets/images/image-mock-plant1.jfif'
import img2 from '../../../assets/images/image-mock-plant2.jpg'
import img3 from '../../../assets/images/image-mock-plant3.png'
import img4 from '../../../assets/images/image-mock-plant4.png'


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
    return (
      <section className="avState">
        <strong>Cargando Dashboard</strong>
        <p>Preparando inteligencia agrícola.</p>
      </section>
    );
  }

  if (errorMessage || !dashboardData) {
    return (
      <section className="avState">
        <strong>Dashboard no disponible</strong>
        <p>{errorMessage}</p>
      </section>
    );
  }

  const { summary } = dashboardData;
  const mainAlert = summary.alerts.criticalAlerts; // [0] si solo quiero mostrar una sola alerta
  const recommendation = summary.recommendations.mainRecommendation;
  const zoneId = summary.intelligence.mostAffectedZoneId ?? "zone-03";

  /* Datos de prueba para Salud general. */
  const saludDetails = [
    { label: "Excelente", value: "18%", color: "#22c55e" },
    { label: "Buena", value: "60%", color: "#a3e635" },
    { label: "Regular", value: "16%", color: "#eab308" },
    { label: "Mala", value: "6%", color: "#ef4444" },
  ];

  /* Datos de prueba para Alertas activas. */
  const alertasDetails = [
    { label: "Críticas", value: 2, color: "#ef4444" },
    { label: "Altas", value: 3, color: "#f97316" },
    { label: "Medias", value: 2, color: "#eab308" },
  ];

  /*
   * Diseño visual de las tres alertas con tipado explícito.
   * Cada posición corresponde a un icono diferente y metadatos de la maqueta.
   */
  const alertVisuals: Array<{
    icon: string;
    circleClass: string;
    subtitle: string;
    timeLabel: string;
  }> = [
    {
      icon: bugIcon, // Alta presión de plaga
      circleClass: "alertIconCircle alertIconCircle--bug",
      subtitle: "Lote 12A • Maíz",
      timeLabel: "Hoy, 08:15"
    },
    {
      icon: hidricStressIcon, // Estrés hídrico severo
      circleClass: "alertIconCircle alertIconCircle--water",
      subtitle: "Lote 7B • Soja",
      timeLabel: "Hoy, 07:40"
    },
    {
      icon: warningAlertIcon, // Riesgo de enfermedad
      circleClass: "alertIconCircle alertIconCircle--warning",
      subtitle: "Lote 3C • Trigo",
      timeLabel: "Ayer, 18:30"
    },
  ];

  /* Muestra como máximo tres alertas críticas. */
  const criticalAlerts = summary.alerts.criticalAlerts.slice(0, 3);

  return (
    <section className="avScreen dashboardFigma">
      <h1 className="avScreenTitle">Resumen del cultivo</h1>

      <section className="avMetricGrid">
        <MetricCard
          title="Salud general"
          value={summary.healthScore}
          valueSuffix="%"
          description="Salud moderada"
          progress={summary.healthScore}
          tone="LIME"
          details={saludDetails}
          subBadge={<span>vs. semana anterior <b style={{ color: "#22c55e" }}>↑ 6%</b></span>}
        />

        <MetricCard
          title="Alertas activas"
          value={summary.alerts.active}
          description="Requieren atención"
          tone="AMBER"
          details={alertasDetails}
          actionLabel="Ver todas las alertas"
        />

        <MetricCard
          title="Recomendaciones urgentes"
          value={summary.recommendations.urgent}
          description="pendientes"
          tone="TEAL"
          progress={90}
          icon={<span style={{ fontSize: "4.3rem" }}>🌱</span>}
          actionLabel="Ver recomendaciones"
        />
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

              <button type="button" className="dashboardMap__flight">
                {/* SVG drone */}
                Bajo aéreo
              </button>
            </div>
          </Panel>

          <div className="dashboardFigma__insights">
            <Panel title="Capa satelital simulada" showCardTag>
              <div className="satelliteMiniGrid">
                {/* <SatelliteMetric label="NDVI" value={summary.vegetation.ndvi?.toFixed(2) ?? "—"} status={summary.vegetation.vigorLevel} /> */}
                <SatelliteMetric label="NDVI" value="0.72" status={summary.vegetation.vigorLevel} />
                <SatelliteMetric label="NDWI" value="0.45" status="↑ 0.03" />
                <SatelliteMetric label="GNDVI" value="0.38" status="↑ 0.04" />
                <SatelliteMetric label="SAVI" value="0.61" status="↑ 0.02" />
              </div>

              <footer className="dashboardPanelFooter">
                {/* <span className="avFooterMetaText">Última actualización: {formatTime(summary.lastUpdatedAt)}</span> */}
                <span className="avFooterMetaText">Imágenes: Sentinel-2 • 18 May 2025</span>
                <button className="avTextAction" type="button">Ver detalles</button>
              </footer>
            </Panel>

            {/* <Panel title="Zone Insight" showCardTag>
              <div className="zoneInsightRows">
                <InfoRow label="Zona" value={zoneId} />
                <InfoRow label="Score de riesgo" value={formatRisk(summary.intelligence.dominantRisk)} highlight />
                <InfoRow label="Evidencia principal" value={recommendation.evidence[0]?.source ?? "—"} />
                <InfoRow label="Acción sugerida" value={recommendation.suggestedAction} />
              </div>
              <button className="avTextAction zoneInsightAction" type="button">Ver detalle de la zona →</button>
            </Panel> */}

            <Panel title="Zone Insight" showCardTag>
              <div className="zoneInsightRows">
                <div className="avDonaMock">
                  <strong>3</strong>
                  <span>Zonas críticas</span>
                </div>
                <div className="zoneInsightRows avZoneInsightRowsExtended">
                  <InfoRow label="Total Zonas" value="18" />
                  <InfoRow label="Score de riesgo" value="5"/> {/* highlight activa el color de riesgo */}
                  <InfoRow label="Evidencia principal" value="10" />
                  <InfoRow label="Acción sugerida" value="3" />
                </div>

              </div>
              <footer className="dashboardPanelFooter justify-end" style={{ marginTop: '12px' }}>
                <button className="avTextAction" type="button">Ver insights</button>
              </footer>

            </Panel>

            {/* <Panel title="Evidencias show" showCardTag>
              <div className="avEvidenceGrid">
                {recommendation.evidence.slice(0, 4).map((evidence, index) => {
                  const localPics = [img1, img2, img3, img4];
                  const currentImage = localPics[index] || evidence.source; // Fallback a img1 si no hay suficiente evidencia

                  return (
                    <div 
                      key={`${evidence.source}-${evidence.metric}`}
                      className="avEvidenceItem"
                      style={{ backgroundImage: currentImage ?`url(${currentImage})` : "linear-gradient(135deg, #15803d 0%, #166534 100%)"}}
                      title={`${evidence.source}: ${evidence.metric}`}
                      />
                  );
                })}
              </div>

              <footer className="dashboardPanelFooter justify-end" style={{ marginTop: '12px' }}>
                <button className="avTextAction" type="button">Ver todas</button>
              </footer>
            </Panel> */}
                        <Panel title="Evidencias" showCardTag>
              <div className="avEvidenceGrid">
                {/* 
                  Creamos un arreglo estático con tus 4 referencias locales.
                  Esto garantiza que el bucle itere exactamente 4 veces pase lo que pase con los datos externos.
                */}
                {[img1, img2, img3, img4].map((currentImage, index) => {
                  // Extraemos datos de soporte del servidor si existen en esa posición
                  const evidenceData = recommendation.evidence[index];
                  
                  return (
                    <div 
                      key={evidenceData ? `${evidenceData.source}-${index}` : `fallback-pic-${index}`}
                      className="avEvidenceItem"
                      style={{ 
                        // Forzamos el uso de tu imagen local importada. Si no existe, aplica el gradiente.
                        backgroundImage: currentImage 
                          ? `url(${currentImage})` 
                          : "linear-gradient(135deg, #15803d 0%, #166534 100%)"
                      }}
                      title={evidenceData ? `${evidenceData.source}: ${evidenceData.metric}` : "Evidencia de campo"}
                    />
                  );
                })}
              </div>

              <footer className="dashboardPanelFooter justify-end" style={{ marginTop: '12px' }}>
                <button className="avTextAction" type="button">Ver todas →</button>
              </footer>
            </Panel>


          </div>
        </div>

        {/* <div className="dashboardFigma__right">
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
              {criticalAlerts.map((alert, index) => {
                const visual = alertVisuals[index];

                return (
                  <div key={alert.id} className="avCompactRow">
                    <div className="avCompactRow__main">
                      <span className={visual.circleClass}>
                        <img src={visual.icon} alt="" className="alertIcon" />
                      </span>

                      <div className="avCompactRow__copy">
                        <strong>{alert.title}</strong>
                      </div>
                    </div>

                    <StatusBadge tone={alert.severity === "CRITICAL" ? "DANGER" : "WARNING"}>
                      {alert.severity === "CRITICAL" ? "Alto" : "Media"}
                    </StatusBadge>
                  </div>
                );
              })}
            </div>

            <button type="button" className="avTextAction dashboardCenteredAction">Ver todas las alertas →</button>
          </Panel>
        </div> */}
        <div className="dashboardFigma__right">
          
          {/* NUEVO DISEÑO DEL RESUMEN PRESCRIPTIVO */}
          <Panel 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '12px', alignItems: 'center' }}>
                <span>Resumen prescriptivo</span>
                <img src={infoIcon} alt="" className="avPanel__infoIcon" />   
                <button type="button" className="avPanelHeaderAction">Ver detalle</button>
              </div>
              
            } 
            showCardTag
          >
            <div className="avPrescriptiveModule">
              
              {/* FILA 1: NITRÓGENO */}
              <div className="avPrescriptiveRow">
                <div className="avPrescriptiveRow__left">
                  <span className="avPrescriptiveRow__circle avPrescriptiveRow__circle--green">
                    <img src={nitrogenIcon} alt="" />
                  </span>
                  <div className="avPrescriptiveRow__meta">
                    <strong>Nitrógeno</strong>
                    <span className="action-tag">Aplicar</span>
                  </div>
                </div>
                <div className="avPrescriptiveRow__right">
                  <span className="primary-value">32 <small>kg/ha</small></span>
                  <span className="secondary-value percent-up">+12% vs. rec. base</span>
                </div>
              </div>

              {/* FILA 2: RIEGO */}
              <div className="avPrescriptiveRow">
                <div className="avPrescriptiveRow__left">
                  <span className="avPrescriptiveRow__circle avPrescriptiveRow__circle--blue">
                    <img src={irrigationIcon} alt="" />
                  </span>
                  <div className="avPrescriptiveRow__meta">
                    <strong>Riego</strong>
                    <span className="action-tag">Programar</span>
                  </div>
                </div>
                <div className="avPrescriptiveRow__right">
                  <span className="primary-value">18 <small>mm</small></span>
                  <span className="secondary-value">Próx. 48 h</span>
                </div>
              </div>

              {/* FILA 3: PROTECCIÓN */}
              <div className="avPrescriptiveRow">
                <div className="avPrescriptiveRow__left">
                  <span className="avPrescriptiveRow__circle avPrescriptiveRow__circle--orange">
                    <img src={protectionIcon} alt="" />
                  </span>
                  <div className="avPrescriptiveRow__meta">
                    <strong>Protección</strong>
                    <span className="action-tag">Monitorear</span>
                  </div>
                </div>
                <div className="avPrescriptiveRow__right">
                  <span className="primary-value">2 <small>áreas</small></span>
                  <span className="secondary-value risk-high">Riesgo alto</span>
                </div>
              </div>

            </div>
          </Panel>

          {/* NUEVO DISEÑO OPERATIVO DE ALERTAS CRÍTICAS */}
          <Panel 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '12px', alignItems: 'center' }}>
                <span>Alertas críticas</span>
                <img src={infoIcon} alt="" className="avPanel__infoIcon" />   
                <button type="button" className="avPanelHeaderAction">Ver todas →</button>
              </div>
            } 
            showCardTag
          >
            <div className="avCompactList">
              {criticalAlerts.map((alert, index) => {
                const visual = alertVisuals[index] || alertVisuals[0];

                return (
                  <div key={alert.id} className="avCompactRow">
                    <div className="avCompactRow__main">
                      <span className={visual.circleClass}>
                        <img src={visual.icon} alt="" className="alertIcon" />
                      </span>

                      <div className="avCompactRow__copy">
                        <strong>{alert.title}</strong>
                        <span className="avCompactRow__subtitle">{visual.subtitle}</span>
                      </div>
                    </div>

                    <div className="avCompactRow__rightSide">
                      <time className="avCompactRow__time">{visual.timeLabel}</time>
                      <span className="avCompactRow__arrow">
                        <img src={arrowRightIcon} alt="flecha de dirección" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

        </div>
      </section>

      <section className="dashboardFigma__bottom">
        <Panel title="Actividad reciente">
          <div className="dashboardTimeline">
            {/* Recorremos las primeras 3 alertas críticas de la lista */}
            {mainAlert && mainAlert.slice(0, 3).map((alert) => (
              <TimelineItem 
                key={alert.id}
                time={formatTime(alert.createdAt)} 
                text={`Alerta crítica: ${alert.title}`} 
                status="Máxima" 
                tone="DANGER" 
              />
            ))}
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


/* ===========================================================
   COMPONENTE — MÉTRICA SATELITAL
   =========================================================== */

function SatelliteMetric({
  label,
  value,
  status,
}: {
  readonly label: string;
  readonly value: string;
  readonly status: string;
}) {
  return (
    <article className="satelliteMetric">
      <strong>{label}</strong>
      <b>{value}</b>
      <span>{status}</span>
      <div className="satelliteSparkline" />
    
    </article>
  );
}


/* ===========================================================
   COMPONENTE — FILA DE INFORMACIÓN
   =========================================================== */

function InfoRow({
  label,
  value,
  highlight = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly highlight?: boolean;
}) {
  return (
    <div className="figmaInfoRow" style={{display: "flex", justifyContent: "flex-start"}}> 
      <span>{label}</span>
      <strong className={highlight ? "is-highlighted" : ""}>{value}</strong>
    </div>
  );
}


/* ===========================================================
   COMPONENTE — FILA PRESCRIPTIVA
   =========================================================== */

function SummaryRow({
  label,
  value,
  badge,
}: {
  readonly label: string;
  readonly value: string;
  readonly badge?: "DANGER";
}) {
  return (
    <div className="prescriptiveRow">
      <span>{/* SVG */}</span>
      <strong>{label}</strong>
      {badge && <StatusBadge tone="DANGER">Alto</StatusBadge>}
      <p>{value}</p>
    </div>
  );
}


/* ===========================================================
   COMPONENTE — TIMELINE
   =========================================================== */

function TimelineItem({
  time,
  text,
  status,
  tone,
}: {
  readonly time: string;
  readonly text: string;
  readonly status: string;
  readonly tone: "DANGER" | "LIME" | "INFO" | "SUCCESS";
}) {
  return (
    <div className="dashboardTimeline__item">
      <span className="dashboardTimeline__point" />
      <time>{time}</time>
      <p>{text}</p>
      <StatusBadge tone={tone}>{status}</StatusBadge>
    </div>
  );
}


/* ===========================================================
   COMPONENTE — PRÓXIMA ACCIÓN
   =========================================================== */

function NextAction({
  text,
  date,
  priority,
}: {
  readonly text: string;
  readonly date: string;
  readonly priority: "Alta" | "Media" | "Baja";
}) {
  return (
    <div className="nextAction">
      <input type="checkbox" aria-label={text} />
      <p>{text}</p>
      <span>{date}</span>
      <StatusBadge tone={priority === "Alta" ? "DANGER" : priority === "Media" ? "WARNING" : "SUCCESS"}>{priority}</StatusBadge>
    </div>
  );
}


/* ===========================================================
   HELPERS
   =========================================================== */

function formatRisk(value: string): string {
  return value.replaceAll("_", " ");
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("es-NI", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}


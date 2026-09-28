import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "../../../shared/components/ui/MetricCard";
import { Panel } from "../../../shared/components/ui/Panel";
import { StatusBadge } from "../../../shared/components/ui/StatusBadge";
import { getRecommendationsData } from "../services/recommendationsService";
import type { Recommendation, RecommendationsData } from "../types/recommendations.types";
import "../recommendations.css";

export function RecommendationsPage() {
  const [data, setData] = useState<RecommendationsData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadRecommendations() {
      try {
        const result = await getRecommendationsData();

        setData(result);
        setSelectedId(result.mainRecommendation?.id ?? result.recommendations[0]?.id ?? null);
      } catch {
        setErrorMessage("No se pudieron cargar las recomendaciones.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadRecommendations();
  }, []);

  const selectedRecommendation = useMemo(() => {
    return data?.recommendations.find((item) => item.id === selectedId) ?? data?.mainRecommendation ?? null;
  }, [data, selectedId]);

  if (isLoading) return <section className="avState"><strong>Cargando recomendaciones</strong></section>;
  if (!data || errorMessage) return <section className="avState"><strong>{errorMessage}</strong></section>;

  const inProgress = data.recommendations.filter((item) => item.status === "IN_PROGRESS" || item.status === "PENDING").length;
  const completed = data.recommendations.filter((item) => item.status === "APPLIED").length;

  return (
    <section className="avScreen recommendationsFigma">
      <section className="avMetricGrid">
        <MetricCard title="Recomendaciones" value={data.recommendations.length} description="Total de recomendaciones" progress={82} actionLabel="Ver detalles" />

        <MetricCard title="En seguimiento" value={inProgress} description="En seguimiento" progress={55} tone="AMBER" actionLabel="Ver seguimiento" />

        <MetricCard title="Ejecutadas" value={completed} description="Ejecutadas esta campaña" progress={Math.min(completed * 10, 100)} tone="TEAL" actionLabel="Ver historial" />
      </section>

      <section className="recommendationsFigma__workspace">
        <Panel title="Recomendaciones priorizadas" headerAction={<button type="button" className="recommendationFilter">▽ Filtrar</button>}>
          <div className="recommendationPriorityList">
            {data.recommendations.map((recommendation) => (
              <button key={recommendation.id} type="button" className={selectedRecommendation?.id === recommendation.id ? "priorityRecommendation is-selected" : "priorityRecommendation"} onClick={() => setSelectedId(recommendation.id)}>
                <span className={`priorityRecommendation__icon priorityRecommendation__icon--${priorityTone(recommendation.priority)}`}>{/* SVG */}</span>

                <div className="priorityRecommendation__risk">
                  <strong>{formatPriority(recommendation.priority)}</strong>
                  <small>{recommendation.reason}</small>
                </div>

                <div>
                  <span>Acción sugerida</span>
                  <strong>{recommendation.suggestedAction}</strong>
                </div>

                <div>
                  <span>Impacto esperado</span>
                  <strong>{recommendation.expectedImpact.description}</strong>
                </div>

                <StatusBadge tone={recommendation.priority === "URGENT" || recommendation.priority === "HIGH" ? "DANGER" : recommendation.priority === "MEDIUM" ? "WARNING" : "SUCCESS"}>{formatPriority(recommendation.priority)}</StatusBadge>

                <b>›</b>
              </button>
            ))}
          </div>

          <button type="button" className="avTextAction recommendationCenteredAction">Ver todas las recomendaciones →</button>
        </Panel>

        <Panel title="Detalle de la recomendación">
          {selectedRecommendation && <RecommendationDetail recommendation={selectedRecommendation} />}
        </Panel>
      </section>

      <section className="recommendationsFigma__bottom">
        <Panel title="Impacto esperado">
          <div className="expectedImpactGrid">
            <ImpactMetric label="Protección del cultivo" value="+18%" helper="Mejora estimada" />
            <ImpactMetric label="Salud del cultivo" value="+15–20%" helper="Mejora estimada" />
            <ImpactMetric label="Rendimiento potencial" value="+8–12%" helper="Mejora estimada" />
            <ImpactMetric label="Eficiencia operativa" value="2.4 t CO₂e" helper="Por temporada" />
          </div>

          <button type="button" className="avTextAction recommendationCenteredAction">Ver análisis de impacto →</button>
        </Panel>

        <Panel title="Recomendaciones recientes">
          <div className="avTableWrap">
            <table className="avTable">
              <thead>
                <tr>
                  <th>Recomendación</th>
                  <th>Prioridad</th>
                  <th>Zona</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                </tr>
              </thead>

              <tbody>
                {data.recommendations.slice(0, 5).map((recommendation) => (
                  <tr key={`recent-${recommendation.id}`}>
                    <td>{recommendation.suggestedAction}</td>
                    <td>{formatPriority(recommendation.priority)}</td>
                    <td>{recommendation.zoneId ?? "—"}</td>
                    <td>{formatDate(recommendation.createdAt)}</td>
                    <td><StatusBadge tone={recommendation.status === "APPLIED" ? "SUCCESS" : "WARNING"}>{formatStatus(recommendation.status)}</StatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button type="button" className="avTextAction recommendationCenteredAction">Ver todas las recomendaciones recientes →</button>
        </Panel>
      </section>
    </section>
  );
}

function RecommendationDetail({ recommendation }: { readonly recommendation: Recommendation }) {
  return (
    <div className="recommendationDetail">
      <div className="recommendationDetail__top">
        <span className={`recommendationDetailIcon recommendationDetailIcon--${priorityTone(recommendation.priority)}`}>{/* SVG */}</span>

        <div>
          <strong>Riesgo</strong>
          <p>{recommendation.reason}</p>
        </div>

        <span>Prioridad</span>

        <StatusBadge tone={recommendation.priority === "HIGH" || recommendation.priority === "URGENT" ? "DANGER" : "WARNING"}>{formatPriority(recommendation.priority)}</StatusBadge>
      </div>

      <DetailSection label="Descripción" value={recommendation.reason} />
      <DetailSection label="Acción sugerida" value={recommendation.suggestedAction} />
      <DetailSection label="Impacto esperado" value={recommendation.expectedImpact.description} />

      <h3>Evidencia</h3>

      <div className="recommendationEvidenceMini">
        {recommendation.evidence.slice(0, 4).map((evidence) => (
          <div key={`${evidence.source}-${evidence.metric}`}>
            <span>{evidence.metric}</span>
            <strong>{String(evidence.value ?? "—")} {evidence.unit ?? ""}</strong>
            <small>{evidence.status}</small>
          </div>
        ))}
      </div>

      <button type="button" className="recommendationCompleteButton">✓ Marcar como ejecutada</button>
    </div>
  );
}

function DetailSection({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="recommendationDetailSection">
      <strong>{label}</strong>
      <p>{value}</p>
    </div>
  );
}

function ImpactMetric({ label, value, helper }: { readonly label: string; readonly value: string; readonly helper: string }) {
  return (
    <article className="impactMetric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  );
}

function priorityTone(value: Recommendation["priority"]): string {
  if (value === "URGENT" || value === "HIGH") return "danger";
  if (value === "MEDIUM") return "warning";

  return "success";
}

function formatPriority(value: Recommendation["priority"]): string {
  if (value === "URGENT") return "Crítica";
  if (value === "HIGH") return "Alta";
  if (value === "MEDIUM") return "Media";

  return "Baja";
}

function formatStatus(value: Recommendation["status"]): string {
  if (value === "APPLIED") return "Ejecutada";
  if (value === "IN_PROGRESS") return "En seguimiento";
  if (value === "PENDING") return "Pendiente";

  return "Descartada";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-NI", { dateStyle: "short" }).format(new Date(value));
}
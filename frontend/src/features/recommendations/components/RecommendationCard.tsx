/**
 * =========================================
 * RecommendationCard
 * =========================================
 *
 * Card visual para una recomendación prescriptiva.
 *
 * Finalidad:
 * - mostrar prioridad;
 * - explicar razón;
 * - mostrar acción sugerida;
 * - mostrar impacto esperado;
 * - mostrar evidencia asociada.
 */

import { ExpectedImpactBadge } from "./ExpectedImpactBadge";
import { RecommendationEvidenceList } from "./RecommendationEvidenceList";

import type { Recommendation } from "../types/recommendations.types";

interface RecommendationCardProps {
  readonly recommendation: Recommendation;
  readonly isMain?: boolean;
}

export function RecommendationCard({
  recommendation,
  isMain = false,
}: RecommendationCardProps) {
  const primaryRecommendation =
    recommendation.suggestedAction;

  return (
    <article
      className={
        isMain
          ? "recommendationCard recommendationCard--main"
          : "recommendationCard"
      }
    >
      {/* =====================================
          HEADER
          =====================================
          Resume prioridad, tipo de recomendación,
          razón principal y estado.
          ===================================== */}
      <header className="recommendationCard__header">
        <div>
          <p>{formatPriority(recommendation.priority)}</p>

          <h2>
            {isMain
              ? "Recomendación principal"
              : "Acción recomendada"}
          </h2>

          <span>{recommendation.reason}</span>
        </div>

        <strong>
          {formatStatus(recommendation.status)}
        </strong>
      </header>

      {/* =====================================
          ACCIÓN SUGERIDA
          ===================================== */}
      <section className="recommendationCard__action">
        <small>Acción sugerida</small>

        <p>{primaryRecommendation}</p>
      </section>

      {/* =====================================
          IMPACTO ESPERADO
          =====================================
          Se mantiene el componente existente.
          La visualización principal con Recharts
          pertenece a RecommendationsPage.
          ===================================== */}
      <ExpectedImpactBadge
        impact={recommendation.expectedImpact}
      />

      {/* =====================================
          METADATA
          ===================================== */}
      <section className="recommendationCard__meta">
        <span>
          Campo: {recommendation.fieldId}
        </span>

        <span>
          Zona: {recommendation.zoneId ?? "N/A"}
        </span>

        <span>
          Creada:{" "}
          {formatShortDate(
            recommendation.createdAt,
          )}
        </span>
      </section>

      {/* =====================================
          EVIDENCIA
          ===================================== */}
      <section className="recommendationCard__evidence">
        <h3>Evidencia</h3>

        <RecommendationEvidenceList
          evidence={recommendation.evidence}
        />
      </section>
    </article>
  );
}


/* ===========================================================
   HELPERS
   =========================================================== */

/**
 * Traduce visualmente la prioridad manteniendo intacto
 * el valor original proveniente del dominio.
 */
function formatPriority(
  value: Recommendation["priority"],
): string {
  if (value === "URGENT") return "Crítica";
  if (value === "HIGH") return "Alta";
  if (value === "MEDIUM") return "Media";

  return "Baja";
}


/**
 * Traduce visualmente el estado sin alterar
 * el contrato original Recommendation.
 */
function formatStatus(
  value: Recommendation["status"],
): string {
  if (value === "APPLIED") {
    return "Ejecutada";
  }

  if (value === "IN_PROGRESS") {
    return "En seguimiento";
  }

  if (value === "PENDING") {
    return "Pendiente";
  }

  return "Descartada";
}


/**
 * Formatea la fecha utilizando la configuración regional
 * utilizada por AgroVision.
 */
function formatShortDate(
  value: string,
): string {
  return new Intl.DateTimeFormat("es-NI", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
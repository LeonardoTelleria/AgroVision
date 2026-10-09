/**
 * =========================================
 * RecommendationEvidenceList
 * =========================================
 *
 * Lista visual de evidencia asociada a una recomendación.
 *
 * Finalidad:
 * - mostrar de dónde sale la recomendación;
 * - evidenciar métricas, fuente y estado;
 * - mantener trazabilidad técnica para demo;
 * - conservar coherencia visual con el módulo
 *   de detalle de recomendaciones.
 */

import type { EvidenceItem } from "../types/recommendations.types";

interface RecommendationEvidenceListProps {
  readonly evidence: ReadonlyArray<EvidenceItem>;
}

export function RecommendationEvidenceList({
  evidence,
}: RecommendationEvidenceListProps) {
  /**
   * Estado vacío.
   *
   * No se inventa información cuando la recomendación
   * todavía no tiene evidencia asociada.
   */
  if (evidence.length === 0) {
    return (
      <section
        className="recommendationEvidenceList"
        aria-label="Lista de evidencias"
      >
        <p className="recommendationEvidenceList__empty">
          No hay evidencia disponible.
        </p>
      </section>
    );
  }

  return (
    <section
      className="recommendationEvidenceList"
      aria-label="Lista de evidencias"
    >
      {evidence.map((item, index) => (
        <EvidenceItemCard
          key={`${item.source}-${item.metric}-${String(
            item.value ?? "none",
          )}-${index}`}
          evidence={item}
        />
      ))}
    </section>
  );
}


/* ===========================================================
   COMPONENTE — EVIDENCIA INDIVIDUAL
   =========================================================== */

/**
 * Representa una pieza concreta de evidencia.
 *
 * No transforma ni reemplaza los datos originales.
 * Únicamente normaliza el estado para aplicar una
 * clase visual compatible con recommendations.css.
 */
interface EvidenceItemCardProps {
  readonly evidence: EvidenceItem;
}

function EvidenceItemCard({
  evidence,
}: EvidenceItemCardProps) {
  const statusClass = normalizeEvidenceStatus(
    evidence.status,
  );

  return (
    <article
      className={`recommendationEvidenceItem recommendationEvidenceItem--${statusClass}`}
    >
      {/* =====================================
          FUENTE
          ===================================== */}
      <strong title={evidence.source}>
        {evidence.source}
      </strong>

      {/* =====================================
          MÉTRICA + VALOR
          ===================================== */}
      <span title={buildMetricLabel(evidence)}>
        {buildMetricLabel(evidence)}
      </span>

      {/* =====================================
          EXPLICACIÓN
          ===================================== */}
      <small>
        {evidence.explanation}
      </small>
    </article>
  );
}


/* ===========================================================
   HELPERS
   =========================================================== */

/**
 * Construye la etiqueta compacta de la métrica.
 *
 * Ejemplo:
 * ndvi: 0.42 index
 *
 * La unidad solo se muestra cuando existe.
 */
function buildMetricLabel(
  evidence: EvidenceItem,
): string {
  const value = String(
    evidence.value ?? "N/A",
  );

  const unit = evidence.unit
    ? ` ${evidence.unit}`
    : "";

  return `${evidence.metric}: ${value}${unit}`;
}


/**
 * Normaliza estados exclusivamente para CSS.
 *
 * Esto evita modificar el valor real recibido desde
 * el backend y garantiza clases seguras y consistentes.
 */
function normalizeEvidenceStatus(
  status: string,
): string {
  const normalizedStatus = status
    .trim()
    .toLowerCase()
    .replaceAll(" ", "-")
    .replaceAll("_", "-");

  if (
    normalizedStatus === "critical" ||
    normalizedStatus === "high"
  ) {
    return "critical";
  }

  if (
    normalizedStatus === "warning" ||
    normalizedStatus === "low"
  ) {
    return "warning";
  }

  if (
    normalizedStatus === "normal" ||
    normalizedStatus === "ok" ||
    normalizedStatus === "success"
  ) {
    return "normal";
  }

  return "warning";
}
/**
 * =========================================
 * CropProfileCard
 * =========================================
 *
 * Card reutilizable para representar el perfil
 * detallado de un cultivo.
 *
 * Finalidad:
 * - mostrar identidad agrícola;
 * - exponer focos de análisis;
 * - visualizar riesgos principales;
 * - listar métricas preferidas;
 * - mostrar una recomendación base.
 *
 * IMPORTANTE:
 * - no ejecuta lógica de backend;
 * - no modifica CropProfile;
 * - funciona únicamente como componente
 *   de presentación.
 */

import type { CropProfile } from "../types/cropProfile.types";

interface CropProfileCardProps {
  readonly cropProfile: CropProfile;
}

export function CropProfileCard({
  cropProfile,
}: CropProfileCardProps) {
  /**
   * Se mantiene la recomendación de inspección
   * como recomendación primaria del perfil.
   */
  const primaryRecommendation =
    cropProfile.recommendationTemplates.inspection;

  return (
    <article className="cropProfileCard">
      {/* =====================================
          CABECERA
          ===================================== */}
      <header className="cropProfileCard__header">
        <div>
          <p>{cropProfile.cropType}</p>

          <h2 title={cropProfile.displayName}>
            {cropProfile.displayName}
          </h2>

          <span
            title={
              cropProfile.scientificName ??
              "Scientific name unavailable"
            }
          >
            {cropProfile.scientificName ??
              "Scientific name unavailable"}
          </span>
        </div>

        <strong>
          {cropProfile.mainRisks.length} risks
        </strong>
      </header>

      {/* =====================================
          FOCO DE ANÁLISIS
          ===================================== */}
      <section className="cropProfileCard__section">
        <h3>Analysis focus</h3>

        <div className="cropProfileCard__chips">
          {cropProfile.analysisFocus.map(
            (focus) => (
              <span key={focus}>
                {focus}
              </span>
            ),
          )}
        </div>
      </section>

      {/* =====================================
          RIESGOS PRINCIPALES
          ===================================== */}
      <section className="cropProfileCard__section">
        <h3>Main risks</h3>

        <div className="cropProfileCard__chips cropProfileCard__chips--risk">
          {cropProfile.mainRisks.map(
            (risk) => (
              <span key={risk}>
                {risk}
              </span>
            ),
          )}
        </div>
      </section>

      {/* =====================================
          MÉTRICAS PREFERIDAS
          ===================================== */}
      <section className="cropProfileCard__section">
        <h3>Preferred metrics</h3>

        <div className="cropProfileCard__metrics">
          {cropProfile.preferredMetrics.map(
            (metric) => (
              <span key={metric}>
                {metric}
              </span>
            ),
          )}
        </div>
      </section>

      {/* =====================================
          RECOMENDACIÓN BASE
          ===================================== */}
      <footer className="cropProfileCard__footer">
        <small>Base recommendation</small>

        <p>{primaryRecommendation}</p>
      </footer>
    </article>
  );
}
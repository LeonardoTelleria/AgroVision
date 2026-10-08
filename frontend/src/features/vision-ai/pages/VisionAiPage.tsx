// /**
//  * =========================================
//  * VisionAiPage
//  * =========================================
//  *
//  * Pantalla reconstruida siguiendo la
//  * composición oficial definida en Figma.
//  *
//  * La refactorización modifica únicamente:
//  * - estructura visual;
//  * - interacción de carga;
//  * - presentación de resultado;
//  * - distribución de evidencias.
//  *
//  * NO modifica:
//  * - POST /api/vision/analyze;
//  * - backend/fallback;
//  * - contrato VisionInspection;
//  * - categorías de predicción;
//  * - lógica del AI Service.
//  */

import { useEffect, useState, type ChangeEvent } from "react";
import { MetricCard } from "../../../shared/components/ui/MetricCard";
import { Panel } from "../../../shared/components/ui/Panel";
import { StatusBadge } from "../../../shared/components/ui/StatusBadge";
import { getCropProfiles } from "../../crops/services/cropProfilesService";
import type { CropProfile, CropType } from "../../crops/types/cropProfile.types";
import { VisionResultCard } from "../components/VisionResultCard";
import { analyzeVisionImage } from "../services/visionAIService";
import type { VisionAnalysisResult, VisionAnalysisStatus, VisionInspection } from "../types/visionAi.types";
import "../vision-ai.css";

/**
 * Caso oficial de demostración.
 */
const DEFAULT_FIELD_ID = "field-001";
const DEFAULT_ZONE_ID = "zone-03";
export function VisionAiPage() {
  const [profiles, setProfiles] = useState<ReadonlyArray<CropProfile>>([]);
  const [selectedCropType, setSelectedCropType] = useState<CropType>("ORANGE");
  const [selectedZoneId, setSelectedZoneId] = useState(DEFAULT_ZONE_ID);

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [analysisResult, setAnalysisResult] = useState<VisionAnalysisResult | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<VisionAnalysisStatus>("IDLE");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  /**
   * Carga los perfiles agrícolas disponibles.
   *
   * La página no consume mocks directamente.
   */
  useEffect(() => {
    async function loadProfiles() {
      try {
        const data = await getCropProfiles();
        setProfiles(data);
      } catch {
        setFeedbackMessage("No se pudieron cargar los perfiles agrícolas.");
      }
    }

    void loadProfiles();
  }, []);

  /**
   * Libera la URL temporal de la imagen cuando
   * cambia el archivo o se desmonta la página.
   */
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  /**
   * Ejecuta el flujo real:
   *
   * UI
   * → visionAIService
   * → backend
   * → fallback si backend falla.
   */
  async function runAnalysis(file: File | null, fileName: string) {
    setAnalysisStatus("ANALYZING");
    setFeedbackMessage(null);

    try {
      const result = await analyzeVisionImage({
        cropType: selectedCropType,
        fieldId: DEFAULT_FIELD_ID,
        zoneId: selectedZoneId,
        imageFileName: fileName,
        imageFile: file,
      });

      setAnalysisResult(result);

      if (result.source === "FALLBACK") {
        setAnalysisStatus("FALLBACK");
        setFeedbackMessage("Se utiliza análisis preliminar local porque el backend no respondió.");
        return;
      }

      setAnalysisStatus("RESULT");
    } catch {
      setAnalysisStatus("ERROR");
      setFeedbackMessage("No fue posible completar el análisis visual.");
    }
  }

  /**
   * Selecciona la imagen.
   *
   * Al elegir un archivo:
   * - crea preview;
   * - registra nombre;
   * - ejecuta automáticamente el análisis.
   *
   * Esto permite conservar en pantalla el botón
   * "Subir imagen" de la maqueta sin añadir un CTA
   * adicional que Figma no contiene.
   */
  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);

    const previewUrl = URL.createObjectURL(file);

    setImagePreviewUrl(previewUrl);

    void runAnalysis(file, file.name);
  }

  /**
   * Cambiar cultivo invalida el análisis anterior.
   */
  function handleCropChange(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedCropType(event.target.value as CropType);
    setAnalysisResult(null);
    setAnalysisStatus("IDLE");
  }

  /**
   * Cambiar zona invalida el análisis anterior.
   */
  function handleZoneChange(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedZoneId(event.target.value);
    setAnalysisResult(null);
    setAnalysisStatus("IDLE");
  }

  const inspection = analysisResult?.inspection ?? null;
  const confidencePercentage = inspection ? normalizeConfidence(inspection.confidence) : 0;

  const detectedAnomalies = inspection && inspection.prediction !== "HEALTHY" && inspection.prediction !== "UNKNOWN" ? 1 : 0;

  return (
    <section className="avScreen visionFigma">
      <h1 className="avScreenTitle">Vision AI</h1>
      {/* =====================================
          KPI SUPERIORES
          ===================================== */}

      <section className="avMetricGrid">
        <MetricCard title="Imágenes analizadas" value={inspection ? "100%" : "0%"} description={inspection ? "1 imagen analizada. Imagen procesada correctamente." : "Esperando imagen para análisis."} progress={inspection ? 100 : 0} actionLabel="Ver todas las imágenes" />

        <MetricCard title="Anomalías detectadas" value={inspection ? "100%" : "0%"} description={detectedAnomalies ? "1 anomalía detectada. Patrón de estrés identificado." : "Sin anomalías confirmadas."} progress={detectedAnomalies ? 100 : 0} tone="AMBER" actionLabel="Ver listado de anomalías" />

        <MetricCard title="Nivel de confianza" value={`${confidencePercentage}%`} description="Confianza de la predicción" progress={confidencePercentage} tone="TEAL" actionLabel="Ver nivel de confianza promedio" />
      </section>

      {/* =====================================
          WORKSPACE PRINCIPAL
          ===================================== */}

      <section className="visionFigma__workspace">
        <div className="visionFigma__left">
          <Panel title="Carga y análisis de imagen" showInfo={false}>
            <div className="visionFigma__controls">
              <label>
                <span>Seleccionar cultivo</span>

                <select value={selectedCropType} onChange={handleCropChange}>
                  {profiles.length === 0 && <option value="ORANGE">Naranjo</option>}

                  {profiles.map((profile) => (
                    <option key={profile.cropType} value={profile.cropType}>
                      {profile.displayName}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Seleccione zona</span>

                <select value={selectedZoneId} onChange={handleZoneChange}>
                  <option value="zone-03">Zona 03</option>
                  <option value="zone-02">Zona 02</option>
                  <option value="zone-01">Zona 01</option>
                </select>
              </label>

              <label className="visionUploadButton">
                <span className="visionUploadButton__icon">{/* SVG upload */}</span>
                <strong>{analysisStatus === "ANALYZING" ? "Analizando..." : "Subir imagen"}</strong>
                <input type="file" accept="image/*" disabled={analysisStatus === "ANALYZING"} onChange={handleImageChange} />
              </label>
            </div>

            <VisionImagePreview previewUrl={imagePreviewUrl} inspection={inspection} />
          </Panel>

          {/* =====================================
              EVIDENCIA VISUAL
              ===================================== */}

          <Panel title="Evidencias visuales" showInfo={false}>
            {inspection ? (
              <div className="visionEvidenceTable">
                <div className="visionEvidenceTable__header">
                  <span>ID</span>
                  <span />
                  <span>Región</span>
                  <span>Descripción</span>
                  <span>Confianza</span>
                  <span>Estado</span>
                  <span />
                </div>

                {inspection.evidence.slice(0, 3).map((evidence, index) => (
                  <div key={`${evidence.metric}-${index}`} className="visionEvidenceTable__row">
                    <span>EV-{String(index + 1).padStart(2, "0")}</span>

                    <b>{index + 1}</b>

                    <span>{getEvidenceRegion(index)}</span>

                    <p>{evidence.explanation}</p>

                    <span>{index === 0 ? `${confidencePercentage}%` : "No disponible"}</span>

                    <StatusBadge tone={getEvidenceTone(evidence.status)}>
                      {formatEvidenceStatus(evidence.status)}
                    </StatusBadge>

                    <strong>›</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="visionCompactEmpty">
                Selecciona una imagen para generar evidencia visual.
              </div>
            )}
          </Panel>
        </div>

        {/* =====================================
            COLUMNA DE RESULTADO
            ===================================== */}

        <aside className="visionFigma__right">
          {inspection && analysisResult ? (
            <VisionResultCard result={inspection} source={analysisResult.source} fallbackReason={analysisResult.fallbackReason} />
          ) : (
            <VisionResultPlaceholder status={analysisStatus} message={feedbackMessage} />
          )}
        </aside>
      </section>

      {/* =====================================
          HISTORIAL
          ===================================== */}

      <Panel title="Historial de análisis" showInfo={false}>
        {inspection ? (
          <div className="avTableWrap">
            <table className="avTable visionHistoryTable">
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Cultivo</th>
                  <th>Zona</th>
                  <th>Predicción</th>
                  <th>Confianza</th>
                  <th>Severidad</th>
                  <th>Estado</th>
                  <th>Analizado por</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>{formatDateTime(inspection.createdAt)}</td>
                  <td>{formatCrop(inspection.cropType)}</td>
                  <td>{formatZone(inspection.zoneId)}</td>
                  <td className="visionHistoryPrediction">{formatPrediction(inspection.prediction)}</td>
                  <td>
                    <div className="visionConfidenceCell">
                      <span>{confidencePercentage}%</span>
                      <i><b style={{ width: `${confidencePercentage}%` }} /></i>
                    </div>
                  </td>
                  <td><StatusBadge tone={getPredictionTone(inspection.prediction)}>{getSeverityLabel(inspection.prediction)}</StatusBadge></td>
                  <td><StatusBadge tone={getPredictionTone(inspection.prediction)}>{inspection.prediction === "HEALTHY" ? "Normal" : "Advertencia"}</StatusBadge></td>
                  <td>Vision AI</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="visionCompactEmpty">
            Todavía no existen análisis en la sesión actual.
          </div>
        )}

        <button type="button" className="avTextAction visionCenteredAction">Ver todo el historial →</button>
      </Panel>
    </section>
  );
}

/**
 * Preview principal.
 *
 * Si existe una imagen real utiliza el archivo
 * seleccionado por el usuario.
 *
 * Sin imagen se mantiene el área diseñada sin
 * mostrar un icono roto.
 */
function VisionImagePreview({ previewUrl, inspection }: { readonly previewUrl: string | null; readonly inspection: VisionInspection | null }) {
  return (
    <div className={previewUrl ? "visionImagePreview has-image" : "visionImagePreview"}>
      {previewUrl && <img src={previewUrl} alt="Imagen agrícola seleccionada para análisis visual" />}

      {!previewUrl && (
        <div className="visionImagePreview__empty">
          <span>{/* SVG leaf/image */}</span>
          <strong>Imagen agrícola</strong>
          <small>Selecciona una imagen para iniciar el análisis preliminar.</small>
        </div>
      )}

      {previewUrl && (
        <>
          <div className="visionImagePreview__marker visionImagePreview__marker--one">1</div>
          <div className="visionImagePreview__marker visionImagePreview__marker--two">2</div>
          <div className="visionImagePreview__marker visionImagePreview__marker--three">3</div>

          <div className="visionImagePreview__area visionImagePreview__area--one" />
          <div className="visionImagePreview__area visionImagePreview__area--two" />
          <div className="visionImagePreview__area visionImagePreview__area--three" />
        </>
      )}

      <div className="visionImagePreview__mapControls">
        <button type="button">+</button>
        <button type="button">−</button>
        <button type="button">{/* SVG fit */}</button>
      </div>

      {inspection && <span className="visionImagePreview__file">{formatPrediction(inspection.prediction)}</span>}
    </div>
  );
}

function VisionResultPlaceholder({ status, message }: { readonly status: VisionAnalysisStatus; readonly message: string | null }) {
  return (
    <>
      <Panel title="Resultado preliminar" showInfo={false}>
        <div className="visionResultRows visionResultRows--placeholder">
          <ResultPlaceholderRow label="Predicción" />
          <ResultPlaceholderRow label="Confianza" />
          <ResultPlaceholderRow label="Cultivo" />
          <ResultPlaceholderRow label="Zona Analizada" />
          <ResultPlaceholderRow label="Estado" />
        </div>
      </Panel>

      <Panel title="Métricas visuales" showInfo={false}>
        <div className="visionMetricsPlaceholder">
          <span>Esperando análisis visual.</span>
        </div>
      </Panel>

      <div className={`visionPreliminaryNotice visionPreliminaryNotice--${status.toLowerCase()}`}>
        <span>{/* SVG leaf */}</span>

        <div>
          <strong>{status === "ANALYZING" ? "Analizando imagen" : status === "ERROR" ? "Análisis no disponible" : "Resultado preliminar"}</strong>
          <p>{message ?? "Selecciona una imagen para generar un análisis visual preliminar."}</p>
        </div>
      </div>
    </>
  );
}

function ResultPlaceholderRow({ label }: { readonly label: string }) {
  return (
    <div>
      <strong>{label}</strong>
      <span>—</span>
    </div>
  );
}

function normalizeConfidence(value: number): number {
  return Math.round(value <= 1 ? value * 100 : value);
}

function formatPrediction(value: string): string {
  return value.replaceAll("_", " ");
}

function formatCrop(value: string): string {
  if (value === "ORANGE") return "Naranjo";
  if (value === "RED_BEAN") return "Frijol rojo";
  if (value === "CASSAVA") return "Yuca";
  if (value === "SORGHUM") return "Sorgo";

  return value.replaceAll("_", " ");
}

function formatZone(value?: string | null): string {
  if (!value) return "—";

  return value.replace("zone-", "Zona ");
}

function getEvidenceRegion(index: number): string {
  if (index === 0) return "Imagen general";
  if (index === 1) return "Cobertura vegetal";

  return "Áreas secas";
}

function formatEvidenceStatus(status: string): string {
  if (status === "NORMAL") return "Normal";
  if (status === "WATCH") return "Vigilancia";

  return "Advertencia";
}

function getEvidenceTone(status: string): "SUCCESS" | "WARNING" | "DANGER" {
  if (status === "NORMAL") return "SUCCESS";
  if (status === "CRITICAL") return "DANGER";

  return "WARNING";
}

function getPredictionTone(prediction: string): "SUCCESS" | "WARNING" | "DANGER" {
  if (prediction === "HEALTHY") return "SUCCESS";
  if (prediction === "UNKNOWN") return "WARNING";

  return "WARNING";
}

function getSeverityLabel(prediction: string): string {
  if (prediction === "HEALTHY") return "Baja";
  if (prediction === "UNKNOWN") return "Media";

  return "Alta";
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-NI", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

/**
 * Vista de respaldo mientras se completa la refactorización de Vision AI.
 *
 * AppRouter importa todas las páginas al iniciar la aplicación, por lo que
 * este contrato debe seguir existiendo aunque la implementación principal
 * permanezca comentada temporalmente.
 */
// export function VisionAiPage() {
//   return (
//     <section className="avState">
//       <strong>Vision AI en refactorización</strong>
//       <p>El resto de AgroVision continúa disponible.</p>
//     </section>
//   );
// }

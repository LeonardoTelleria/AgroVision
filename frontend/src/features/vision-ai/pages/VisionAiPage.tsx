/**
 * =========================================
 * VisionAiPage
 * =========================================
 *
 * Pantalla base de Vision AI.
 *
 * Finalidad:
 * - permitir seleccionar cultivo;
 * - seleccionar o simular imagen;
 * - ejecutar análisis visual;
 * - mostrar estado idle, analyzing, result, fallback o error;
 * - dejar claro que el resultado es preliminar.
 */

import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";

import { getCropProfiles } from "../../crops/services/cropProfilesService";
import type {
  CropProfile,
  CropType,
} from "../../crops/types/cropProfile.types";

import { VisionResultCard } from "../components/VisionResultCard";
import { analyzeVisionImage } from "../services/visionAIService";

import type {
  VisionAnalysisResult,
  VisionAnalysisStatus,
} from "../types/visionAi.types";

import "../vision-ai.css";

const DEFAULT_FIELD_ID = "field-001";
const DEFAULT_ZONE_ID = "zone-03";
const DEFAULT_IMAGE_FILE_NAME = "orange-zone-03-reference.jpg";

export function VisionAiPage() {
  const [profiles, setProfiles] = useState<ReadonlyArray<CropProfile>>([]);

  const [selectedCropType, setSelectedCropType] =
    useState<CropType>("ORANGE");

  const [imageFileName, setImageFileName] = useState(
    DEFAULT_IMAGE_FILE_NAME
  );

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(
    null
  );

  const [analysisResult, setAnalysisResult] =
    useState<VisionAnalysisResult | null>(null);

  const [analysisStatus, setAnalysisStatus] =
    useState<VisionAnalysisStatus>("IDLE");

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(
    null
  );

  /**
   * Carga perfiles de cultivos.
   *
   * Funcionamiento:
   * - obtiene perfiles desde cropProfilesService;
   * - llena el selector de cultivos;
   * - si falla, mantiene ORANGE como default para no romper demo.
   */
  useEffect(() => {
    async function loadProfiles() {
      try {
        const data = await getCropProfiles();

        setProfiles(data);
      } catch {
        setFeedbackMessage(
          "No se pudieron cargar perfiles. Se mantiene ORANGE como cultivo demo."
        );
      }
    }

    void loadProfiles();
  }, []);

  /**
   * Ejecuta análisis visual.
   *
   * Funcionamiento:
   * - cambia estado a ANALYZING;
   * - envía cultivo, field, zone y archivo al service;
   * - el service intenta backend y usa fallback si falla;
   * - actualiza estado según source: BACKEND o FALLBACK.
   */
  async function handleAnalyze() {
    setAnalysisStatus("ANALYZING");
    setFeedbackMessage(null);

    try {
      const result = await analyzeVisionImage({
        cropType: selectedCropType,
        fieldId: DEFAULT_FIELD_ID,
        zoneId: DEFAULT_ZONE_ID,
        imageFileName,
        imageFile: selectedImageFile,
      });

      setAnalysisResult(result);

      if (result.source === "FALLBACK") {
        setAnalysisStatus("FALLBACK");
        setFeedbackMessage(
          "Backend no disponible. Se muestra análisis preliminar local controlado."
        );

        return;
      }

      setAnalysisStatus("RESULT");
      setFeedbackMessage("Análisis visual generado desde backend.");
    } catch {
      setAnalysisStatus("ERROR");
      setFeedbackMessage("No se pudo ejecutar el análisis visual.");
    }
  }

  /**
   * Maneja selección de imagen.
   *
   * Funcionamiento:
   * - toma el primer archivo seleccionado;
   * - guarda referencia real del archivo;
   * - guarda nombre para trazabilidad visual;
   * - limpia resultado anterior para evitar confusión.
   */
  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setSelectedImageFile(file);
    setImageFileName(file.name);
    setAnalysisResult(null);
    setAnalysisStatus("IDLE");
    setFeedbackMessage("Imagen seleccionada. Lista para análisis preliminar.");
  }

  /**
   * Maneja cambio de cultivo.
   *
   * Funcionamiento:
   * - actualiza cropType;
   * - limpia resultado previo;
   * - evita mostrar análisis de otro cultivo.
   */
  function handleCropChange(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedCropType(event.target.value as CropType);
    setAnalysisResult(null);
    setAnalysisStatus("IDLE");
    setFeedbackMessage("Cultivo actualizado. Ejecuta un nuevo análisis.");
  }

  const isAnalyzing = analysisStatus === "ANALYZING";

  return (
    <section className="visionAiPage" aria-labelledby="vision-ai-title">
      <header className="visionAiHero">
        <div>
          <p className="visionAiHero__eyebrow">Vision AI</p>

          <h1 id="vision-ai-title">Análisis visual preliminar</h1>

          <span>
            Selecciona un cultivo y una imagen para generar una lectura visual
            preliminar con predicción, confianza, evidencia y recomendación.
          </span>
        </div>
      </header>

      {feedbackMessage && (
        <section
          className={`visionAiStatusBanner visionAiStatusBanner--${analysisStatus.toLowerCase()}`}
        >
          <p>{feedbackMessage}</p>
        </section>
      )}

      <section className="visionAiGrid">
        <article className="visionAiPanel">
          <header>
            <p>Entrada visual</p>
            <h2>Preparar análisis</h2>
          </header>

          <label className="visionAiField">
            <span>Crop type</span>

            <select value={selectedCropType} onChange={handleCropChange}>
              {profiles.length === 0 && (
                <option value="ORANGE">Naranjo — ORANGE</option>
              )}

              {profiles.map((profile) => (
                <option key={profile.cropType} value={profile.cropType}>
                  {profile.displayName} — {profile.cropType}
                </option>
              ))}
            </select>
          </label>

          <label className="visionAiField">
            <span>Image file</span>

            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
          </label>

          <div className="visionAiMockPreview">
            <span>Archivo de referencia</span>

            <strong>{imageFileName}</strong>

            <small>
              Entrada visual preliminar. Requiere validación técnica en campo.
            </small>
          </div>

          <button
            type="button"
            className="visionAiButton"
            disabled={isAnalyzing}
            onClick={handleAnalyze}
          >
            {isAnalyzing
              ? "Analizando imagen..."
              : "Ejecutar análisis preliminar"}
          </button>
        </article>

        {analysisStatus === "ANALYZING" && (
          <article className="visionAiEmptyState visionAiEmptyState--analyzing">
            <p>Analizando imagen</p>

            <span>
              AgroVision está procesando la entrada visual y preparando una
              respuesta preliminar.
            </span>
          </article>
        )}

        {analysisStatus === "ERROR" && (
          <article className="visionAiEmptyState visionAiEmptyState--error">
            <p>Error de análisis</p>

            <span>
              No fue posible completar el análisis visual. Revisa backend,
              endpoint o formato de respuesta.
            </span>
          </article>
        )}

        {(analysisStatus === "IDLE" || !analysisResult) &&
          analysisStatus !== "ANALYZING" &&
          analysisStatus !== "ERROR" && (
            <article className="visionAiEmptyState">
              <p>Esperando análisis visual</p>

              <span>
                Selecciona un cultivo, usa una imagen de referencia y ejecuta
                un análisis preliminar. No se emitirá diagnóstico definitivo.
              </span>
            </article>
          )}

        {analysisResult &&
          (analysisStatus === "RESULT" || analysisStatus === "FALLBACK") && (
            <VisionResultCard
              result={analysisResult.inspection}
              source={analysisResult.source}
              fallbackReason={analysisResult.fallbackReason}
            />
          )}
      </section>
    </section>
  );
}
/**
 * =========================================
 * VisionResultCard
 * =========================================
 *
 * Card para el resultado del análisis visual.
 *
 * Finalidad:
 * - mostrar predicción, confianza y métricas
 * - mostrar señales visuales detectadas
 * - explicar evidencia visual
 * - mostrar las acciones recomendadas.
*/


import { Panel } from "../../../shared/components/ui/Panel";
import { StatusBadge } from "../../../shared/components/ui/StatusBadge";
import type { VisionAnalysisSource, VisionInspection } from "../types/visionAI.types";

interface VisionResultCardProps {
  readonly result: VisionInspection;
  readonly source: VisionAnalysisSource;
  readonly fallbackReason?: string | null;
}

export function VisionResultCard({ result, source, fallbackReason }: VisionResultCardProps) {
  const confidencePercentage = normalizeConfidence(result.confidence);

  return (
    <>
      <Panel title="Resultado preliminar" showInfo={false}>
        <div className="visionResultRows">
          <ResultRow label="Predicción" value={formatPrediction(result.prediction)} />
          <ResultRow label="Confianza" value={`${confidencePercentage}%`} />
          <ResultRow label="Cultivo" value={formatCrop(result.cropType)} />
          <ResultRow label="Zona Analizada" value={formatZone(result.zoneId)} />

          <div className="visionResultRow">
            <strong>Estado</strong>
            <StatusBadge tone={result.prediction === "HEALTHY" ? "SUCCESS" : "WARNING"}>
              {result.prediction === "HEALTHY" ? "Normal" : "Advertencia"}
            </StatusBadge>
          </div>
        </div>
      </Panel>

      <Panel title="Métricas visuales" showInfo={false}>
        <div className="visionMetricRows">
          <MetricRow label="Cobertura verde" value={result.visualMetrics.greenCoveragePercentage} unit="%" />
          <MetricRow label="Área seca" value={result.visualMetrics.dryAreaPercentage} unit="%" />
          <BooleanMetricRow label="Clorosis sospechada" value={result.visualMetrics.chlorosisSuspected} />
          <BooleanMetricRow label="Manchas foliares" value={result.visualMetrics.leafSpotSuspected} />
          <BooleanMetricRow label="Patrón de estrés" value={result.visualMetrics.stressPatternDetected} emphasized />
        </div>
      </Panel>

      <section className="visionPreliminaryNotice">
        <span className="visionPreliminaryNotice__icon">{/* SVG leaf */}</span>

        <div>
          <strong>Resultado preliminar</strong>
          <p>{result.explanation}</p>
          <small>Análisis visual preliminar. No representa diagnóstico definitivo.</small>
        </div>
      </section>

      {source === "FALLBACK" && (
        <div className="visionFallbackNotice">
          <strong>Modo de respaldo</strong>
          <span>{fallbackReason ?? "Resultado local controlado."}</span>
        </div>
      )}
    </>
  );
}

function ResultRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="visionResultRow">
      <strong>{label}</strong>
      <span>{value}</span>
    </div>
  );
}

function MetricRow({ label, value, unit }: { readonly label: string; readonly value?: number | null; readonly unit: string }) {
  const percentage = value ?? 0;

  return (
    <div className="visionMetricRow">
      <strong>{label}</strong>

      <div className="visionMetricProgress">
        <i><b style={{ width: `${Math.max(0, Math.min(percentage, 100))}%` }} /></i>
      </div>

      <span>{value === null || value === undefined ? "N/D" : `${value}${unit}`}</span>
    </div>
  );
}

function BooleanMetricRow({ label, value, emphasized = false }: { readonly label: string; readonly value?: boolean | null; readonly emphasized?: boolean }) {
  const percentage = value ? 88 : 12;

  return (
    <div className="visionMetricRow">
      <strong>{label}</strong>

      <div className={emphasized ? "visionMetricProgress is-emphasized" : "visionMetricProgress"}>
        <i><b style={{ width: `${percentage}%` }} /></i>
      </div>

      <span>{value === null || value === undefined ? "N/D" : value ? "Sí" : "No"}</span>
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

  return value.replaceAll("_", " ");
}

function formatZone(value?: string | null): string {
  return value ? value.replace("zone-", "Zona ") : "—";
}

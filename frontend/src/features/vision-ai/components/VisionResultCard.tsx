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

import type { VisionAnalysisSource, VisionInspection } from "../types/visionAi.types";

interface VisionResultCardProps {
    readonly result: VisionInspection;
    readonly source: VisionAnalysisSource;
    readonly fallbackReason?: string | null;
}


/**
 * Renderiza el resultado visual normalizado.
 *
 * Funcionamiento:
 * - recibe VisionInspection desde VisionAiPage;
 * - muestra si la fuente fue BACKEND o FALLBACK;
 * - muestra métricas visuales explicables;
*/

export function VisionResultCard({ result, source, fallbackReason }: VisionResultCardProps) {
    // Se convierte confidence 0-1 a un porcentaje visual.
    const confidencePercentage = Math.round(result.confidence * 100);

    // Se usa para "pintar" badge de la fuente.
    const sourceClassName = source.toLowerCase();

    return (
        <article className="visionResultCard">
            <header className="visionResultCard__header">
                <div>
                    <p>Clasificación preliminar</p>
                    <h2>{formatPrediction(result.prediction)}</h2>
                    <span>{confidencePercentage}% de confianza</span>
                </div>

                <strong className={`visionSourceBadge visionSourceBadge--${sourceClassName}`}>
                {source}
                </strong>
            </header>

            {source === "FALLBACK" && (
                <section className="visionResultCard__fallbackNotice">
                <strong>Fallback controlado</strong>
                <p>
                    {fallbackReason ??
                    "Backend no disponible. Se muestra respuesta local controlada."}
                </p>
                </section>
            )}

            <section className="visionResultCard__notice">
                <strong>Limitación técnica</strong>
                <p>Análisis visual preliminar</p>
            </section>

            <section className="visionResultCard__metrics">
                <MetricBox label="Cobertura verde" value={formatMetric(result.visualMetrics.greenCoveragePercentage,"%" )} />

                <MetricBox label="Área seca" value={formatMetric(result.visualMetrics.dryAreaPercentage,"%")} />

                <MetricBox label="Clorosis" value={formatBoolean(result.visualMetrics.chlorosisSuspected)} />

                <MetricBox label="Mancha foliar" value={formatBoolean(result.visualMetrics.leafSpotSuspected)} />
            </section>

            <section className="visionResultCard__section">
                <h3>Señales detectadas</h3>
                <div className="visionSignalList">
                    <SignalBadge label="Patrón de estrés" value={formatBoolean(result.visualMetrics.stressPatternDetected)}/>

                    <SignalBadge label="Field" value={result.fieldId} />

                    <SignalBadge label="Zone" value={result.zoneId ?? "N/A"} />

                    <SignalBadge label="Crop" value={result.cropType} />
                </div>
            </section>

            <section className="visionResultCard__section">
                <h3>Explicación</h3>
                <p>{result.explanation}</p>
            </section>
            <section className="visionResultCard__section">
                <h3>Acción sugerida</h3>
                <p>{result.recommendedAction}</p>
            </section>

            <section className="visionResultCard__section">
                <h3>Evidencia generada</h3>
                <div className="visionEvidenceList">
                {result.evidence.map((item) => (
                    <article
                    key={`${item.source}-${item.metric}-${String(item.value ?? "none")}`}
                    className={`visionEvidenceItem visionEvidenceItem--${item.status.toLowerCase()}`}>
                        <strong>{item.metric}</strong>

                        <span>{String(item.value ?? "N/A")}{item.unit ? ` ${item.unit}` : ""}</span>
                        <small>{item.explanation}</small>
                    </article>
                ))}
                </div>
            </section>
        </article>
    );
}


interface MetricBoxProps {
    readonly label: string;
    readonly value: string;
}

// Renderiza una métrica visual principal. Se usa para representar porcentajes y señales binarias resumidas.
function MetricBox({ label, value }: MetricBoxProps) {
    return (
        <article className="visionMetricBox">
            <span>{label}</span>
            <strong>{value}</strong>
        </article>
    )
}

interface SignalBadgeProps {
  readonly label: string;
  readonly value: string;
}


// Renderiza una señal secundaria. Se usa para las field, zone, crop y patrón de estrés.
function SignalBadge({ label, value }: SignalBadgeProps) {
    return (
        <article className="visionSignalBadge">
            <span>{label}</span>
            <strong>{value}</strong>
        </article>
    );
}


// Función auxiliar para formatear el texto de una #predicción" en forma legible, reemplazando guiones bajos por espacios
function formatPrediction(prediction: string): string {
    return prediction.replaceAll("_", " ");
}

// Formatea métricas numéricas, si el valor no existe, retorna N/A para evitar que UI se rompa.
function formatMetric(value: number | null | undefined, unit: string): string {
    if (value === null || value === undefined) return "N/A";
    return `${value} ${unit}`;
}

// Formatea booleanos, si el valor no existe retorna N/A .
function formatBoolean(value: boolean | null | undefined): string {
    if (value === null || value === undefined) return "N/A";
    return value ? "YES" : "NO";
}


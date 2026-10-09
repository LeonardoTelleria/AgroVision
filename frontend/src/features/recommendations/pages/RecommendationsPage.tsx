/**
 * =========================================
 * AgroVision — RecommendationsPage
 * =========================================
 *
 * Pantalla principal del módulo de recomendaciones.
 *
 * Responsabilidades:
 * - cargar recomendaciones prescriptivas;
 * - conservar la recomendación seleccionada;
 * - mostrar métricas agregadas;
 * - priorizar recomendaciones;
 * - presentar el detalle de la recomendación;
 * - visualizar impacto esperado mediante Recharts;
 * - mostrar recomendaciones recientes.
 *
 * IMPORTANTE:
 * - se conservan las MetricCard originales;
 * - no se modifica la lógica del servicio;
 * - no se modifican los contratos de datos;
 * - no se modifican los estados del dominio;
 * - Recharts se utiliza únicamente como capa visual.
 * =========================================
 */

import { useEffect, useMemo, useState } from "react";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { MetricCard } from "../../../shared/components/ui/MetricCard";
import { Panel } from "../../../shared/components/ui/Panel";
import { StatusBadge } from "../../../shared/components/ui/StatusBadge";

import { getRecommendationsData } from "../services/recommendationsService";

import type {
  Recommendation,
  RecommendationsData,
} from "../types/recommendations.types";

import "../recommendations.css";

/* =========================================
   Assets existentes del proyecto
   ========================================= */

import waterIcon from "../../../assets/icons/water-icon.svg";
import bugIcon from "../../../assets/icons/bug-icon.svg";
import protectionIcon from "../../../assets/icons/protection-icon.svg";
import aiRecommendationIcon from "../../../assets/icons/ai-recommendation-icon.svg";
import arrowRightIcon from "../../../assets/icons/arrow2-icon.png";
// import protection2Icon from "../../../assets/icons/protection2-icon.svg";
import protection3Icon from "../../../assets/icons/protection2-green-icon.svg";
import nutritionIcon from "../../../assets/icons/nutrition-icon.svg";
import healthIcon from "../../../assets/icons/salud-icon.svg";
import efficiencyIcon from "../../../assets/icons/eficiencia-icon.svg";
import yieldIcon from "../../../assets/icons/rendimiento-icon.svg";





/* =========================================
   Página principal
   ========================================= */

export function RecommendationsPage() {
  const [data, setData] =
    useState<RecommendationsData | null>(null);

  const [selectedId, setSelectedId] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);


  /* =========================================
     Carga de datos
     ========================================= */

  useEffect(() => {
    async function loadRecommendations() {
      try {
        const result =
          await getRecommendationsData();

        setData(result);

        setSelectedId(
          result.mainRecommendation?.id ??
            result.recommendations[0]?.id ??
            null,
        );

        setErrorMessage(null);
      } catch {
        setErrorMessage(
          "No se pudieron cargar las recomendaciones.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadRecommendations();
  }, []);


  /* =========================================
     Recomendación seleccionada
     ========================================= */

  const selectedRecommendation =
    useMemo(() => {
      return (
        data?.recommendations.find(
          (item) =>
            item.id === selectedId,
        ) ??
        data?.mainRecommendation ??
        null
      );
    }, [data, selectedId]);


  /* =========================================
     Estados de pantalla
     ========================================= */

  if (isLoading) {
    return (
      <section className="avState">
        <strong>
          Cargando recomendaciones
        </strong>
      </section>
    );
  }

  if (!data || errorMessage) {
    return (
      <section className="avState">
        <strong>
          {errorMessage ??
            "No fue posible cargar las recomendaciones."}
        </strong>
      </section>
    );
  }


  /* =========================================
     Métricas agregadas
     ========================================= */

  const totalRecommendations =
    data.recommendations.length;

  const inProgress =
    data.recommendations.filter(
      (item) =>
        item.status === "IN_PROGRESS" ||
        item.status === "PENDING",
    ).length;

  const completed =
    data.recommendations.filter(
      (item) =>
        item.status === "APPLIED",
    ).length;

  const priorityProgress =
    totalRecommendations > 0
      ? (
          data.totalHighPriority /
          totalRecommendations
        ) * 100
      : 0;

  const trackingProgress =
    totalRecommendations > 0
      ? (
          inProgress /
          totalRecommendations
        ) * 100
      : 0;

  const completedProgress =
    totalRecommendations > 0
      ? (
          completed /
          totalRecommendations
        ) * 100
      : 0;


  return (
    <section className="avScreen recommendationsFigma">

      {/* =====================================
          TÍTULO
          ===================================== */}

      <h1 className="avScreenTitle">
        Recomendaciones
      </h1>


      {/* =====================================
          MÉTRICAS SUPERIORES

          IMPORTANTE:
          Estas tres tarjetas son permanentes.
          No deben eliminarse del módulo.
          ===================================== */}

      <section className="avMetricGrid">

        <MetricCard
          title="Recomendaciones"
          value={totalRecommendations}
          description="Recomendaciones registradas para el cultivo."
          progress={priorityProgress}
          showRing
          showDescriptionWithRing
          actionLabel="Ver recomendaciones"
        />

        <MetricCard
          title="En seguimiento"
          value={inProgress}
          description="Recomendaciones que requieren seguimiento."
          progress={trackingProgress}
          tone="AMBER"
          showRing
          showDescriptionWithRing
          actionLabel="Ver seguimiento"
        />

        <MetricCard
          title="Ejecutadas"
          value={completed}
          description="Recomendaciones aplicadas correctamente."
          progress={completedProgress}
          tone="TEAL"
          showRing
          showDescriptionWithRing
          actionLabel="Ver historial"
        />

      </section>


      {/* =====================================
          WORKSPACE PRINCIPAL
          ===================================== */}

      <section className="recommendationsFigma__workspace">

        {/* ===================================
            RECOMENDACIONES PRIORIZADAS
            =================================== */}

        <Panel
          title="Recomendaciones priorizadas"
          className="recommendationsPanel recommendationsPanel--priority"
          headerAction={
            <button
              type="button"
              className="recommendationFilter"
            >
              Filtrar
            </button>
          }
        >

          <p className="recommendationsPanelLead">
            Acciones sugeridas para mejorar la salud
            de tus cultivos y reducir riesgos.
          </p>

          <div className="recommendationPriorityList">

            {data.recommendations.map(
              (recommendation) => {
                const selected =
                  selectedRecommendation?.id ===
                  recommendation.id;

                return (
                  <button
                    key={recommendation.id}
                    type="button"
                    className={[
                      "priorityRecommendation",
                      `priorityRecommendation--${priorityTone(
                        recommendation.priority,
                      )}`,
                      selected
                        ? "is-selected"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() =>
                      setSelectedId(
                        recommendation.id,
                      )
                    }
                  >

                    {/* Icono semántico */}
                    <span
                      className={[
                        "priorityRecommendation__icon",
                        `priorityRecommendation__icon--${priorityTone(
                          recommendation.priority,
                        )}`,
                      ].join(" ")}
                      aria-hidden="true"
                    >
                      <img
                        src={recommendationIcon(
                          recommendation,
                        )}
                        alt=""
                      />
                    </span>


                    {/* Información principal */}
                    <div className="priorityRecommendation__main">

                      <StatusBadge
                        tone={priorityBadgeTone(
                          recommendation.priority,
                        )}
                      >
                        {formatPriority(
                          recommendation.priority,
                        )}
                      </StatusBadge>

                      <strong
                        title={recommendationTitle(
                          recommendation,
                        )}
                      >
                        {recommendationTitle(
                          recommendation,
                        )}
                      </strong>

                      <p
                        title={
                          recommendation.reason
                        }
                      >
                        {recommendation.reason}
                      </p>

                    </div>


                    {/* Acción */}
                    <div className="priorityRecommendation__column">

                      <span>
                        Acción sugerida
                      </span>

                      <strong
                        title={
                          recommendation.suggestedAction
                        }
                      >
                        {
                          recommendation.suggestedAction
                        }
                      </strong>

                    </div>


                    {/* Impacto */}
                    <div className="priorityRecommendation__column">

                      <span>
                        Impacto esperado
                      </span>

                      <strong
                        title={
                          recommendation.expectedImpact
                            .description
                        }
                      >
                        {
                          recommendation.expectedImpact
                            .description
                        }
                      </strong>

                    </div>


                    {/* Flecha */}
                    <span
                      className="priorityRecommendation__arrow"
                      aria-hidden="true"
                    >
                      <img
                        src={arrowRightIcon}
                        alt=""
                      />
                    </span>

                  </button>
                );
              },
            )}

          </div>


          <button
            type="button"
            className="recommendationPrimaryAction avActionButton"
          >
            <span>
              Ver todas las recomendaciones
            </span>

            <img
              src={arrowRightIcon}
              alt=""
              aria-hidden="true"
            />
          </button>

        </Panel>


        {/* ===================================
            DETALLE
            =================================== */}

        <Panel
          title="Detalle de la recomendación"
          className="recommendationsPanel recommendationsPanel--detail"
        >

          {selectedRecommendation && (
            <RecommendationDetail
              recommendation={
                selectedRecommendation
              }
            />
          )}

        </Panel>

      </section>


      {/* =====================================
          ZONA INFERIOR
          ===================================== */}

      <section className="recommendationsFigma__bottom">


        {/* ===================================
            IMPACTO ESPERADO
            =================================== */}

        <Panel
          title="Impacto esperado"
          className="recommendationsPanel recommendationsPanel--impact"
        >

          <p className="recommendationsPanelLead">
            Estimación del impacto de aplicar
            las acciones sugeridas.
          </p>


          <div className="expectedImpactGrid">

            <ImpactMetric
              label="Protección del cultivo"
              value="+18%"
              helper="Mejora estimada"
              progress={78}
              tone="GREEN"
              icon={protection3Icon}
            />

            <ImpactMetric
              label="Salud del cultivo"
              value="+15–20%"
              helper="Mejora estimada"
              progress={70}
              tone="LIME"
              icon={healthIcon}
            />

            <ImpactMetric
              label="Rendimiento potencial"
              value="+8–12%"
              helper="Mejora estimada"
              progress={58}
              tone="TEAL"
              icon={efficiencyIcon}
            />

            <ImpactMetric
              label="Eficiencia operativa"
              value="2.4 t CO₂e"
              helper="Por temporada"
              progress={45}
              tone="BLUE"
              icon={yieldIcon}
            />

          </div>

        </Panel>


        {/* ===================================
            RECOMENDACIONES RECIENTES
            =================================== */}

        <Panel
          title="Recomendaciones recientes"
          className="recommendationsPanel recommendationsPanel--recent"
        >

          <p className="recommendationsPanelLead">
            Últimas recomendaciones generadas
            y su estado de ejecución.
          </p>


          <div className="recommendationsRecentList">

            <div className="recommendationsRecentList__head">

              <span>
                Recomendación
              </span>

              <span>
                Prioridad
              </span>

              <span>
                Zona
              </span>

              <span>
                Fecha
              </span>

              <span>
                Estado
              </span>

              <span />

            </div>


            {data.recommendations
              .slice(0, 5)
              .map(
                (recommendation) => (
                  <button
                    key={`recent-${recommendation.id}`}
                    type="button"
                    className="recommendationsRecentRow"
                    onClick={() =>
                      setSelectedId(
                        recommendation.id,
                      )
                    }
                  >

                    <div className="recommendationsRecentRow__main">

                      <span
                        className={[
                          "recommendationsRecentRow__icon",
                          `recommendationsRecentRow__icon--${priorityTone(
                            recommendation.priority,
                          )}`,
                        ].join(" ")}
                        aria-hidden="true"
                      >
                        <img
                          src={recommendationIcon(
                            recommendation,
                          )}
                          alt=""
                        />
                      </span>

                      <strong
                        title={
                          recommendation.suggestedAction
                        }
                      >
                        {
                          recommendation.suggestedAction
                        }
                      </strong>

                    </div>


                    <StatusBadge
                      tone={priorityBadgeTone(
                        recommendation.priority,
                      )}
                    >
                      {formatPriority(
                        recommendation.priority,
                      )}
                    </StatusBadge>


                    <span>
                      {recommendation.zoneId ??
                        "—"}
                    </span>


                    <span>
                      {formatDate(
                        recommendation.createdAt,
                      )}
                    </span>


                    <StatusBadge
                      tone={
                        recommendation.status ===
                        "APPLIED"
                          ? "SUCCESS"
                          : "WARNING"
                      }
                    >
                      {formatStatus(
                        recommendation.status,
                      )}
                    </StatusBadge>


                    <span
                      className="recommendationsRecentRow__arrow"
                      aria-hidden="true"
                    >
                      <img
                        src={arrowRightIcon}
                        alt=""
                      />
                    </span>

                  </button>
                ),
              )}

          </div>


          <button
            type="button"
            className="recommendationSecondaryAction avActionButton"
          >
            <span>
              Ver todas
            </span>

            <img
              src={arrowRightIcon}
              alt=""
              aria-hidden="true"
            />
          </button>

        </Panel>

      </section>

    </section>
  );
}


/* ===========================================================
   COMPONENTE — DETALLE DE RECOMENDACIÓN
   =========================================================== */

function RecommendationDetail({
  recommendation,
}: {
  readonly recommendation: Recommendation;
}) {
  return (
    <div className="recommendationDetail">

      {/* =====================================
          HERO
          ===================================== */}

      <div className="recommendationDetail__hero">

        <span
          className={[
            "recommendationDetailIcon",
            `recommendationDetailIcon--${priorityTone(
              recommendation.priority,
            )}`,
          ].join(" ")}
          aria-hidden="true"
        >
          <img
            src={recommendationIcon(
              recommendation,
            )}
            alt=""
          />
        </span>


        <div className="recommendationDetail__heroCopy">

          <span>
            Riesgo
          </span>

          <strong>
            {recommendationTitle(
              recommendation,
            )}
          </strong>

          <p>
            {recommendation.reason}
          </p>

        </div>


        <div className="recommendationDetail__priority">

          <span>
            Prioridad
          </span>

          <StatusBadge
            tone={priorityBadgeTone(
              recommendation.priority,
            )}
          >
            {formatPriority(
              recommendation.priority,
            )}
          </StatusBadge>

        </div>

      </div>


      {/* =====================================
          METADATA
          ===================================== */}

      <div className="recommendationDetail__meta">

        <DetailMeta
          label="Campo"
          value={recommendation.fieldId}
        />

        <DetailMeta
          label="Zona"
          value={
            recommendation.zoneId ??
            "N/A"
          }
        />

        <DetailMeta
          label="Fecha"
          value={formatDate(
            recommendation.createdAt,
          )}
        />

        <DetailMeta
          label="Fuente"
          value={
            recommendation.evidence[0]
              ?.source ??
            "AgroVision AI"
          }
        />

      </div>


      {/* =====================================
          BLOQUE PRESCRIPTIVO
          ===================================== */}

      <div className="recommendationDetail__sections">

        <DetailSection
          label="Descripción"
          value={recommendation.reason}
        />

        <DetailSection
          label="Acción sugerida"
          value={
            recommendation.suggestedAction
          }
        />

        <DetailSection
          label="Beneficio esperado"
          value={
            recommendation.expectedImpact
              .description
          }
        />

      </div>


      {/* =====================================
          EVIDENCIA
          ===================================== */}

      <div className="recommendationDetail__evidenceTitle">

        <strong>
          Evidencia clave
        </strong>

        <span>
          {
            recommendation.evidence
              .length
          }{" "}
          indicadores
        </span>

      </div>


      <div className="recommendationEvidenceMini">

        {recommendation.evidence
          .slice(0, 4)
          .map(
            (evidence, index) => (
              <article
                key={`${evidence.source}-${evidence.metric}-${index}`}
                className={[
                  "recommendationEvidenceMini__item",
                  `recommendationEvidenceMini__item--${evidence.status.toLowerCase()}`,
                ].join(" ")}
              >

                <span>
                  {formatEvidenceMetric(
                    evidence.metric,
                  )}
                </span>

                <strong>
                  {String(
                    evidence.value ??
                      "—",
                  )}

                  {evidence.unit
                    ? ` ${evidence.unit}`
                    : ""}
                </strong>

                <small>
                  {formatEvidenceStatus(
                    evidence.status,
                  )}
                </small>

              </article>
            ),
          )}

      </div>


      {/* =====================================
          CTA
          ===================================== */}

      <button
        type="button"
        className="recommendationCompleteButton avActionButton"
      >
        ✓ Marcar como ejecutada
      </button>

    </div>
  );
}


/* ===========================================================
   COMPONENTE — METADATA
   =========================================================== */

function DetailMeta({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="recommendationDetailMeta">

      <span>
        {label}
      </span>

      <strong title={value}>
        {value}
      </strong>

    </div>
  );
}


/* ===========================================================
   COMPONENTE — SECCIÓN DEL DETALLE
   =========================================================== */

function DetailSection({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <section className="recommendationDetailSection">

      <strong>
        {label}
      </strong>

      <p>
        {value}
      </p>

    </section>
  );
}


/* ===========================================================
   COMPONENTE — IMPACTO ESPERADO CON RECHARTS
   =========================================================== */

type ImpactTone =
  | "GREEN"
  | "LIME"
  | "TEAL"
  | "BLUE";

function ImpactMetric({
  label,
  value,
  helper,
  progress,
  tone,
  icon,
}: {
  readonly label: string;
  readonly value: string;
  readonly helper: string;
  readonly progress: number;
  readonly tone: ImpactTone;
  readonly icon: string;
}) {
  const normalizedProgress =
    Math.max(
      0,
      Math.min(progress, 100),
    );

  const chartData = [
    {
      name: label,
      value: normalizedProgress,
    },
  ];


  const chartColors: Record<
    ImpactTone,
    string
  > = {
    GREEN: "#30b76a",
    LIME: "#a7d91e",
    TEAL: "#15b7a9",
    BLUE: "#2e9ec8",
  };


  return (
    <article
      className={[
        "impactMetric",
        `impactMetric--${tone.toLowerCase()}`,
      ].join(" ")}
    >

      <span className="impactMetric__icon">
        <img
          src={icon}
          alt=""
          aria-hidden="true"
        />
      </span>


      <span className="impactMetric__label">
        {label}
      </span>


      <strong>
        {value}
      </strong>


      {/* =====================================
          Barra Recharts real
          ===================================== */}

      <div className="impactMetric__chart">

        <ResponsiveContainer
          width="100%"
          height="100%"
        >

          <BarChart
            data={chartData}
            layout="vertical"
            margin={{
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
            }}
          >

            <XAxis
              type="number"
              domain={[0, 100]}
              hide
            />

            <YAxis
              type="category"
              dataKey="name"
              hide
            />

            <Bar
              dataKey="value"
              fill={chartColors[tone]}
              background={{
                fill: "#e4ece7",
              }}
              barSize={7}
              radius={[
                999,
                999,
                999,
                999,
              ]}
              isAnimationActive
              animationDuration={650}
            />

          </BarChart>

        </ResponsiveContainer>

      </div>


      <small>
        {helper}
      </small>

    </article>
  );
}


/* ===========================================================
   HELPERS — ICONOS
   =========================================================== */

function recommendationIcon(
  recommendation: Recommendation,
): string {
  if (
    recommendation.expectedImpact
      .impactArea === "CROP_HEALTH"
  ) {
    return nutritionIcon;
  }

  const { priority } = recommendation;

  if (priority === "URGENT") {
    return waterIcon;
  }

  if (priority === "HIGH") {
    return bugIcon;
  }

  if (priority === "MEDIUM") {
    return aiRecommendationIcon;
  }

  return protectionIcon;
}


/* ===========================================================
   HELPERS — TONOS
   =========================================================== */

function priorityTone(
  value: Recommendation["priority"],
):
  | "danger"
  | "high"
  | "warning"
  | "success" {
  if (value === "URGENT") {
    return "danger";
  }

  if (value === "HIGH") {
    return "high";
  }

  if (value === "MEDIUM") {
    return "warning";
  }

  return "success";
}


function priorityBadgeTone(
  value: Recommendation["priority"],
):
  | "DANGER"
  | "WARNING"
  | "SUCCESS" {
  if (
    value === "URGENT" ||
    value === "HIGH"
  ) {
    return "DANGER";
  }

  if (value === "MEDIUM") {
    return "WARNING";
  }

  return "SUCCESS";
}


/* ===========================================================
   HELPERS — TÍTULO
   =========================================================== */

function recommendationTitle(
  recommendation: Recommendation,
): string {
  switch (
    recommendation.expectedImpact
      .impactArea
  ) {
    case "WATER_SAVING":
      return "Riego";

    case "DISEASE_PREVENTION":
      return "Manejo de plagas";

    case "CROP_HEALTH":
      return "Nutrición";

    case "YIELD_PROTECTION":
      return "Protección del cultivo";

    case "COST_REDUCTION":
      return "Eficiencia operativa";

    default:
      return "Recomendación agrícola";
  }
}


/* ===========================================================
   HELPERS — EVIDENCIA
   =========================================================== */

function formatEvidenceMetric(
  metric: string,
): string {
  const labels: Record<
    string,
    string
  > = {
    soilMoisturePercentage:
      "Humedad del suelo",

    relativeHumidityPercentage:
      "Humedad relativa",

    ndvi:
      "NDVI",

    ndwi:
      "NDWI",

    gndvi:
      "GNDVI",

    soilTemperature:
      "Temp. del suelo",

    temperatureCelsius:
      "Temperatura",

    prediction:
      "Predicción",
  };

  return (
    labels[metric] ??
    metric.replace(
      /([a-z])([A-Z])/g,
      "$1 $2",
    )
  );
}


function formatEvidenceStatus(
  status: string,
): string {
  if (status === "CRITICAL") {
    return "Crítico";
  }

  if (status === "WARNING") {
    return "Advertencia";
  }

  if (status === "WATCH") {
    return "Vigilar";
  }

  return "Normal";
}


/* ===========================================================
   HELPERS — PRIORIDAD
   =========================================================== */

function formatPriority(
  value: Recommendation["priority"],
): string {
  if (value === "URGENT") {
    return "Crítica";
  }

  if (value === "HIGH") {
    return "Alta";
  }

  if (value === "MEDIUM") {
    return "Media";
  }

  return "Baja";
}


/* ===========================================================
   HELPERS — ESTADO
   =========================================================== */

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


/* ===========================================================
   HELPER — FECHA
   =========================================================== */

function formatDate(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    "es-NI",
    {
      dateStyle: "short",
    },
  ).format(
    new Date(value),
  );
}

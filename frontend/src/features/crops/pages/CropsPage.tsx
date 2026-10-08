/**
 * =========================================
 * AgroVision — CropsPage
 * =========================================
 *
 * Pantalla principal del módulo de Cultivos.
 *
 * Responsabilidades:
 * - cargar perfiles agrícolas;
 * - mostrar métricas agregadas;
 * - visualizar perfiles, riesgos e insights;
 * - identificar el cultivo prioritario;
 * - presentar actividad reciente.
 *
 * IMPORTANTE:
 * - no contiene lógica de dominio nueva;
 * - conserva servicios, estados y cálculos existentes;
 * - los cambios de este archivo son principalmente visuales;
 * - crops.css controla la adaptación responsive.
 */

import { useEffect, useMemo, useState } from "react";

import { MetricCard } from "../../../shared/components/ui/MetricCard";
import { Panel } from "../../../shared/components/ui/Panel";
import { StatusBadge } from "../../../shared/components/ui/StatusBadge";

import { getCropProfiles } from "../services/cropProfilesService";
import type {
  CropProfile,
  CropRiskType,
} from "../types/cropProfile.types";

import "../crops.css";
import beansImage from '../../../assets/images/frijol-rojo.jpg'
import cornImage from '../../../assets/images/maiz-image.jpg'
import sojaImage from '../../../assets/images/soja-images.jpg'
import naranjoImage from '../../../assets/images/naranjo-image.jfif'
import yucaImage from '../../../assets/images/yuca-image.jpg'
import quequisqueImage from '../../../assets/images/quequisque-image.jpg'


/* =========================================
   Recursos visuales compartidos
   ========================================= */

import arrowRightIcon from "../../../assets/icons/arrow2-icon.png";
import waterIcon from "../../../assets/icons/water-icon.svg";
import bugIcon from "../../../assets/icons/bug-icon.svg";
import warningIcon from "../../../assets/icons/warning-icon.svg";

/* =========================================
   Página
   ========================================= */

export function CropsPage() {
  const [profiles, setProfiles] = useState<ReadonlyArray<CropProfile>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfiles() {
      try {
        setProfiles(await getCropProfiles());
        setErrorMessage(null);
      } catch {
        setErrorMessage("No se pudieron cargar los perfiles.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadProfiles();
  }, []);

  /**
   * El cultivo priorizado continúa calculándose exactamente
   * como antes: el que posea mayor número de riesgos principales.
   */
  const priorityCrop = useMemo(() => {
    return (
      [...profiles].sort(
        (a, b) => b.mainRisks.length - a.mainRisks.length,
      )[0] ?? null
    );
  }, [profiles]);

  if (isLoading) {
    return (
      <section className="avState">
        <strong>Cargando cultivos</strong>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="avState">
        <strong>{errorMessage}</strong>
      </section>
    );
  }

  /**
   * Total agregado de riesgos configurados.
   * Se conserva el cálculo original.
   */
  const riskCount = profiles.reduce(
    (total, profile) => total + profile.mainRisks.length,
    0,
  );

  const cropCoverImages = [
    beansImage,
    yucaImage,
    sojaImage,
    naranjoImage,
    cornImage,
    quequisqueImage
  ];

  return (
    <section className="avScreen cropsFigma">
      <h1 className="avScreenTitle">Inventario verde</h1>

      {/* =====================================
          MÉTRICAS SUPERIORES
          ===================================== */}
      <section className="avMetricGrid">
        <MetricCard
          title="Cultivos monitoreados"
          value={profiles.length}
          description="Cultivos estratégicos"
          progress={92}
          actionLabel="Ver detalles"
        />

        <MetricCard
          title="Riesgos monitoreados"
          value={riskCount}
          description="Riesgos configurados"
          progress={78}
          tone="TEAL"
          actionLabel="Ver riesgos"
        />

        <MetricCard
          title="Riesgo promedio"
          value={riskCount > profiles.length * 2 ? "Medio" : "Bajo"}
          description="Estado agregado"
          progress={64}
          tone="AMBER"
          actionLabel="Ver desglose"
        />
      </section>

      {/* =====================================
          PERFILES AGRÍCOLAS
          ===================================== */}
      <Panel
        title="Perfiles agrícolas"
        showInfo={false}
        className="cropsPanel cropsProfilesPanel"
        headerAction={
          <button
            type="button"
            className="cropsHeaderAction"
          >
            <span>Ver todos</span>

            <img
              src={arrowRightIcon}
              alt=""
              aria-hidden="true"
            />
          </button>
        }
      >
        <div className="cropProfileStrip">
          {profiles.slice(0, 5).map((profile, index) => (
            <article
              key={profile.cropType}
              className="figmaCropCard"
              data-crop={profile.cropType}
            >
              <div className="figmaCropCard__cover">
                <img
                  src={cropCoverImages[index]}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                />
              </div>
              <header>
                <span
                  className="figmaCropAvatar"
                  aria-hidden="true"
                >
                  <img
                    src={cropCoverImages[index]}
                    alt=""
                  />
                </span>

                <strong title={profile.displayName}>
                  {profile.displayName}
                </strong>

                <button
                  type="button"
                  className="figmaCropMenu"
                  aria-label={`Opciones de ${profile.displayName}`}
                >
                  •••
                </button>
              </header>

              <CropProfileRow
                label="Estado"
                value="Bueno"
                tone="SUCCESS"
              />

              <CropProfileRow
                label="Riesgo dom."
                value={formatRisk(profile.mainRisks[0])}
                tone="WARNING"
              />

              <div className="figmaCropSensitivity">
                <span>Sensibilidad hídrica</span>

                <div aria-label="Sensibilidad hídrica alta">
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </div>

              <button
                type="button"
                className="cropsActionButton cropsActionButton--card"
              >
                <span>Ver perfil</span>

                <img
                  src={arrowRightIcon}
                  alt=""
                  aria-hidden="true"
                />
              </button>
            </article>
          ))}
        </div>
      </Panel>

      {/* =====================================
          MATRIZ + PRIORIDAD + INSIGHTS
          ===================================== */}
      <section className="cropsFigma__middle">
        {/* ===================================
            MATRIZ DE RIESGO
            =================================== */}
        <Panel
          title="Matriz de riesgo por cultivo"
          className="cropsPanel cropsRiskPanel"
        >
          <div className="cropRiskMatrix">
            <div className="cropRiskMatrix__head">
              <strong>Cultivo</strong>
              <span>Estrés hídrico</span>
              <span>Plagas</span>
              <span>Enfermedad foliar</span>
              <span>Deficiencia Nut.</span>
              <span>Calor</span>
            </div>

            {profiles.slice(0, 5).map((profile) => (
              <div
                key={`matrix-${profile.cropType}`}
                className="cropRiskMatrix__row"
              >
                <strong title={profile.displayName}>
                  {profile.displayName}
                </strong>

                <RiskDot
                  active={profile.mainRisks.includes(
                    "WATER_STRESS",
                  )}
                />

                <RiskDot
                  active={profile.mainRisks.includes(
                    "VISUAL_ANOMALY",
                  )}
                  warning
                />

                <RiskDot
                  active={profile.mainRisks.includes(
                    "FUNGAL_RISK",
                  )}
                />

                <RiskDot
                  active={profile.mainRisks.includes(
                    "NUTRIENT_STRESS",
                  )}
                  warning
                />

                <RiskDot
                  active={profile.mainRisks.includes(
                    "HEAT_STRESS",
                  )}
                  warning
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            className="cropsActionButton cropsActionButton--center"
          >
            <span>Ver matriz completa</span>

            <img
              src={arrowRightIcon}
              alt=""
              aria-hidden="true"
            />
          </button>
        </Panel>

        {/* ===================================
            CULTIVO PRIORIZADO
            =================================== */}
        <Panel
          title="Cultivo priorizado"
          className="cropsPanel cropsPriorityPanel"
        >
          {priorityCrop && (
            <div
              className="priorityCrop"
              data-crop={priorityCrop.cropType}
            >
              <header>
                <span
                  className="priorityCrop__image"
                  aria-hidden="true"
                />

                <div className="priorityCrop__identity">
                  <strong title={priorityCrop.displayName}>
                    {priorityCrop.displayName}
                  </strong>
                </div>

                <StatusBadge tone="SUCCESS">
                  Bueno
                </StatusBadge>
              </header>

              <div className="priorityCrop__riskList">
                {priorityCrop.mainRisks
                  .slice(0, 5)
                  .map((risk, index) => (
                    <div
                      key={risk}
                      className="priorityCrop__riskRow"
                    >
                      <span>Métrica {index + 1}</span>

                      <strong>
                        {formatRisk(risk)}
                      </strong>
                    </div>
                  ))}
              </div>

              <aside>
                <strong>Enfoque recomendado</strong>

                <p>
                  {
                    priorityCrop.recommendationTemplates
                      .inspection
                  }
                </p>
              </aside>

              <button
                type="button"
                className="cropsActionButton cropsActionButton--center"
              >
                <span>Ver perfil completo</span>

                <img
                  src={arrowRightIcon}
                  alt=""
                  aria-hidden="true"
                />
              </button>
            </div>
          )}
        </Panel>

        {/* ===================================
            INSIGHTS
            =================================== */}
        <Panel
          title="Insights por cultivo"
          className="cropsPanel cropsInsightsPanel"
        >
          <div className="cropInsightList">
            <CropInsight
              title="Estrés hídrico"
              description="Riesgo prioritario en cultivos sensibles."
              icon={waterIcon}
              tone="BLUE"
            />

            <CropInsight
              title="Enfermedades foliares"
              description="Mantener inspección visual."
              icon={bugIcon}
              tone="GREEN"
            />

            <CropInsight
              title="Ola de calor"
              description="Monitorear temperatura y vigor."
              icon={warningIcon}
              tone="AMBER"
            />
          </div>

          <button
            type="button"
            className="cropsActionButton cropsActionButton--center"
          >
            <span>Ver todos los insights</span>

            <img
              src={arrowRightIcon}
              alt=""
              aria-hidden="true"
            />
          </button>
        </Panel>
      </section>

      {/* =====================================
          ACTIVIDAD RECIENTE
          ===================================== */}
      <Panel
        title="Actividad reciente por cultivo"
        className="cropsPanel cropsActivityPanel"
      >
        <div className="avTableWrap cropsActivityTableWrap">
          <table className="avTable cropsActivityTable">
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Cultivo</th>
                <th>Actividad</th>
                <th>Detalle</th>
                <th>Fuente</th>
                <th>Prioridad</th>
              </tr>
            </thead>

            <tbody>
              {profiles
                .slice(0, 4)
                .map((profile, index) => (
                  <tr
                    key={`activity-${profile.cropType}`}
                  >
                    <td>
                      Hoy, 09:{30 + index}
                    </td>

                    <td>{profile.displayName}</td>

                    <td>
                      {formatRisk(
                        profile.mainRisks[0],
                      )}
                    </td>

                    <td
                      title={
                        profile
                          .recommendationTemplates
                          .inspection
                      }
                    >
                      {
                        profile
                          .recommendationTemplates
                          .inspection
                      }
                    </td>

                    <td>AgroVision AI</td>

                    <td>
                      <StatusBadge
                        tone={
                          index === 0
                            ? "DANGER"
                            : index < 3
                              ? "WARNING"
                              : "SUCCESS"
                        }
                      >
                        {index === 0
                          ? "Alta"
                          : index < 3
                            ? "Media"
                            : "Baja"}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          className="cropsActionButton cropsActionButton--center cropsActivityAction"
        >
          <span>Ver toda la actividad</span>

          <img
            src={arrowRightIcon}
            alt=""
            aria-hidden="true"
          />
        </button>
      </Panel>
    </section>
  );
}

/* ===========================================================
   COMPONENTE — FILA DE PERFIL
   =========================================================== */

/**
 * Fila compacta utilizada dentro de una tarjeta de cultivo.
 *
 * Se mantiene independiente para asegurar:
 * - alineación consistente;
 * - badges homogéneos;
 * - mejor adaptación responsive.
 */
function CropProfileRow({
  label,
  value,
  tone,
}: {
  readonly label: string;
  readonly value: string;
  readonly tone: "SUCCESS" | "WARNING";
}) {
  return (
    <div className="figmaCropRow">
      <span>{label}</span>

      <StatusBadge tone={tone}>
        {value}
      </StatusBadge>
    </div>
  );
}

/* ===========================================================
   COMPONENTE — INDICADOR DE RIESGO
   =========================================================== */

/**
 * Punto semántico para la matriz de riesgo.
 *
 * active:
 * - riesgo detectado.
 *
 * warning:
 * - riesgo con énfasis preventivo.
 */
function RiskDot({
  active,
  warning = false,
}: {
  readonly active: boolean;
  readonly warning?: boolean;
}) {
  return (
    <i
      className={
        active
          ? warning
            ? "cropRiskDot cropRiskDot--warning"
            : "cropRiskDot cropRiskDot--active"
          : "cropRiskDot"
      }
    />
  );
}

/* ===========================================================
   COMPONENTE — INSIGHT
   =========================================================== */

type CropInsightTone =
  | "BLUE"
  | "GREEN"
  | "AMBER";

/**
 * Insight operativo de cultivo.
 *
 * El icono y el tono son exclusivamente visuales.
 * No modifican información ni lógica agrícola.
 */
function CropInsight({
  title,
  description,
  icon,
  tone,
}: {
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly tone: CropInsightTone;
}) {
  return (
    <article
      className={`cropInsight cropInsight--${tone.toLowerCase()}`}
    >
      <span className="cropInsight__icon">
        <img
          src={icon}
          alt=""
          aria-hidden="true"
        />
      </span>

      <div className="cropInsight__copy">
        <strong>{title}</strong>

        <p>{description}</p>
      </div>

      <img
        src={arrowRightIcon}
        alt=""
        aria-hidden="true"
        className="cropInsight__arrow"
      />
    </article>
  );
}

/* ===========================================================
   HELPER — FORMATEO DE RIESGO
   =========================================================== */

/**
 * Convierte identificadores de dominio:
 *
 * WATER_STRESS
 *
 * en:
 *
 * WATER STRESS
 *
 * sin alterar el valor almacenado.
 */
function formatRisk(
  value?: CropRiskType,
): string {
  return value?.replaceAll("_", " ") ?? "Bajo";
}
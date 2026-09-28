import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "../../../shared/components/ui/MetricCard";
import { Panel } from "../../../shared/components/ui/Panel";
import { StatusBadge } from "../../../shared/components/ui/StatusBadge";
import { getCropProfiles } from "../services/cropProfilesService";
import type { CropProfile, CropRiskType } from "../types/cropProfile.types";
import "../crops.css";

export function CropsPage() {
  const [profiles, setProfiles] = useState<ReadonlyArray<CropProfile>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfiles() {
      try {
        setProfiles(await getCropProfiles());
      } catch {
        setErrorMessage("No se pudieron cargar los perfiles.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadProfiles();
  }, []);

  const priorityCrop = useMemo(() => {
    return [...profiles].sort((a, b) => b.mainRisks.length - a.mainRisks.length)[0] ?? null;
  }, [profiles]);

  if (isLoading) return <section className="avState"><strong>Cargando cultivos</strong></section>;
  if (errorMessage) return <section className="avState"><strong>{errorMessage}</strong></section>;

  const riskCount = profiles.reduce((total, profile) => total + profile.mainRisks.length, 0);

  return (
    <section className="avScreen cropsFigma">
      <section className="avMetricGrid">
        <MetricCard title="Cultivos monitoreados" value={profiles.length} description="Cultivos estratégicos" progress={92} actionLabel="Ver detalles" />

        <MetricCard title="Riesgos monitoreados" value={riskCount} description="Riesgos configurados" progress={78} tone="TEAL" actionLabel="Ver riesgos" />

        <MetricCard title="Riesgo promedio" value={riskCount > profiles.length * 2 ? "Medio" : "Bajo"} description="Estado agregado" progress={64} tone="AMBER" actionLabel="Ver desglose" />
      </section>

      <Panel title="Perfiles agrícolas" showInfo={false}>
        <div className="cropProfileStrip">
          {profiles.slice(0, 5).map((profile) => (
            <article key={profile.cropType} className="figmaCropCard">
              <header>
                <span className="figmaCropAvatar">{/* Imagen cultivo */}</span>

                <strong>{profile.displayName}</strong>

                <button type="button">•••</button>
              </header>

              <CropProfileRow label="Estado" value="Bueno" tone="SUCCESS" />
              <CropProfileRow label="Riesgo dom." value={formatRisk(profile.mainRisks[0])} tone="WARNING" />

              <div className="figmaCropSensitivity">
                <span>Sensibilidad hídrica</span>

                <div>
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </div>

              <button type="button" className="avTextAction figmaCropAction">Ver perfil →</button>
            </article>
          ))}
        </div>
      </Panel>

      <section className="cropsFigma__middle">
        <Panel title="Matriz de riesgo por cultivo">
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
              <div key={`matrix-${profile.cropType}`} className="cropRiskMatrix__row">
                <strong>{profile.displayName}</strong>

                <RiskDot active={profile.mainRisks.includes("WATER_STRESS")} />
                <RiskDot active={profile.mainRisks.includes("VISUAL_ANOMALY")} warning />
                <RiskDot active={profile.mainRisks.includes("FUNGAL_RISK")} />
                <RiskDot active={profile.mainRisks.includes("NUTRIENT_STRESS")} warning />
                <RiskDot active={profile.mainRisks.includes("HEAT_STRESS")} warning />
              </div>
            ))}
          </div>

          <button type="button" className="avTextAction cropsCenteredAction">Ver matriz completa →</button>
        </Panel>

        <Panel title="Cultivo priorizado">
          {priorityCrop && (
            <div className="priorityCrop">
              <header>
                <span className="priorityCrop__image">{/* Cultivo */}</span>
                <strong>{priorityCrop.displayName}</strong>
              </header>

              {priorityCrop.mainRisks.slice(0, 5).map((risk, index) => (
                <div key={risk}>
                  <span>Métrica {index + 1}</span>
                  <strong>{formatRisk(risk)}</strong>
                </div>
              ))}

              <aside>
                <strong>Enfoque recomendado</strong>
                <p>{priorityCrop.recommendationTemplates.inspection}</p>
              </aside>

              <button type="button" className="avTextAction cropsCenteredAction">Ver perfil completo →</button>
            </div>
          )}
        </Panel>

        <Panel title="Insights por cultivo">
          <div className="cropInsightList">
            <CropInsight title="Estrés hídrico" description="Riesgo prioritario en cultivos sensibles." />
            <CropInsight title="Enfermedades foliares" description="Mantener inspección visual." />
            <CropInsight title="Ola de calor" description="Monitorear temperatura y vigor." />
          </div>

          <button type="button" className="avTextAction cropsCenteredAction">Ver todos los insights →</button>
        </Panel>
      </section>

      <Panel title="Actividad reciente por cultivo">
        <div className="avTableWrap">
          <table className="avTable">
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
              {profiles.slice(0, 4).map((profile, index) => (
                <tr key={`activity-${profile.cropType}`}>
                  <td>Hoy, 09:{30 + index}</td>
                  <td>{profile.displayName}</td>
                  <td>{formatRisk(profile.mainRisks[0])}</td>
                  <td>{profile.recommendationTemplates.inspection}</td>
                  <td>AgroVision AI</td>
                  <td><StatusBadge tone={index === 0 ? "DANGER" : index < 3 ? "WARNING" : "SUCCESS"}>{index === 0 ? "Alta" : index < 3 ? "Media" : "Baja"}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button type="button" className="avTextAction cropsCenteredAction">Ver toda la actividad →</button>
      </Panel>
    </section>
  );
}

function CropProfileRow({ label, value, tone }: { readonly label: string; readonly value: string; readonly tone: "SUCCESS" | "WARNING" }) {
  return (
    <div className="figmaCropRow">
      <span>{label}</span>
      <StatusBadge tone={tone}>{value}</StatusBadge>
    </div>
  );
}

function RiskDot({ active, warning = false }: { readonly active: boolean; readonly warning?: boolean }) {
  return <i className={active ? warning ? "cropRiskDot cropRiskDot--warning" : "cropRiskDot cropRiskDot--active" : "cropRiskDot"} />;
}

function CropInsight({ title, description }: { readonly title: string; readonly description: string }) {
  return (
    <article className="cropInsight">
      <span>{/* SVG */}</span>

      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </article>
  );
}

function formatRisk(value?: CropRiskType): string {
  return value?.replaceAll("_", " ") ?? "Bajo";
}
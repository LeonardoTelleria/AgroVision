import type { CSSProperties, ReactNode } from "react";


// interfaz para los desgloses de lista opcionales (Card 1 y Card 2)
interface MetricDetailItem {
  label: string;
  value: string | number;
  color: string; // Color del punto indicador (ej: '#a3e635')
}

interface MetricCardProps {
  readonly title: string;
  readonly value: string | number;
  readonly valueSuffix?: string;
  readonly description: string;
  readonly actionLabel?: string;
  readonly progress?: number;
  readonly tone?: "LIME" | "AMBER" | "TEAL";
  readonly icon?: ReactNode;
  readonly details?: MetricDetailItem[]; // lista de tallada de metricas a la derecha 
  readonly subBadge?: ReactNode   // Para el "+6% vs semana anterior"
}

export function MetricCard({ title, value, valueSuffix, description, actionLabel, progress = 72, tone = "LIME", icon, details, subBadge }: MetricCardProps) {
  const normalizedProgress = Math.max(0, Math.min(progress, 100));

  const ringStyle = {
    "--av-ring-progress": `${normalizedProgress * 3.6}deg`,
  } as CSSProperties;

  return (
    <article className={`avMetricCard avMetricCard--${tone.toLowerCase()}`}>

       {/* HEADER: Título + Icono Informativo universal */}
      <header className="avMetricCard__header">
        <div className="avMetricCard__titleRow">
          <span>{title}</span>
          <span className="avMetricCard__infoIcon" title="Más información">ⓘ</span>
        </div>
        {/* Espacio para iconos flotantes superiores (como la campana de notificaciones de la Card 2) */}
        {tone === "AMBER" && icon && <div className="avMetricCard__headerIcon">{icon}</div>}
      </header>

      {/* BODY: Dividido de forma asimétrica en dos bloques */}
      <div className="avMetricCard__body">
        
        {/* Columna Izquierda: Gráfico/Anillo y Valor principal */}
        <div className="avMetricCard__mainSection">
          {/* se oculta el anillo base en la Card 2 si se prefiere el número gigante limpio */}
          {tone !== "AMBER" && (
            <div className="avMetricRing" style={ringStyle}>
              <div className="avMetricRing__center">
                {tone === "LIME" ? (
                  <div className="avMetricRing__innerValue">
                    <strong>{value}</strong>
                    {valueSuffix && <small>{valueSuffix}</small>}
                  </div>
                ) : (
                  icon /* Carga la planta de forma limpia en la tarjeta TEAL */
                )}
              </div>
            </div>
          )}

          {/* Bloque de texto numérico para las tarjetas que no lo llevan dentro del anillo */}
          {(tone === "AMBER" || tone === "TEAL") && (
            <div className="avMetricCard__numericDisplay">
              <div className="avMetricCard__value">
                <strong>{value}</strong>
                {valueSuffix && <span className="topbar__valueSuffix">{valueSuffix}</span>}
              </div>
              {description && <p className="avMetricCard__subLabel">{description}</p>}
            </div>
          )}
        </div>

        {/* Columna Derecha: Lista de desgloses de la maqueta */}
        {details && details.length > 0 && (
          <div className="avMetricCard__detailsSection">
            <div className="avMetricCard__detailsList">
              {details.map((item, idx) => (
                <div key={idx} className="avMetricCard__detailItem">
                  <span className="avMetricCard__detailLabel">
                    <span 
                      className="avMetricCard__detailDot" 
                      style={{ backgroundColor: item.color }} 
                    />
                    {item.label}
                  </span>
                  <span className="avMetricCard__detailValue">{item.value}</span>
                </div>
              ))}
            </div>
            
            {/* Badge inferior opcional (ej: vs semana anterior) */}
            {subBadge && <div className="avMetricCard__subBadge">{subBadge}</div>}
          </div>
        )}

      </div>


      {actionLabel && <button type="button" className="avMetricCard__action">{actionLabel} <span>→</span></button>}
    </article>
  );
}
import type { CSSProperties, ReactNode } from "react";
import infoIcon from '../../../assets/icons/info-icon.svg';

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
  readonly ringLabel?: string; // Nuevo: Soporte para texto secundario dentro del anillo (ej: "Buena")
  readonly description: string;
  readonly actionLabel?: string;
  readonly progress?: number;
  readonly tone?: "LIME" | "AMBER" | "TEAL";
  readonly showRing?: boolean;
  readonly showDescriptionWithRing?: boolean;
  readonly icon?: ReactNode;
  readonly details?: MetricDetailItem[]; // lista detallada de metricas a la derecha 
  readonly subBadge?: ReactNode;  // Para el "+6% vs semana anterior"
}

export function MetricCard({ 
  title, 
  value, 
  valueSuffix, 
  ringLabel,
  description, 
  actionLabel, 
  progress = 72, 
  tone = "LIME", 
  showRing = false,
  showDescriptionWithRing = false,
  icon, 
  details, 
  subBadge 
}: MetricCardProps) {
  const normalizedProgress = Math.max(0, Math.min(progress, 100));

  const ringStyle = {
    "--av-ring-progress": `${normalizedProgress * 3.6}deg`,
  } as CSSProperties;

  return (
    <article className={`avMetricCard avMetricCard--${tone.toLowerCase()}`}>
      
      {/* SECCIÓN SUPERIOR Y CONTENIDO PRINCIPAL (Garantiza empuje uniforme del footer) */}
      <div className="avMetricCard__mainContainer">

        {/* HEADER: Título + Icono Informativo universal */}
        <header className="avMetricCard__header">
          <div className="avMetricCard__titleRow">
            <span>{title}</span>
            <img src={infoIcon} alt="Más información" className="avMetricCard__infoIcon" />
          </div>
          {/* Espacio para iconos flotantes superiores (como la campana de notificaciones de la Card 2) */}
          {tone === "AMBER" && icon && <div className="avMetricCard__headerIcon">{icon}</div>}
        </header>

        {/* BODY: Dividido de forma asimétrica en dos bloques perfectos */}
        <div className="avMetricCard__body">
          
          {/* Columna Izquierda: Gráficos circulares o Números Grandes */}
          <div className="avMetricCard__leftCol">
            {/* Tarjeta LIME: Renderiza el anillo con el valor y su etiqueta interna */}
            {(tone === "LIME" || showRing) && (
              <div className="avMetricRing" style={ringStyle}>
                <div className="avMetricRing__center">
                  <div className="avMetricRing__innerValue">
                    <span className="avMetricRing__number">
                      {value}
                      {valueSuffix && <small>{valueSuffix}</small>}
                    </span>
                    {ringLabel && <span className="avMetricRing__label">{ringLabel}</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Tarjetas AMBER y TEAL: Renderizan el número gigante limpio a la izquierda */}
            {tone !== "LIME" && !showRing && (
              <div className="avMetricCard__bigNumberBlock">
                <div className="avMetricCard__value">
                  <strong>{value}</strong>
                  {valueSuffix && <span className="topbar__valueSuffix">{valueSuffix}</span>}
                </div>
                {description && <p className="avMetricCard__subLabel">{description}</p>}
              </div>
            )}
          </div>

          {/* Columna Derecha: Listas de desglose o Ilustraciones decorativas */}
          <div className="avMetricCard__rightCol">
            {showDescriptionWithRing ? (
              <p className="avMetricCard__ringDescription">{description}</p>
            ) : details && details.length > 0 ? (
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
            ) : (
              /* Tarjeta TEAL: Coloca la planta orbital limpia en la columna derecha */
              tone === "TEAL" && icon && (
                <div className="avMetricCard__decorativeIconWrapper">
                  {icon}
                </div>
              )
            )}
            
            {/* Badge inferior opcional (ej: vs semana anterior) */}
            {subBadge && <div className="avMetricCard__subBadge">{subBadge}</div>}
          </div>

        </div>
      </div>

      {/* FOOTER: Enlace de acción inferior acotado con línea divisoria fina */}
      {actionLabel && (
        <footer className="avMetricCard__footer">
          <button type="button" className="avMetricCard__action">
            {actionLabel} <span>→</span>
          </button>
        </footer>
      )}
    </article>
  );
}
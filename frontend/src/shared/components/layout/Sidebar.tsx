/**
 * =========================================
 * Sidebar
 * =========================================
 *
 * Navegación principal persistente.
 *
 * UX:
 * - siempre fija a la izquierda;
 * - nunca se transforma en navbar horizontal;
 * - no tiene scroll propio;
 * - puede reducirse;
 * - en modo compacto muestra tooltip glass.
 */

import { ROUTES, type AppRoutePath } from '../../../app/AppRouter';
import agroVisionLogo from '../../../assets/logos/imagotipo-V-clara.svg';
import settingsIcon from '../../../assets/icons/settings-icon.svg';
import helpIcon from '../../../assets/icons/help-circle.svg';
import weatherImage from '../../../assets/images/weather-images.webp'

interface SidebarProps {
  readonly activePath: AppRoutePath;
  readonly isCollapsed: boolean;
  readonly onNavigate: (path: AppRoutePath) => void;
  readonly onToggle: () => void;
}

export function Sidebar({
  activePath,
  isCollapsed,
  onNavigate,
  onToggle,
}: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Navegación principal">
      <div className="sidebar__brand">
        <img src={agroVisionLogo} alt="AgroVision" />
      </div>

      <button
        type="button"
        className="sidebar__toggle"
        aria-label={isCollapsed ? 'Expandir navegación' : 'Reducir navegación'}
        onClick={onToggle}
      >
        {isCollapsed ? '>' : '<'}
      </button>

      <nav className="sidebar__nav">
        {ROUTES.map((route) => {
          const isActive = route.path === activePath;

          return (
            <button
              key={route.path}
              type="button"
              className={isActive ? 'sidebar__link is-active' : 'sidebar__link'}
              data-label={route.label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onNavigate(route.path)}
            >
              <span
                className="sidebar__iconSlot"
                data-route={route.path}
                aria-hidden="true"
              >
                <img
                  src={route.icon}
                  alt="icono de inicio"
                  className="sidebar__icon"
                />
              </span>
              <span className="sidebar__linkLabel">{route.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar__secondary">
        <button type="button" className="sidebar__secondaryLink">
          <span className="sidebar__iconSlot" aria-hidden="true">
            <img
              src={helpIcon}
              alt="icono de ayuda"
              className="sidebar-secondary__icon"
            />
          </span>
          <span>Ayuda</span>
        </button>

        <button type="button" className="sidebar__secondaryLink">
          <span className="sidebar__iconSlot" aria-hidden="true">
            <img
              src={settingsIcon}
              alt="icono de ajustes"
              className="sidebar-secondary__icon"
            />
          </span>
          <span>Configuración</span>
        </button>
      </div>

      <div className="sidebar__weather" data-label="Clima: 22°C">
        <div className="sidebar__weatherMain">
          <div className="sidebar__weatherIcon">
            <img src={weatherImage} alt="icono del clima" />
          </div>
          <div className="sidebar__weatherTemp">
            <strong>22°C</strong>
            <small>Pacialmente nublado</small>
          </div>
        </div>

        <div className="sidebar__weatherStats">
          <span>Viento: 15 km/h</span>
          <span className="sidebar__weatherDivider">|</span>
          <span>Humedad: 68%</span>
        </div>
        <button type="button" className="sidebar__weatherBtn">
          Ver pronóstico
        </button>
      </div>
    </aside>
  );
}

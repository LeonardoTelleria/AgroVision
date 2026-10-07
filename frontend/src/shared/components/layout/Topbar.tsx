//caberecera genral del proyecto, posible espacio futuro para el apartado de perfil 

/**
* =========================================
* Topbar
* =========================================
*
* Cabecera compacta de AgroVision.
*
* No contiene lógica agrícola.
* Solo muestra contexto global y controles visuales.
*/
/**
 * =========================================
 * Topbar
 * =========================================
 *
 * Réplica estructural de la maqueta.
 *
 * Título | Search | Campo | Fecha | Bell | Perfil
 */

import { useState } from "react";
import searchIcon from '../../../assets/icons/search-icon.svg';
import fieldIcon from '../../../assets/icons/all-field-icon.svg';
import calendarIcon from '../../../assets/icons/calendar-icon.svg';
import notificationIcon from '../../../assets/icons/bell-ring.svg';
import profileImage from '../../../assets/images/foto-perfil-example.png';

interface TopbarProps {
  readonly activeLabel: string;
}

type ActivePopover = "FIELD" | "DATE" | "NOTIFICATIONS" | "PROFILE" | null;

export function Topbar({ activeLabel }: TopbarProps) {
  const [activePopover, setActivePopover] = useState<ActivePopover>(null);
  
  // Estados para controlar las opciones seleccionadas (Custom Selects)
  const [selectedField, setSelectedField] = useState("Todos los campos");
  const [selectedDate, setSelectedDate] = useState("12 – 18 May 2025");

  function togglePopover(popover: Exclude<ActivePopover, null>) {
    setActivePopover((currentPopover) => currentPopover === popover ? null : popover);
  }

  const handleSelectField = (fieldName: string) => {
    setSelectedField(fieldName);
    setActivePopover(null); 
  };

  const handleSelectDate = (dateRange: string) => {
    setSelectedDate(dateRange);
    setActivePopover(null); 
  };

  return (
    <header className="topbar">
      <div className="topbar__searchContainer">
        <label className="topbar__search">
          <img src={searchIcon} alt="" className="topbar__searchIcon" />
          {/* REINTEGRACIÓN: Aquí se ejecuta dinámicamente tu función usando activeLabel */}
          <input 
            type="search" 
            placeholder={getSearchPlaceholder(activeLabel)} 
            aria-label="Buscar" 
          />
      
        </label>
      </div>

      <div className="topbar__actions">
        {/* SELECT DE CAMPOS */}
        <div className="topbar__popoverAnchor">
          <button 
            type="button" 
            className={`topbar__selectButton ${activePopover === "FIELD" ? "is-open" : ""}`}
            onClick={() => togglePopover("FIELD")}
          >
            <img src={fieldIcon} alt="" className="topbar__buttonIcon" />
            <span>{selectedField}</span>
            <span className="topbar__chevron" />
          </button>

          {activePopover === "FIELD" && (
            <div className="topbar__popover">
              <span className="topbar__popoverHeader">Seleccionar campo</span>
              <button type="button" onClick={() => handleSelectField("Todos los campos")}>
                <span>Todos los campos</span>
              </button>
              <button type="button" onClick={() => handleSelectField("Lote Norte")}>
                <span>Lote Norte</span>
                <small>field-001</small>
              </button>
              <button type="button" onClick={() => handleSelectField("Lote Secundario")}>
                <span>Lote Secundario</span>
                <small>field-002</small>
              </button>
            </div>
          )}
        </div>

        {/* SELECT DE PERIODOS / FECHAS */}
        <div className="topbar__popoverAnchor">
          <button 
            type="button" 
            className={`topbar__selectButton ${activePopover === "DATE" ? "is-open" : ""}`}
            onClick={() => togglePopover("DATE")}
          >
            <img src={calendarIcon} alt="" className="topbar__inlineIcon" />
            <span>{selectedDate}</span>
            <span className="topbar__chevron" />
          </button>

          {activePopover === "DATE" && (
            <div className="topbar__popover topbar__popover--date">
              <span className="topbar__popoverHeader">Periodo de análisis</span>
              <button type="button" onClick={() => handleSelectDate("Hoy")}>Hoy</button>
              <button type="button" onClick={() => handleSelectDate("Últimos 7 días")}>Últimos 7 días</button>
              <button type="button" onClick={() => handleSelectDate("12 – 18 May 2025")}>12 – 18 May 2025</button>
            </div>
          )}
        </div>

        {/* NOTIFICACIONES */}
        <div className="topbar__popoverAnchor">
          <button type="button" className="topbar__iconButton" aria-label="Notificaciones" onClick={() => togglePopover("NOTIFICATIONS")}>
            <img src={notificationIcon} alt="" className="topbar__iconSlot" />
            <span className="topbar__notificationBadge">3</span>
          </button>

          {activePopover === "NOTIFICATIONS" && (
            <div className="topbar__popover topbar__popover--notifications">
              <span className="topbar__popoverHeader">Notificaciones recientes</span>
              <article className="topbar__notificationItem">
                <span className="topbar__notificationDot" />
                <div>
                  <b>Zona crítica requiere revisión</b>
                  <small>zone-03 · field-001</small>
                </div>
              </article>
            </div>
          )}
        </div>

        {/* MENU DESPLEGABLE DE PERFIL */}
        <div className="topbar__popoverAnchor">
          <button type="button" className="topbar__profileButton" onClick={() => togglePopover("PROFILE")}>
            <div className="topbar__avatar">
              <img src={profileImage} alt="Juan Pérez" />
            </div>
            <div className="topbar__profileData">
              <strong>Juan Pérez</strong>
              <small>Productor</small>
            </div>
            <span className="topbar__chevron" />
          </button>

          {activePopover === "PROFILE" && (
            <div className="topbar__popover topbar__popover--profile">
              <div className="topbar__profileMenuHeader">
                <strong>Juan Pérez</strong>
                <span>juan.perez@agrovision.com</span>
              </div>
              <button type="button" onClick={() => setActivePopover(null)}>Mi Perfil</button>
              <button type="button" onClick={() => setActivePopover(null)}>Configuración</button>
              <hr className="topbar__popoverDivider" />
              <button type="button" className="topbar__logoutBtn" onClick={() => setActivePopover(null)}>Cerrar sesión</button>
            </div>
          )}
        </div>
      </div>

      {activePopover && <button type="button" className="topbar__dismiss" aria-label="Cerrar menú" onClick={() => setActivePopover(null)} />}
    </header>
  );
}

/**
 * REINTEGRADA: Adapta el placeholder al módulo actual.
 */
function getSearchPlaceholder(activeLabel: string): string {
  if (activeLabel === "Alertas") return "Buscar alertas...";
  if (activeLabel === "Reportes") return "Buscar reportes, campos o descripciones...";
  if (activeLabel === "Mapping") return "Buscar en el mapa...";
  if (activeLabel === "Cultivos") return "Buscar en AgroVision...";
  if (activeLabel === "Vision AI") return "Buscar en AgroVision...";
  if (activeLabel === "Cuaderno de campo") return "Buscar en AgroVision...";

  return "Buscar en AgroVision...";
}
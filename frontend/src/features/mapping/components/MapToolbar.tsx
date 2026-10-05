/**
 * =========================================
 * AgroVision Map Toolbar
 * =========================================
 *
 * Barra de herramientas para las acciones  principales de navegación del mapa GIS.
 *
 * Responsabilidad:
 * - controlar zoom;
 * - recuperar la vista inicial;
 * - controlar la orientación del mapa;
 * - permitir futuras acciones GIS;
 * - mantener la UI desacoplada de MapLibre.
 *
 * Flujo conceptual:
 *
 * MapToolbar
 *      ↓
 *   callback
 *      ↓
 * useAgroMap
 *      ↓
 *   MapLibre
 *
 * =========================================
 */


import type { FC } from "react";

/**
 * =========================================
 * PROPS
 * =========================================
 */ 

// Definimos las acciones que el toolbar necesita recibir.
export interface MapToolbarProps {
  // Aumenta el nivel de zoom del mapa.
  readonly onZoomIn: () => void;
  // Reduce el nivel de zoom del mapa.
  readonly onZoomOut: () => void;
  // Devuelve el mapa a su vista inicial.
  readonly onResetView: () => void;
  // Restablece únicamente la orientación del mapa.
  readonly onResetNorth: () => void;
  // Indica si actualmente existe una vista inclinada.
  readonly isTilted?: boolean;
  // Permite activar/desactivar la inclinación cuando se implemente.
  readonly onToggleTilt?: () => void;
}

// =========================================
// COMPONENT
// =========================================

// Componente principal del toolbar.
export const MapToolbar: FC<MapToolbarProps> = ({
  onZoomIn,
  onZoomOut,
  onResetView,
  onResetNorth,
  isTilted = false,
  onToggleTilt,
}) => {
  // Renderizamos la barra de herramientas.
  return (
    <div
      className="mapToolbar"
      aria-label="Herramientas de navegación del mapa"
    >
      {/* Grupo principal de navegación. */}
      <div className="mapToolbar__group">
        {/* Botón para acercar el mapa. */}
        <button
          type="button"
          className="mapToolbar__button"
          onClick={onZoomIn}
          title="Acercar"
          aria-label="Acercar mapa"
        >
          {/* Símbolo visual de zoom positivo. */}
          <span aria-hidden="true">+</span>
        </button>

        {/* Botón para alejar el mapa. */}
        <button
          type="button"
          className="mapToolbar__button"
          onClick={onZoomOut}
          title="Alejar"
          aria-label="Alejar mapa"
        >
          {/* Símbolo visual de zoom negativo. */}
          <span aria-hidden="true">−</span>
        </button>
      </div>

      {/* Separador visual entre grupos. */}
      <div
        className="mapToolbar__divider"
        aria-hidden="true"
      />

      {/* Grupo de orientación y vista. */}
      <div className="mapToolbar__group">
        {/* Devuelve el mapa a la orientación norte. */}
        <button
          type="button"
          className="mapToolbar__button"
          onClick={onResetNorth}
          title="Orientación norte"
          aria-label="Restablecer orientación norte"
        >
          {/* Indicador textual de norte. */}
          <span
            className="mapToolbar__north"
            aria-hidden="true"
          >
            N
          </span>
        </button>

        {/* Restablece completamente la vista inicial. */}
        <button
          type="button"
          className="mapToolbar__button"
          onClick={onResetView}
          title="Restablecer vista"
          aria-label="Restablecer vista inicial"
        >
          {/* Símbolo visual de reinicio. */}
          <span aria-hidden="true">⌂</span>
        </button>

        {/* Solo mostramos la acción si fue implementada. */}
        {onToggleTilt && (
          <button
            type="button"
            className={[
              "mapToolbar__button",
              isTilted ? "mapToolbar__button--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={onToggleTilt}
            title={
              isTilted ? "Desactivar inclinación" : "Activar inclinación"
            }
            aria-label={
              isTilted ? "Desactivar inclinación" : "Activar inclinación"
            }
            aria-pressed={isTilted}
          >
            {/* Indicador visual de inclinación. */}
            <span aria-hidden="true">3D</span>
          </button>
        )}
      </div>
    </div>
  );
};
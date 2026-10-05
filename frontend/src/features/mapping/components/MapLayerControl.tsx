/**
 * =========================================
 * AgroVision Map Layer Control
 * =========================================
 *
 * Control visual para administrar la visibilidad de las capas GIS del proyecto.
 *
 * Responsabilidad:
 * - mostrar las capas disponibles e indicar cuáles están activas;
 * - permitir activar/desactivar capas;
 * - mantener el control desacoplado del mapa.
 *
 * Flujo conceptual:
 *
 * MapLayerControl
 *       ↓
 *    onToggle
 *       ↓
 *   AgroMap / useAgroMap
 *       ↓
 *    MapLibre
 *
 * Este componente NO:
 * - crea layers;
 * - modifica geometrías;
 * - modifica fuentes GeoJSON;
 * =========================================
 */


import type { FC } from "react";
// identificador oficial de las capas GIS.
import type { MapLayerId } from "../types/mappingGeo.types";

/**
 * =========================================
 * PROPS
 * =========================================
 */ 

// Definimos las propiedades que necesita el control.
export interface MapLayerControlProps {
  // Conjunto de capas actualmente visibles.
  readonly activeLayers: ReadonlySet<MapLayerId>;
  // Función ejecutada cuando el usuario cambia una capa.
  readonly onToggle: (layerId: MapLayerId) => void;
  // Permite ocultar el título cuando el contenedor ya lo proporciona.
  readonly showTitle?: boolean;
}

/**
 * =========================================
 * LAYER OPTION
 * =========================================
 */ 
// estructura interna de cada opción visual.
interface MapLayerOption {
  // Identificador técnico de la capa.
  readonly id: MapLayerId;
  // Nombre visible para el usuario.
  readonly label: string;
  // Descripción corta de la capa.
  readonly description: string;
  // Indica si la capa puede apagarse.
  readonly toggleable: boolean;
}

/**
 * =========================================
 * LAYER OPTIONS
 * =========================================
 */ 

// Catálogo central de capas disponibles en el selector.
const LAYER_OPTIONS: readonly MapLayerOption[] = [
  // La base cartográfica siempre permanece activa.
  {
    id: "base",
    label: "Mapa base",
    description: "Cartografía principal",
    toggleable: false,
  },
  // Capa de fincas.
  {
    id: "farms",
    label: "Fincas",
    description: "Límites generales de las fincas",
    toggleable: true,
  },
  // Capa de fields.
  {
    id: "fields",
    label: "Fields",
    description: "División de los campos agrícolas",
    toggleable: true,
  },
  // Capa de zonas.
  {
    id: "zones",
    label: "Zonas",
    description: "Subdivisiones operativas de los fields",
    toggleable: true,
  },
  // Capa específica para riesgo.
  {
    id: "riskZones",
    label: "Riesgo",
    description: "Visualización espacial del nivel de riesgo",
    toggleable: true,
  },
  // Sensores.
  {
    id: "sensors",
    label: "Sensores",
    description: "Ubicación de sensores agrícolas",
    toggleable: true,
  },
  // Puntos de muestreo.
  {
    id: "samplingPoints",
    label: "Muestreo",
    description: "Puntos de muestreo de campo",
    toggleable: true,
  },
  // Trayectoria del rover.
  {
    id: "trajectory",
    label: "Trayectoria",
    description: "Recorrido registrado del rover",
    toggleable: true,
  },
  // Ruta planificada.
  {
    id: "plannedRoute",
    label: "Ruta planificada",
    description: "Recorrido programado",
    toggleable: true,
  },
  // Hidrografía.
  {
    id: "hydrography",
    label: "Hidrografía",
    description: "Ríos y cuerpos de agua",
    toggleable: true,
  },
  // Capa satelital.
  {
    id: "satellite",
    label: "Satélite",
    description: "Capa satelital disponible",
    toggleable: true,
  },
  // Índice de vegetación.
  {
    id: "ndvi",
    label: "NDVI",
    description: "Índice de vigor vegetal",
    toggleable: true,
  },
];

/**
 * =========================================
 * PRINCIPAL COMPONENT
 * =========================================
 */ 
// Definimos el componente principal.
export const MapLayerControl: FC<MapLayerControlProps> = ({
  activeLayers,
  onToggle,
  showTitle = true,
}) => {
  // Renderizamos el panel completo del selector.
  return (
    <section className="mapLayerControl" aria-label="Control de capas del mapa">
      {/* Mostramos el título cuando el contenedor lo necesita. */}
      {showTitle && (
        <div className="mapLayerControl__header">
          {/* Título principal del control. */}
          <h3 className="mapLayerControl__title">Capas del mapa</h3>

          {/* Texto auxiliar para explicar su función. */}
          <span className="mapLayerControl__subtitle">Visualización GIS</span>
        </div>
      )}

      {/* Lista de capas disponibles. */}
      <div className="mapLayerControl__list" role="group" aria-label="Capas disponibles">
        {/* Recorremos el catálogo de capas. */}
        {LAYER_OPTIONS.map((layer) => {
          // Comprobamos si la capa está actualmente activa.
          const isActive = activeLayers.has(layer.id);

          // Renderizamos una fila por cada capa.
          return (
            <label
              key={layer.id}
              className={[
                "mapLayerControl__item", isActive ? "mapLayerControl__item--active" : "mapLayerControl__item--inactive",
                !layer.toggleable ? "mapLayerControl__item--locked" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {/* Checkbox nativo para accesibilidad y control de estado. */}
              <input
                type="checkbox"
                checked={isActive}
                disabled={!layer.toggleable}
                onChange={() => {
                  // Solo notificamos cambios de capas modificables.
                  if (layer.toggleable) {
                    onToggle(layer.id);
                  }
                }}
                aria-label={`Mostrar ${layer.label}`}
              />

              {/* Contenedor visual del texto de la capa. */}
              <span className="mapLayerControl__content">
                {/* Nombre principal. */}
                <span className="mapLayerControl__label">{layer.label}</span>

                {/* Descripción secundaria. */}
                <span className="mapLayerControl__description">{layer.description}</span>
              </span>

              {/* Indicador visual del estado actual. */}
              <span className="mapLayerControl__status" aria-hidden="true">
                {isActive ? "Visible" : "Oculta"}
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
};

// Exportamos también el catálogo para futuras integraciones.
export { LAYER_OPTIONS };
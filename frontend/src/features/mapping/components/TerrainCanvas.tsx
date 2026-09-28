/**
 * =========================================
 * TerrainCanvas Component
 * =========================================
 *
 * Canvas principal del render 2D.
 *
 * Nuevo enfoque:
 * Este componente ya no intenta mostrar un mapa agrícola
 * tipo NDVI/parcela. Ahora muestra una simulación técnica
 * del proceso de mapeo del rover.
 *
 * Capas:
 * 1. Grid XY / occupancy map.
 * 2. Nube de puntos simulada.
 * 3. Barrido LiDAR.
 * 4. Trayectoria.
 * 5. Plantas detectadas.
 * 6. Obstáculos.
 * 7. Mediciones.
 * 8. Pose del rover.
 *
 * Por qué SVG:
 * - permite coordenadas limpias;
 * - escala bien;
 * - permite separar capas;
 * - es ideal para overlays técnicos.
 * =========================================
 */

/**
 * =========================================
 * TerrainCanvas
 * =========================================
 *
 * Vista operacional del terreno adaptada a
 * la interfaz oficial de Mapping en Figma.
 *
 * La información de playback continúa
 * entrando mediante RenderSimulationData.
 *
 * Ya no se presenta como HUD oscuro porque
 * Mapping ahora funciona como mapa operativo
 * auxiliar de AgroVision.
 */

import type { RenderSimulationData } from "../types/mappingRender.types";

export interface MappingLayerVisibility {
  readonly boundary: boolean;
  readonly riskZones: boolean;
  readonly managementZones: boolean;
  readonly internalPaths: boolean;
  readonly samplingPoints: boolean;
  readonly hydrography: boolean;
}

interface TerrainCanvasProps {
  readonly data: RenderSimulationData;
  readonly visibleLayers?: MappingLayerVisibility;
}

const DEFAULT_LAYERS: MappingLayerVisibility = {
  boundary: true,
  riskZones: true,
  managementZones: true,
  internalPaths: true,
  samplingPoints: true,
  hydrography: false,
};

export function TerrainCanvas({ data, visibleLayers = DEFAULT_LAYERS }: TerrainCanvasProps) {
  return (
    <div className="operationalTerrain">
      <svg className="operationalTerrain__svg" viewBox="0 0 100 72" preserveAspectRatio="none" role="img" aria-label="Mapa operacional del terreno">
        <defs>
          <linearGradient id="terrainBackground" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#496d37" />
            <stop offset="35%" stopColor="#718c49" />
            <stop offset="67%" stopColor="#52723a" />
            <stop offset="100%" stopColor="#294e30" />
          </linearGradient>

          <pattern id="terrainTexture" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.7" fill="rgba(8,38,30,.28)" />
            <circle cx="6" cy="5" r="1" fill="rgba(183,225,58,.16)" />
          </pattern>
        </defs>

        <rect width="100" height="72" fill="url(#terrainBackground)" />
        <rect width="100" height="72" fill="url(#terrainTexture)" />

        {/* Caminos agrícolas decorativos del mapa. */}
        <path className="operationalTerrain__road" d="M-5 55 C18 50, 24 37, 42 37 S72 51, 108 44" />
        <path className="operationalTerrain__road operationalTerrain__road--thin" d="M14 -5 C19 18, 40 20, 47 36 S56 60, 72 78" />
        <path className="operationalTerrain__road operationalTerrain__road--thin" d="M81 -4 C75 16, 71 27, 62 37 S46 52, 35 75" />

        {/* Hidrografía opcional. */}
        {visibleLayers.hydrography && (
          <>
            <ellipse className="operationalTerrain__water" cx="26" cy="39" rx="4" ry="2.6" />
            <ellipse className="operationalTerrain__water" cx="65" cy="53" rx="3.5" ry="2.3" />
          </>
        )}

        {/* Límite del lote. */}
        {visibleLayers.boundary && (
          <path className="operationalTerrain__boundary" d="M10 18 L28 8 L63 10 L88 23 L91 49 L76 65 L38 67 L12 55 L6 32 Z" />
        )}

        {/* Zonas de manejo. */}
        {visibleLayers.managementZones && (
          <>
            <path className="operationalTerrain__zone operationalTerrain__zone--one" d="M14 21 L35 15 L42 31 L31 42 L13 37 Z" />
            <path className="operationalTerrain__zone operationalTerrain__zone--two" d="M47 13 L69 15 L77 33 L58 38 L43 29 Z" />
            <path className="operationalTerrain__zone operationalTerrain__zone--three" d="M13 40 L31 43 L39 62 L18 58 Z" />

            <text className="operationalTerrain__zoneLabel" x="23" y="25">ZONA 1</text>
            <text className="operationalTerrain__zoneSub" x="23" y="28">Bajo riesgo</text>

            <text className="operationalTerrain__zoneLabel" x="58" y="23">ZONA 2</text>
            <text className="operationalTerrain__zoneSub" x="58" y="26">Riesgo moderado</text>

            <text className="operationalTerrain__zoneLabel" x="21" y="50">ZONA 3</text>
            <text className="operationalTerrain__zoneSub" x="21" y="53">Bajo riesgo</text>
          </>
        )}

        {/* Zona crítica. */}
        {visibleLayers.riskZones && (
          <>
            <path className="operationalTerrain__critical" d="M68 30 L82 27 L92 37 L87 53 L69 56 L59 46 Z" />

            <text className="operationalTerrain__criticalLabel" x="76" y="40">ZONA CRÍTICA</text>
            <text className="operationalTerrain__criticalSub" x="76" y="43">Riesgo alto</text>
          </>
        )}

        {/* Ruta operativa. */}
        {visibleLayers.internalPaths && (
          <path className="operationalTerrain__route" d="M28 58 C33 52, 31 43, 38 40 C45 36, 38 31, 45 27" />
        )}

        {/* Puntos de control / muestreo. */}
        {visibleLayers.samplingPoints && (
          <>
            <circle className="operationalTerrain__sample" cx="12" cy="31" r="1.2" />
            <circle className="operationalTerrain__sample" cx="18" cy="56" r="1.2" />
            <circle className="operationalTerrain__sample" cx="45" cy="10" r="1.2" />
            <circle className="operationalTerrain__sample" cx="71" cy="12" r="1.2" />
            <circle className="operationalTerrain__sample" cx="89" cy="31" r="1.2" />
            <circle className="operationalTerrain__sample" cx="72" cy="64" r="1.2" />
          </>
        )}

        {/* Rover se mantiene vinculado al estado real del playback. */}
        <g className="operationalTerrain__rover" transform={`translate(${data.rover.position.x} ${data.rover.position.y})`}>
          <circle r="2.2" />
          <path d="M-2 0 H2 M0 -2 V2" />
        </g>
      </svg>
    </div>
  );
}
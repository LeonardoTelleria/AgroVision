/**
 * =========================================
 * MappingPage
 * =========================================
 *
 * Refactor visual basado en Figma.
 *
 * Se mantienen:
 * - service;
 * - adapter;
 * - mock fallback;
 * - useSimulationPlayback;
 * - playbackData;
 * - recarga de simulación.
 *
 * Se reemplaza únicamente la antigua
 * presentación rover-first.
 */

import { useEffect, useState } from "react";
import { Panel } from "../../../shared/components/ui/Panel";
import { StatusBadge } from "../../../shared/components/ui/StatusBadge";
import { TerrainCanvas, type MappingLayerVisibility } from "../components/TerrainCanvas";
import { useSimulationPlayback } from "../hooks/useSimulationPlayback";
import { adaptMappingData } from "../services/mappingAdapter";
import { mappingMock } from "../services/mappingMock";
import { getMappingSimulation } from "../services/mappingServices";
import type { RenderSimulationData } from "../types/mappingRender.types";
import "../mapping.css";

const DEFAULT_LAYERS: MappingLayerVisibility = {
  boundary: true,
  riskZones: true,
  managementZones: true,
  internalPaths: true,
  samplingPoints: true,
  hydrography: false,
};

export function MappingPage() {
  const [data, setData] = useState<RenderSimulationData>(() => adaptMappingData(mappingMock));
  const [isLoading, setIsLoading] = useState(false);
  const [visibleLayers, setVisibleLayers] = useState<MappingLayerVisibility>(DEFAULT_LAYERS);

  /**
   * Playback continúa funcionando con los
   * mismos datos utilizados anteriormente.
   */
  const { playbackData, progress, currentFrame, totalFrames, reset } = useSimulationPlayback(data);

  useEffect(() => {
    void loadSimulation();
  }, []);

  /**
   * Backend → adapter → render.
   */
  async function loadSimulation() {
    setIsLoading(true);

    try {
      const simulation = await getMappingSimulation();
      setData(adaptMappingData(simulation));
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Activa/desactiva una capa visual.
   */
  function toggleLayer(layer: keyof MappingLayerVisibility) {
    setVisibleLayers((currentLayers) => ({
      ...currentLayers,
      [layer]: !currentLayers[layer],
    }));
  }

  /**
   * Centra/reinicia el playback operativo.
   */
  function handleCenterMap() {
    reset();
  }

  return (
    <section className="avScreen mappingFigma">
      <section className="mappingFigma__workspace">
        {/* =====================================
            MAPA PRINCIPAL
            ===================================== */}

        <Panel title="Mapa operativo del terreno" showInfo={false} className="mappingOperationalPanel">
          <div className="mappingOperationalLayout">
            <aside className="mappingLayerSelector">
              <strong>Capas</strong>

              <LayerToggle checked={visibleLayers.boundary} label="Límites del lote" onChange={() => toggleLayer("boundary")} />
              <LayerToggle checked={visibleLayers.riskZones} label="Zonas de riesgo" onChange={() => toggleLayer("riskZones")} />
              <LayerToggle checked={visibleLayers.managementZones} label="Zonas de manejo" onChange={() => toggleLayer("managementZones")} />
              <LayerToggle checked={visibleLayers.internalPaths} label="Caminos internos" onChange={() => toggleLayer("internalPaths")} />
              <LayerToggle checked={visibleLayers.samplingPoints} label="Puntos de muestreo" onChange={() => toggleLayer("samplingPoints")} />
              <LayerToggle checked={visibleLayers.hydrography} label="Hidrografía" onChange={() => toggleLayer("hydrography")} />

              <button type="button" className="mappingManageLayers">Gestionar capas</button>

              <div className="mappingMapControls">
                <button type="button">+</button>
                <button type="button">−</button>
                <button type="button" onClick={handleCenterMap}>{/* SVG center */}</button>
              </div>
            </aside>

            <div className="mappingTerrainHost">
              <TerrainCanvas data={playbackData} visibleLayers={visibleLayers} />

              {isLoading && <span className="mappingLoadingBadge">Actualizando...</span>}
            </div>
          </div>
        </Panel>

        {/* =====================================
            COLUMNA DERECHA
            ===================================== */}

        <aside className="mappingFigma__side">
          <Panel title="Zona seleccionada" showInfo={false} className="mappingSelectedZonePanel">
            <div className="mappingInfoRows">
              <MappingInfoRow label="Zona crítica" value="Riesgo alto" danger />
              <MappingInfoRow label="Área aproximada" value="18.6 ha" />
              <MappingInfoRow label="Cultivo predominante" value="Naranjo" />
              <MappingInfoRow label="Pendiente promedio" value="6–12%" />
              <MappingInfoRow label="Última evaluación" value="Hoy, 09:15" />
            </div>

            <button type="button" className="avTextAction mappingCenteredAction">Ver recomendaciones →</button>
          </Panel>

          <Panel title="Resumen de ruta" showInfo={false}>
            <div className="mappingInfoRows">
              <MappingInfoRow label="Distancia total" value={`${playbackData.stats.distanceTraveled} m`} />
              <MappingInfoRow label="Puntos de control" value={String(playbackData.stats.plantsDetected)} />
              <MappingInfoRow label="Tiempo estimado" value={`${currentFrame + 1}/${totalFrames}`} />
            </div>

            <button type="button" className="avTextAction mappingCenteredAction">Ver detalle de ruta →</button>
          </Panel>

          <Panel title="Eventos detectados" showInfo={false} headerAction={<button type="button" className="avTextAction">Ver todos</button>}>
            <div className="mappingEvents">
              <MappingEvent label="Estrés hídrico severo" time="Hoy, 09:30" tone="DANGER" />
              <MappingEvent label="Riesgo de enfermedad foliar" time="Hoy, 09:15" tone="DANGER" />
              <MappingEvent label="Compactación de suelo" time="Ayer, 16:40" tone="WARNING" />
            </div>
          </Panel>
        </aside>
      </section>

      {/* =====================================
          FILA INFERIOR
          ===================================== */}

      <section className="mappingFigma__bottom">
        <Panel title="Capas activas" showInfo={false}>
          <div className="mappingActiveLayers">
            <ActiveLayer color="lime" label="Límites del lote" active={visibleLayers.boundary} />
            <ActiveLayer color="amber" label="Zonas de riesgo" active={visibleLayers.riskZones} />
            <ActiveLayer color="green" label="Zonas de manejo" active={visibleLayers.managementZones} />
            <ActiveLayer color="gray" label="Caminos internos" active={visibleLayers.internalPaths} />
            <ActiveLayer color="yellow" label="Puntos de muestreo" active={visibleLayers.samplingPoints} />
            <ActiveLayer color="blue" label="Hidrografía" active={visibleLayers.hydrography} />
          </div>
        </Panel>

        <Panel title="Indicadores del terreno" showInfo={false}>
          <div className="mappingIndicatorGrid">
            <TerrainIndicator label="Pendiente promedio" value="7.8" unit="%" status="Moderada" />
            <TerrainIndicator label="Elevación promedio" value="612" unit="m msnm" status="Normal" />
            <TerrainIndicator label="Índice de vegetación (NDVI)" value="0.64" unit="" status="Moderado" />
            <TerrainIndicator label="Humedad del suelo promedio" value="21" unit="%" status="Bajo" />
          </div>

          <button type="button" className="avTextAction mappingCenteredAction">Ver análisis completo →</button>
        </Panel>

        <Panel title="Acciones rápidas" showInfo={false}>
          <div className="mappingQuickActions">
            <QuickAction label="Medir distancia" />
            <QuickAction label="Dibujar zona" />
            <QuickAction label="Agregar punto de muestreo" />
            <QuickAction label="Importar archivo (KML/Shape)" />
            <QuickAction label="Generar reporte del mapa" />
          </div>
        </Panel>
      </section>

      <footer className="mappingSyncStatus">
        <span>{/* SVG sync */}</span>
        Los datos del mapa se actualizan automáticamente. Playback: {progress}%.
      </footer>
    </section>
  );
}

function LayerToggle({ checked, label, onChange }: { readonly checked: boolean; readonly label: string; readonly onChange: () => void }) {
  return (
    <label className="mappingLayerToggle">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{/* SVG layer */}</span>
      <strong>{label}</strong>
    </label>
  );
}

function MappingInfoRow({ label, value, danger = false }: { readonly label: string; readonly value: string; readonly danger?: boolean }) {
  return (
    <div className="mappingInfoRow">
      <span className={danger ? "mappingInfoRow__icon is-danger" : "mappingInfoRow__icon"}>{/* SVG */}</span>
      <strong>{label}</strong>
      <p>{value}</p>
    </div>
  );
}

function MappingEvent({ label, time, tone }: { readonly label: string; readonly time: string; readonly tone: "DANGER" | "WARNING" }) {
  return (
    <div className="mappingEvent">
      <span className={`mappingEvent__icon mappingEvent__icon--${tone.toLowerCase()}`}>△</span>
      <strong>{label}</strong>
      <time>{time}</time>
      <b>›</b>
    </div>
  );
}

function ActiveLayer({ color, label, active }: { readonly color: string; readonly label: string; readonly active: boolean }) {
  return (
    <div className={active ? "mappingActiveLayer" : "mappingActiveLayer is-disabled"}>
      <i className={`mappingActiveLayer__dot mappingActiveLayer__dot--${color}`} />
      <span>{label}</span>
      <small>{active ? "◉" : "○"}</small>
      <b>⌄</b>
    </div>
  );
}

function TerrainIndicator({ label, value, unit, status }: { readonly label: string; readonly value: string; readonly unit: string; readonly status: string }) {
  return (
    <article className="mappingIndicator">
      <span>{label}</span>
      <i>{/* SVG indicator */}</i>
      <strong>{value}</strong>
      <small>{unit}</small>
      <p>{status}</p>
    </article>
  );
}

function QuickAction({ label }: { readonly label: string }) {
  return (
    <button type="button" className="mappingQuickAction">
      <span>{/* SVG */}</span>
      <strong>{label}</strong>
      <b>›</b>
    </button>
  );
}
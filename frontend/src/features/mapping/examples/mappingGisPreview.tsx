/**
 * =========================================
 * Mapping GIS Preview
 * =========================================
 *
 * Entrada React de la vista independiente de validación GIS.
 *
 * Responsabilidad:
 * - montar una vista operativa y otra compacta;
 * - compartir el mismo snapshot analítico entre ambas;
 * - permitir montar, desmontar y habilitar la edición;
 * - exponer las instancias activas para inspección manual.
 * =========================================
 */

import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Map } from "maplibre-gl";

import { MappingGIS } from "../components/MappingGIS";
import { useZoneInsights } from "../hooks/useZoneInsights";
import { zonesGeoJSON } from "../utils/geojson";

// Utilizamos el tema oficial en esta entrada independiente.
import "../../../shared/styles/themes.css";

// Conservamos una identidad estable para el conjunto de zonas del ejemplo.
const PREVIEW_ZONE_IDS = zonesGeoJSON.features.map((zone) => zone.properties.zoneId);
const NO_ZONE_IDS: readonly string[] = [];

/** Instancias disponibles para inspección desde la consola del navegador. */
declare global {
  interface Window {
    agroVisionPreviewMaps: Map[];
  }
}

// Conservamos el registro entre actualizaciones del módulo.
window.agroVisionPreviewMaps ??= [];

/** Registra un mapa cargado y retira su referencia cuando se elimina. */
function registerPreviewMap(map: Map): void {
  if (window.agroVisionPreviewMaps.includes(map)) return;

  window.agroVisionPreviewMaps.push(map);

  map.once("remove", () => {
    window.agroVisionPreviewMaps = window.agroVisionPreviewMaps.filter((current) => current !== map);
  });
}

export function MappingGisPreview() {
  const [visible, setVisible] = useState(true);
  const [editing, setEditing] = useState(false);

  // Una consulta comparte los análisis entre las dos composiciones.
  const analysis = useZoneInsights(visible ? PREVIEW_ZONE_IDS : NO_ZONE_IDS);

  return (
    <main className="mappingGisPreview">
      <header className="mappingGisPreview__header">
        <h1>AgroVision GIS — vista de prueba</h1>
        <p>Geometrías y recorrido de demostración. Los análisis se consultan en el backend.</p>
      </header>

      <div className="mappingGisPreview__actions" role="group" aria-label="Configuración de la prueba">
        {/* El desmontaje ejercita la limpieza de mapas, capas y animaciones. */}
        <button type="button" onClick={() => setVisible((current) => !current)}>
          {visible ? "Desmontar mapas" : "Montar mapas"}
        </button>

        {/* La edición se habilita expresamente para la vista operativa. */}
        <label>
          <input type="checkbox" checked={editing} onChange={(event) => setEditing(event.target.checked)} />
          Habilitar edición
        </label>
      </div>

      {visible && analysis.isLoading && <p role="status">Consultando análisis por zona…</p>}

      {visible && analysis.failures.length > 0 && (
        <p role="status">{analysis.failures.length} zonas sin análisis disponible.</p>
      )}

      {visible ? (
        <>
          <section className="mappingGisPreview__section" aria-labelledby="gis-preview-operational-title">
            <h2 id="gis-preview-operational-title">Vista operativa</h2>

            <MappingGIS
              insights={analysis.insights}
              enableEditing={editing}
              onMapReady={registerPreviewMap}
            />
          </section>

          <section
            className="mappingGisPreview__section mappingGisPreview__compact"
            aria-labelledby="gis-preview-compact-title"
          >
            <h2 id="gis-preview-compact-title">Vista compacta</h2>

            <MappingGIS
              insights={analysis.insights}
              showControls={false}
              interactive={false}
              enableEditing={false}
              animateRover={false}
              trajectory={null}
              onMapReady={registerPreviewMap}
            />
          </section>
        </>
      ) : (
        <p role="status">Mapas desmontados. Puedes montarlos nuevamente para repetir la prueba.</p>
      )}
    </main>
  );
}

// Verificamos el contrato del HTML de entrada antes de montar React.
const container = document.getElementById("root");

if (!container) throw new Error("La vista GIS requiere un contenedor con id=root.");

const root = createRoot(container);

root.render(
  <StrictMode>
    <MappingGisPreview />
  </StrictMode>,
);

// Liberamos la raíz cuando Vite reemplaza este módulo.
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());

/**
 * DOCUMENTACIÓN DE EJECUCIÓN
 *
 * Ruta del módulo:
 * frontend/src/features/mapping/examples/mappingGisPreview.tsx
 *
 * Entrada del navegador:
 * frontend/mapping-gis-preview.html carga este módulo mediante un script
 * type=module y proporciona el elemento con id=root.
 *
 * Desarrollo:
 * Desde la raíz del repositorio, ejecutar npm run dev:frontend y abrir
 * /mapping-gis-preview.html en el origen indicado por Vite.
 * La aplicación principal utiliza su entrada index.html.
 * Cada HTML inicia su propia raíz React en la pestaña correspondiente.
 *
 * Datos:
 * useZoneInsights obtiene un snapshot compartido para los dos mapas.
 * Desmontar las vistas cancela la consulta vigente. Volver a montarlas
 * inicia una consulta nueva. Los fallos conservan su estado por zona.
 * El proxy /api de Vite dirige las consultas al backend configurado.
 *
 * Prueba manual:
 * La vista operativa permite alternar capas, navegar y activar Geoman.
 * La vista compacta presenta una cámara estática sin trayectoria ni rover.
 * El botón de montaje permite repetir creación y limpieza de las sesiones.
 * StrictMode ejercita el ciclo adicional de efectos durante desarrollo.
 *
 * Inspección:
 * window.agroVisionPreviewMaps contiene únicamente mapas cargados y activos.
 * Cada referencia se retira al emitirse remove.
 * Los borradores de edición pertenecen a la sesión local de Geoman.
 *
 * Compilación:
 * El build principal utiliza sus entradas configuradas. Para distribuir
 * esta vista se añade su HTML a las entradas del build o se utiliza la
 * configuración dedicada vite.mapping.config.ts cuando esté instalada.
 */
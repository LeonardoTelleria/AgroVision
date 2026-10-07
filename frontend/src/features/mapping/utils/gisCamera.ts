/**
 * =========================================
 * GIS Camera
 * =========================================
 * Encuadre compartido de campos y zonas dentro de la superficie cartográfica.
 * Considera los paneles visibles para mantener la geometría fuera de las
 * herramientas flotantes y aplica el mismo criterio en ambas páginas.
 * =========================================
 */

// Calculamos los extremos geográficos del snapshot recibido.
import { bbox } from "@turf/turf";
// Tipamos la instancia de MapLibre sin incorporarla al bundle de este módulo.
import type { Map } from "maplibre-gl";

/** Encuadra una colección o feature con la cámara disponible. */
export function fitGisGeometry(map: Map, geometry: Parameters<typeof bbox>[0], duration = 550): void {
  // Una colección vacía conserva el encuadre vigente.
  const bounds = bbox(geometry);
  if (!bounds.every(Number.isFinite)) return;
  const [west, south, east, north] = bounds;

  // Medimos el canvas y la interfaz de esta instancia, independientemente de otras vistas.
  const container = map.getContainer();
  const root = container.closest<HTMLElement>(".mappingGis");
  const viewport = container.getBoundingClientRect();
  const compact = root?.classList.contains("mappingGis--compact");
  const padding = { top: 45, bottom: 45, left: 60, right: 45 };

  if (root && !compact) {
    // Reservamos el encabezado, el origen de datos y las métricas inferiores de la página.
    for (const selector of [".mappingWorkspace__context", ".mappingWorkspace__source"]) {
      const element = root.querySelector<HTMLElement>(selector);
      if (element)
        padding.top = Math.max(padding.top, element.getBoundingClientRect().bottom - viewport.top + 18);
    }
    const metrics = root.querySelector<HTMLElement>(".mappingWorkspace__metrics");
    if (metrics)
      padding.bottom = Math.max(padding.bottom, viewport.bottom - metrics.getBoundingClientRect().top + 18);

    // El inspector reserva espacio a la derecha o debajo, según su disposición actual.
    const dock = root.querySelector<HTMLElement>(".mappingGis__dock");
    if (dock) {
      const rect = dock.getBoundingClientRect();
      if (viewport.width > 760) padding.right = Math.max(padding.right, viewport.right - rect.left + 22);
      else padding.bottom = Math.max(padding.bottom, viewport.bottom - rect.top + 18);
    }
  }

  // Conservamos una superficie de encuadre útil en contenedores especialmente pequeños.
  const verticalRatio = Math.min(1, (viewport.height * 0.8) / (padding.top + padding.bottom));
  const horizontalRatio = Math.min(1, (viewport.width * 0.8) / (padding.left + padding.right));
  padding.top *= verticalRatio;
  padding.bottom *= verticalRatio;
  padding.left *= horizontalRatio;
  padding.right *= horizontalRatio;

  // Presentamos el área geográfica con orientación norte y una cámara sin inclinación.
  map.fitBounds(
    [
      [west, south],
      [east, north],
    ],
    { padding, maxZoom: 17, duration, bearing: 0, pitch: 0 },
  );
}

/**
 * DOCUMENTACIÓN DE INTEGRACIÓN
 *
 * MappingGIS utiliza este encuadre al cargar y restablecer la vista.
 * MappingPage lo utiliza al filtrar campos o seleccionar una zona en la lista.
 * Turf obtiene el bbox y MapLibre aplica límites, padding y transición.
 *
 * La interfaz se mide únicamente dentro del contenedor de la instancia.
 * Cerrar el inspector recupera espacio en el siguiente encuadre; los paneles
 * móviles reservan superficie inferior. Una geometría vacía conserva la cámara.
 */

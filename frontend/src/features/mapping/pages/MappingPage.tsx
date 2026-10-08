/**
 * =========================================
 * Mapping Page
 * =========================================
 * Espacio operativo GIS de AgroVision: mapa continuo, inspector flotante
 * y herramientas vinculadas al motor cartográfico compartido con Dashboard.
 *
 * Responsabilidad:
 * - seleccionar campos y zonas de la finca;
 * - consultar y presentar análisis válidos por zona;
 * - coordinar cámara, recorrido simulado y borradores exportables;
 * - conservar el contexto geográfico en escritorio y dispositivos móviles.
 * =========================================
 */
/**

 * =========================================

 * Mapping Page

 * =========================================

 * Espacio operativo GIS de AgroVision: mapa continuo, inspector flotante

 * y herramientas vinculadas al motor cartográfico compartido con Dashboard.

 *

 * Responsabilidad:

 * - seleccionar campos y zonas de la finca;

 * - consultar y presentar análisis válidos por zona;

 * - coordinar cámara, recorrido simulado y borradores exportables;

 * - conservar el contexto geográfico en escritorio y dispositivos móviles.

 * =========================================

 */



// Conservamos la selección de dominio y snapshots estables entre renders.

import { useMemo, useState } from "react";

// Calculamos superficies, longitudes y límites a partir de las geometrías recibidas.

import { area, length } from "@turf/turf";

// Aplicamos la política de encuadre compartida con la navegación del GIS.

import { fitGisGeometry } from "../utils/gisCamera";

// Tipamos la instancia cartográfica y los borradores creados por Geoman.

import type { Map } from "maplibre-gl";

import type { FeatureCollection } from "geojson";

// Componemos el mapa y sus controles a través del componente GIS compartido.

import { MappingGIS } from "../components/MappingGIS";

import { GisIcon } from "../components/GisIcon";

// Consultamos los análisis mediante el servicio común de zonas.

import { useZoneInsights } from "../hooks/useZoneInsights";

// Aplicamos las mismas reglas de identidad utilizadas por las capas del mapa.

import { enrichZonesWithInsights } from "../services/zoneInsightMapAdapter";

// Consumimos las geometrías desde su único punto de salida.

import { farmsGeoJSON, fieldsGeoJSON, zonesGeoJSON } from "../utils/geojson";

import { agroVisionRoverTrajectory } from "../data/roverTrajectoryData";

// Compartimos los contratos de campos, zonas y rutas del sistema GIS.

import type { FieldFeatureCollection, MapLineFeature, ZoneFeatureCollection } from "../types/mappingGeo.types";

// Consumimos las métricas emitidas por el controlador del rover.

import type { RoverProgress } from "../layers/roverLayer";

import "../mappingGis.css";



// Compartimos el formato numérico de las superficies y distancias visibles.

const NUMBER_FORMAT = new Intl.NumberFormat("es-NI", { maximumFractionDigits: 1 });

// El catálogo representa exclusivamente los niveles permitidos por el contrato analítico.

const RISK_LABELS = { LOW: "Bajo", MEDIUM: "Medio", HIGH: "Alto", CRITICAL: "Crítico" } as const;

// Una colección vacía identifica el inicio de una sesión de borradores.

const EMPTY_DRAFT: FeatureCollection = { type: "FeatureCollection", features: [] };



export function MappingPage() {

  // La finca y sus geometrías proceden del dataset compartido por ambas páginas.

  const farm = farmsGeoJSON.features[0];

  // Conservamos la referencia cargada para encuadrar campos y zonas desde el inspector.

  const [map, setMap] = useState<Map | null>(null);

  // Un filtro vacío representa todos los campos de la finca.

  const [fieldId, setFieldId] = useState("");

  // Dashboard puede abrir esta vista con una zona concreta mediante su query string.

  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(() => {

    const id = new URLSearchParams(window.location.search).get("zone");

    return zonesGeoJSON.features.some((zone) => zone.properties.zoneId === id) ? id : null;

  });

  // El usuario controla reproducción y edición de forma independiente.

  const [animateRover, setAnimateRover] = useState(true);

  const [enableEditing, setEnableEditing] = useState(false);

  // Conservamos el último borrador recibido para exportarlo como GeoJSON.

  const [draft, setDraft] = useState<FeatureCollection>(EMPTY_DRAFT);

  // Distinguimos el recorrido demo, la ruta dibujada y una vista sin recorrido.

  const [routeSource, setRouteSource] = useState<"demo" | "draft" | "none">("demo");

  // Conservamos las métricas emitidas por el controlador de esta instancia.

  const [roverProgress, setRoverProgress] = useState<RoverProgress | null>(null);


  // Una nueva identidad permite volver a consultar el mismo conjunto de zonas.

  const [refreshKey, setRefreshKey] = useState(0);



  // Consultamos una sola vez cada zona del dataset, independientemente del filtro visual.

  const zoneIds = useMemo(() => zonesGeoJSON.features.map((zone) => zone.properties.zoneId), []);

  const analysis = useZoneInsights(zoneIds, "", refreshKey);

  // Validamos las relaciones zoneId/fieldId antes de presentar información de riesgo.

  const enriched = useMemo(

    () => enrichZonesWithInsights(zonesGeoJSON, analysis.insights),

    [analysis.insights],

  );



  // El filtro conserva la relación entre campos y zonas con nuevas referencias estables.

  const fields = useMemo<FieldFeatureCollection>(

    () => ({

      ...fieldsGeoJSON,

      features: fieldsGeoJSON.features.filter(

        (field) => !fieldId || String(field.properties.fieldId) === fieldId,

      ),

    }),

    [fieldId],

  );

  const zones = useMemo<ZoneFeatureCollection>(

    () => ({

      ...enriched.zones,

      features: enriched.zones.features.filter(

        (zone) => !fieldId || String(zone.properties.fieldId) === fieldId,

      ),

    }),

    [enriched.zones, fieldId],

  );



  // La selección utiliza la misma colección enriquecida que recibe MapLibre.

  const selected = zones.features.find((zone) => zone.properties.zoneId === selectedZoneId);

  const selectedInsight = analysis.insights.find(

    (insight) =>

      insight.zoneId === selected?.properties.zoneId &&

      insight.fieldId === String(selected.properties.fieldId),

  );

  // Calculamos métricas geométricas para evitar indicadores operativos inventados.

  const hectares = area(fields) / 10_000;

  const evaluated = zones.features.filter((zone) => zone.properties.riskLevel != null).length;

  // Identificamos la ruta por su ID y geometría para conservarla al editar otros dibujos.

  const routeCandidate = draft.features.filter((feature) => feature.properties?.gisPurpose === "ROVER_ROUTE").at(-1);

  const routeKey = routeCandidate?.geometry.type === "LineString"
    ? JSON.stringify({
        id: routeCandidate.id ?? routeCandidate.properties?.gm_id ?? "drawn-rover-route",
        geometry: routeCandidate.geometry,
      })
    : "";

  // Adaptamos la última ruta dibujada al contrato GIS compartido.

  const drawnTrajectory = useMemo<MapLineFeature | null>(() => {
    if (!routeKey) return null;

    // El snapshot se construyó desde una línea de esta misma colección de borradores.
    const feature = JSON.parse(routeKey) as Pick<MapLineFeature, "id" | "geometry">;

    // Calculamos la longitud antes de entregar el recorrido al controlador.
    const meters = length(
      { type: "Feature", geometry: feature.geometry, properties: {} },
      { units: "meters" },
    );

    if (!Number.isFinite(meters) || meters <= 0) return null;

    // Conservamos la identidad del dibujo y describimos su propósito operativo.
    return {
      type: "Feature",
      id: feature.id,
      geometry: feature.geometry,
      properties: {
        routeId: String(feature.id),
        fieldId: null,
        zoneId: null,
        kind: "PLANNED_ROUTE",
        name: "Ruta dibujada del rover",
        distanceMeters: meters,
      },
    };
  }, [routeKey]);

  // El recorrido de demostración pertenece a la finca completa.

  const trajectory = routeSource === "draft"
    ? drawnTrajectory
    : routeSource === "demo" && !fieldId ? agroVisionRoverTrajectory : null;

  // La longitud corresponde a la ruta actualmente seleccionada.

  const routeMeters = trajectory ? length(trajectory, { units: "meters" }) : 0;

  // Descartamos métricas que pertenecen a otra ruta o a su geometría anterior.

  const progress = trajectory && roverProgress
    && roverProgress.routeId === trajectory.id
    && Math.abs(roverProgress.routeLengthMeters - routeMeters) < 0.01
    ? roverProgress
    : null;

  /** Conserva los borradores y activa las nuevas rutas completadas por el editor. */

  function updateDraft(nextDraft: FeatureCollection): void {
    // Reconocemos las rutas existentes antes de aplicar el nuevo snapshot.
    const previousRoutes = draft.features.filter((feature) => feature.properties?.gisPurpose === "ROVER_ROUTE");
    const nextRoute = nextDraft.features.filter((feature) => feature.properties?.gisPurpose === "ROVER_ROUTE").at(-1);

    // Una nueva ruta habilita el recorrido dibujado y su simulación.
    if (nextRoute && !previousRoutes.some((feature) => feature.id === nextRoute.id)) {
      setRouteSource("draft");
      setAnimateRover(true);
    }

    // Editar otros dibujos conserva la selección de recorrido vigente.
    setDraft(nextDraft);
  }



  /** Encuadra una geometría con la cámara y el espacio de interfaz vigentes. */

  function focusGeometry(geometry: Parameters<typeof fitGisGeometry>[1]): void {

    if (map) fitGisGeometry(map, geometry);

  }



  /** Cambia el campo y presenta sus límites utilizando la cámara existente. */

  function selectField(id: string): void {

    setFieldId(id);

    setSelectedZoneId(null);

    // El encuadre utiliza el siguiente filtro antes del próximo render de React.

    const features = fieldsGeoJSON.features.filter((field) => !id || String(field.properties.fieldId) === id);

    if (features.length) focusGeometry({ type: "FeatureCollection", features });

  }



  /** Descarga el borrador vigente o las geometrías actualmente visibles. */

  function exportGeoJSON(): void {

    // El borrador tiene prioridad; la vista exporta campos, zonas y recorrido disponible.

    const payload = draft.features.length

      ? draft

      : {

          type: "FeatureCollection",

          features: [...fields.features, ...zones.features, ...(trajectory ? [trajectory] : [])],

        };

    // Generamos una descarga local que conserva el formato GeoJSON estándar.

    const url = URL.createObjectURL(

      new Blob([JSON.stringify(payload, null, 2)], { type: "application/geo+json" }),

    );

    const anchor = document.createElement("a");

    anchor.href = url;

    anchor.download = draft.features.length ? "agrovision-borrador.geojson" : "agrovision-mapa.geojson";

    anchor.click();

    // Liberamos el recurso temporal después de iniciar la descarga.

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);

  }



  // El inspector presenta una selección real y mantiene disponibles las demás zonas.

  const inspector = (

    <div className="gisInspector">

      <header className="gisInspector__heading">

        <span className="gisEyebrow">EXPLORA TU FINCA</span>

        <h2>{selected?.properties.name ?? "Cada zona, una decisión"}</h2>

        <p>

          {selected

            ? `${selected.properties.zoneId} · ${fieldsGeoJSON.features.find((field) => field.properties.fieldId === selected.properties.fieldId)?.properties.name ?? "Campo agrícola"}`

            : "Selecciona una zona en el mapa o en la lista para conocer su estado."}

        </p>

      </header>



      {selected && (

        <section className="gisZoneDetails" aria-label="Información de la zona seleccionada">

          {/* Riesgo y salud aparecen únicamente cuando existe un análisis compatible. */}

          <div className="gisZoneDetails__summary">

            <span className={`gisRisk gisRisk--${selected.properties.riskLevel?.toLowerCase() ?? "unknown"}`}>

              {selected.properties.riskLevel

                ? `Riesgo ${RISK_LABELS[selected.properties.riskLevel].toLowerCase()}`

                : "Sin evaluar"}

            </span>

            <strong>

              {selected.properties.healthScore != null ? `${selected.properties.healthScore}/100` : "—"}

              <small>Salud</small>

            </strong>

          </div>

          <dl className="gisFacts">

            <div>

              <dt>Superficie geométrica</dt>

              <dd>{NUMBER_FORMAT.format(area(selected) / 10_000)} ha</dd>

            </div>

            <div>

              <dt>Última evaluación</dt>

              <dd>

                {selectedInsight

                  ? new Intl.DateTimeFormat("es-NI", { dateStyle: "medium", timeStyle: "short" }).format(

                      new Date(selectedInsight.generatedAt),

                    )

                  : "Sin datos"}

              </dd>

            </div>

          </dl>

          {/* El backend proporciona el resumen y la acción sustentada por su evidencia. */}

          {selectedInsight ? (

            <div className="gisRecommendation">

              <span className="gisEyebrow">ACCIÓN RECOMENDADA</span>

              <p>{selectedInsight.recommendedAction}</p>

              <details>

                <summary>Ver evidencia del análisis</summary>

                <p>{selectedInsight.summary}</p>

                <ul>

                  {selectedInsight.evidence.map((item, index) => (

                    <li key={`${item.source}-${item.metric}-${index}`}>

                      <strong>{item.metric}</strong>: {item.explanation}

                    </li>

                  ))}

                </ul>

              </details>

            </div>

          ) : (

            <p className="gisMuted">

              La geometría está disponible. El análisis de esta zona aún no está disponible.

            </p>

          )}

        </section>

      )}



      <section className="gisZoneList" aria-label="Zonas del campo">

        <div className="gisSectionTitle">

          <h3>Zonas de la finca</h3>

          <span>{zones.features.length}</span>

        </div>

        {/* La lista permite seleccionar y encuadrar zonas mediante teclado o pantalla táctil. */}

        {zones.features.map((zone) => (

          <button

            className="gisZoneList__item"

            type="button"

            key={zone.properties.zoneId}

            aria-pressed={selectedZoneId === zone.properties.zoneId}

            onClick={() => {

              setSelectedZoneId(zone.properties.zoneId);

              focusGeometry(zone);

            }}

          >

            <span

              className={`gisRiskDot gisRiskDot--${zone.properties.riskLevel?.toLowerCase() ?? "unknown"}`}

            />

            <span>

              <strong>{zone.properties.name}</strong>

              <small>

                {zone.properties.riskLevel ? RISK_LABELS[zone.properties.riskLevel] : "Sin evaluar"}

              </small>

            </span>

            <GisIcon name="arrow" />

          </button>

        ))}

      </section>



      {/* El recorrido sintético se identifica como demostración y usa el mismo control del motor. */}

      <section className="gisRouteCard" aria-label="Recorrido del rover">

        <div>

          <span className="gisEyebrow">ROVER · DEMOSTRACIÓN</span>

          <strong>

            {trajectory

              ? `${NUMBER_FORMAT.format(routeMeters)} m de recorrido`

              : "Recorrido de finca completa"}

          </strong>

          {/* Presentamos el avance de la vuelta actual y el estado de la simulación. */}

          {trajectory && (
            <>
              <progress
                value={progress?.distanceMeters ?? 0}
                max={routeMeters}
                aria-label="Avance del rover en la vuelta actual"
              />

              <small>
                {NUMBER_FORMAT.format(progress?.distanceMeters ?? 0)} m recorridos
                {" · "}
                {progress?.status === "ACTIVE" ? "En movimiento" : "En pausa"}
                {" · "}
                {progress?.completedLaps ?? 0} vueltas completas
              </small>
            </>
          )}

          {/* Indicamos el origen de la ruta seleccionada y permitimos cambiarlo. */}

          <small>
            {routeSource === "draft" ? "Ruta dibujada" : routeSource === "demo" ? "Ruta demo" : "Sin recorrido activo"}
          </small>

          <div className="gisRouteCard__actions">
            <button
              type="button"
              disabled={Boolean(fieldId)}
              onClick={() => {
                // Recuperamos el recorrido de demostración y reanudamos el movimiento.
                setRouteSource("demo");
                setAnimateRover(true);
              }}
            >
              Ruta demo
            </button>

            <button
              type="button"
              disabled={!drawnTrajectory}
              onClick={() => setRouteSource("draft")}
            >
              Ruta dibujada
            </button>

            <button
              type="button"
              disabled={!trajectory}
              onClick={() => setRouteSource("none")}
            >
              Retirar recorrido
            </button>
          </div>

        </div>

        <button

          className="gisIconButton"

          type="button"

          disabled={!trajectory}

          aria-label={animateRover ? "Pausar rover" : "Reanudar rover"}

          onClick={() => setAnimateRover((current) => !current)}

        >

          <GisIcon name={animateRover ? "pause" : "play"} />

        </button>

      </section>

    </div>

  );



  return (

    <section className="mappingWorkspace" aria-label="Explorador GIS de AgroVision">

      {/* La página ocupa un único lienzo; los paneles se presentan encima de la cartografía. */}

      <MappingGIS

        fields={fields}

        zones={zones}

        trajectory={trajectory}

        insights={analysis.insights}

        sidePanel={inspector}

        selectedZoneId={selectedZoneId}

        animateRover={animateRover}

        enableEditing={enableEditing}

        draft={draft}

        onRoverProgress={setRoverProgress}

        onMapReady={setMap}

        onZoneSelect={(zone) => setSelectedZoneId(zone.zoneId)}

        onDraftChange={updateDraft}

      >

        <header className="mappingWorkspace__context gisGlass">

          <div className="mappingWorkspace__identity">

            <span className="gisBrandMark">

              <GisIcon name="location" />

            </span>

            <div>

              <span className="gisEyebrow">MAPA DE LA FINCA</span>

              <h1>{farm?.properties.name ?? "Mi finca"}</h1>

            </div>

          </div>

          <label className="gisFieldFilter">

            <span className="gisSrOnly">Campo visible</span>

            <select value={fieldId} onChange={(event) => selectField(event.target.value)}>

              <option value="">Todos los campos</option>

              {fieldsGeoJSON.features.map((field) => (

                <option key={field.properties.fieldId} value={String(field.properties.fieldId)}>

                  {field.properties.name}

                </option>

              ))}

            </select>

          </label>

          <div className="mappingWorkspace__actions">

            <button

              className={`gisIconButton${enableEditing ? " is-active" : ""}`}

              type="button"

              aria-label="Dibujar y medir"

              title="Dibujar y medir"

              aria-pressed={enableEditing}

              onClick={() => setEnableEditing((current) => !current)}

            >

              <GisIcon name="draw" />

            </button>

            <button

              className="gisIconButton"

              type="button"

              aria-label="Exportar GeoJSON"

              title="Exportar GeoJSON"

              onClick={exportGeoJSON}

            >

              <GisIcon name="download" />

            </button>

          </div>

        </header>



        {/* El origen de las geometrías y la disponibilidad analítica permanecen visibles. */}

        <div className="mappingWorkspace__source gisGlass" role="status">

          <span className="gisLiveDot" /> Geometrías de demostración

          <span className="mappingWorkspace__sourceDivider" />

          {analysis.isLoading

            ? "Consultando análisis…"

            : `${evaluated}/${zones.features.length} zonas evaluadas`}

          <button

            type="button"

            disabled={analysis.isLoading}

            onClick={() => setRefreshKey((current) => current + 1)}

          >

            Actualizar

          </button>

        </div>



        {/* Las métricas describen el filtro actual y se calculan desde las geometrías. */}

        <footer className="mappingWorkspace__metrics" aria-label="Resumen geográfico">

          <div className="gisGlass">

            <span>Superficie de campos</span>

            <strong>

              {NUMBER_FORMAT.format(hectares)}

              <small>ha</small>

            </strong>

          </div>

          <div className="gisGlass">

            <span>Zonas visibles</span>

            <strong>

              {zones.features.length}

              <small>zonas</small>

            </strong>

          </div>

          <div className="gisGlass">

            <span>{draft.features.length ? "Borrador local" : "Campos visibles"}</span>

            <strong>

              {draft.features.length || fields.features.length}

              <small>{draft.features.length ? "geometrías" : "campos"}</small>

            </strong>

          </div>

        </footer>

      </MappingGIS>

    </section>

  );

}



/**

 * DOCUMENTACIÓN DE INTEGRACIÓN

 *

 * Ruta pública: /mapping. /mapping?zone=zone-03 conserva la selección

 * procedente de Dashboard. AppRouter monta esta página en la aplicación

 * normal; npm run dev:frontend ejecuta su integración con Vite.

 *

 * MappingGIS administra MapLibre, capas, navegación, eventos y Geoman.

 * MappingPage administra filtro de campo, selección, análisis y presentación

 * del inspector. Las geometrías proceden de utils/geojson.ts; actualmente

 * corresponden a mappingGeoData.ts, cuyo origen de demostración es visible.

 *

 * useZoneInsights consulta /api/analysis/zone/:zoneId. Cada actualización

 * cancela la ejecución previa y obtiene otro snapshot. El adapter exige

 * coincidencia de zoneId y fieldId para incorporar riesgo y salud. La

 * ausencia de análisis se presenta como Sin evaluar.

 *

 * La lista y los clicks sobre el mapa comparten selectedZoneId. Turf calcula

 * superficie geométrica y distancia del recorrido; estos valores describen

 * las coordenadas disponibles y no sustituyen una medición catastral.

 *

 * El recorrido demo se muestra para toda la finca. Filtrar un campo entrega

 * trajectory=null. Pausar controla animateRover del motor. Dibujar y medir

 * activa Geoman; los borradores se conservan en memoria de esta página.

 * Exportar descarga el último borrador o la colección GIS visible. La

 * persistencia requiere el servicio de geometrías y validación de dominio.

 *

 * El inspector flota a la derecha en escritorio y utiliza una hoja inferior

 * cerrable en móvil. La superficie del mapa permanece continua y su tamaño

 * responde al contenedor mediante el observador de useAgroMap.


 * La regla de ocultación por campo corresponde al recorrido demo. Las rutas
 * dibujadas conservan su propia geometría y se adaptan como PLANNED_ROUTE.
 * La última línea ROVER_ROUTE terminada activa la simulación del rover.
 * Editar esa ruta reinicia el recorrido; editar otros dibujos conserva su avance.
 *
 * RoverProgress comunica avance por vuelta, longitud total, acumulado y estado.
 * El inspector presenta esos valores sin modificar los snapshots geográficos.
 * Retirar recorrido entrega trajectory=null y libera ruta y rover del motor.
 *
 * draft se entrega a MappingGIS para restaurarlo al volver a abrir el editor.
 * updateDraft conserva las creaciones, ediciones y eliminaciones de Geoman.
 * Recargar la página inicia otra sesión local de borradores.
 *
 */

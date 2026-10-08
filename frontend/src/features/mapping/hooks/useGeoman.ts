/**
 * =========================================
 * useGeoman
 * =========================================
 *
 * Administra el dibujo y la edición de borradores geográficos.
 *
 * Responsabilidad:
 * - inicializar Geoman cuando se habilita el editor;
 * - restaurar los borradores de la sesión;
 * - distinguir zonas, puntos, mediciones y rutas del rover;
 * - coordinar dibujo, edición y eliminación;
 * - comunicar los snapshots GeoJSON al consumidor;
 * - liberar los recursos al finalizar la sesión.
 *
 * Las acciones se ejecutan en orden y cada herramienta
 * desactiva los modos anteriores antes de comenzar.
 *
 * =========================================
 */

// Administramos la sesión y utilizamos los callbacks vigentes del consumidor.
import { useEffect, useEffectEvent, useRef, useState } from "react";

// Compartimos los contratos de los borradores y del mapa.
import type { FeatureCollection } from "geojson";
import type { Map } from "maplibre-gl";

// La implementación de Geoman se carga cuando se habilita el editor.
import type {
  DrawModeName,
  FeatureCreatedFwdEvent,
  Geoman,
  GeoJsonImportFeatureCollection,
} from "@geoman-io/maplibre-geoman-free";

// Cargamos los estilos oficiales del editor.
import "@geoman-io/maplibre-geoman-free/dist/maplibre-geoman.css";

/** Configuración pública de la sesión de edición. */
export interface UseGeomanOptions {
  // Habilita la inicialización del editor.
  readonly enabled?: boolean;

  // Restaura los dibujos conservados al volver a abrir la sesión.
  readonly initialDraft?: FeatureCollection;

  // Entrega la colección completa después de modificar los borradores.
  readonly onChange?: (draft: FeatureCollection) => void;

  // Comunica los errores de inicialización y de los eventos del editor.
  readonly onError?: (error: Error) => void;
}

/** Herramientas disponibles durante una sesión de edición. */
export interface UseGeomanResult {
  // Indica que Geoman terminó de inicializarse para el mapa vigente.
  readonly isReady: boolean;

  // Activa las herramientas de dibujo según su propósito.
  readonly drawZone: () => Promise<void>;
  readonly drawSamplingPoint: () => Promise<void>;
  readonly drawMeasurement: () => Promise<void>;
  readonly drawRoverRoute: () => Promise<void>;

  // Activa la eliminación individual o limpia todos los borradores.
  readonly remove: () => Promise<void>;
  readonly clearAll: () => Promise<void>;

  // Edita las geometrías o finaliza la herramienta vigente.
  readonly edit: () => Promise<void>;
  readonly cancel: () => Promise<void>;
}

/** Conecta Geoman con una instancia cartográfica disponible. */
export function useGeoman(map: Map | null, options: UseGeomanOptions = {}): UseGeomanResult {
  // La sesión comienza únicamente cuando el consumidor habilita el editor.
  const { enabled = false } = options;

  // Conservamos la instancia que terminó de inicializarse.
  const geomanRef = useRef<Geoman | null>(null);

  // Asociamos la disponibilidad con el mapa que posee el editor.
  const [readyMap, setReadyMap] = useState<Map | null>(null);

  // Serializamos las acciones y conservamos la limpieza pendiente.
  const commands = useRef<Promise<void>>(Promise.resolve());
  const teardown = useRef<Promise<void>>(Promise.resolve());

  // Distinguimos el propósito del dibujo que está creando el usuario.
  const purposeRef = useRef<"ZONE" | "SAMPLING_POINT" | "MEASUREMENT" | "ROVER_ROUTE" | null>(null);

  // Los callbacks conservan su versión vigente sin reconstruir Geoman.
  const notifyChange = useEffectEvent((draft: FeatureCollection) => options.onChange?.(draft));
  const notifyError = useEffectEvent((error: Error) => options.onError?.(error));

  // Recuperamos los borradores al iniciar cada sesión.
  const getInitialDraft = useEffectEvent(() => options.initialDraft);

  useEffect(() => {
    // Esperamos un mapa disponible y una sesión habilitada.
    if (!map || !enabled) return;

    // Estas variables pertenecen exclusivamente a esta ejecución.
    let disposed = false;
    let geoman: Geoman | null = null;

    // Exportamos el estado completo después de editar o eliminar una geometría.
    const handleChange = (): void => {
      if (geoman && !disposed) notifyChange(geoman.features.exportGeoJson());
    };

    // Etiquetamos las geometrías terminadas antes de entregar su snapshot.
    const handleCreate = (event: FeatureCreatedFwdEvent): void => {
      // Capturamos el propósito correspondiente al momento de creación.
      const purpose = purposeRef.current;

      void (async () => {
        // Conservamos el propósito como propiedad de la geometría.
        if (purpose) await event.feature.updateProperties({ gisPurpose: purpose });

        // Entregamos la colección con sus propiedades actualizadas.
        handleChange();
      })().catch((error: unknown) => {
        // Comunicamos el fallo únicamente mientras la sesión siga vigente.
        if (!disposed) notifyError(error instanceof Error ? error : new Error(String(error)));
      });
    };

    // Liberamos la sesión una sola vez.
    const dispose = (): void => {
      if (disposed) return;
      disposed = true;

      // Retiramos la escucha de destrucción del mapa.
      map.off("remove", dispose);

      // Invalidamos la disponibilidad correspondiente a esta instancia.
      setReadyMap((current) => current === map ? null : current);

      // Capturamos la instancia que debe limpiarse.
      const instance = geoman;
      geoman = null;

      if (!instance) return;

      // Invalidamos las acciones pendientes de esta sesión.
      if (geomanRef.current === instance) geomanRef.current = null;

      // Retiramos los listeners antes de destruir el editor.
      instance.mapAdapter.off<"gm:create">("gm:create", handleCreate);
      instance.mapAdapter.off("gm:editend", handleChange);
      instance.mapAdapter.off("gm:remove", handleChange);

      // Esperamos las acciones pendientes antes de liberar las fuentes.
      teardown.current = commands.current
        .catch(() => undefined)
        .then(() => instance.destroy({ removeSources: true }))
        .catch(() => undefined);
    };

    // La destrucción del mapa también finaliza su editor.
    map.on("remove", dispose);

    void (async () => {
      try {
        // Esperamos la limpieza de una sesión anterior.
        await teardown.current;
        if (disposed) return;

        // Cargamos Geoman únicamente cuando se necesita.
        const { Geoman } = await import("@geoman-io/maplibre-geoman-free");
        if (disposed) return;

        // La barra de AgroVision proporciona las herramientas visuales.
        geoman = new Geoman(map, { settings: { controlsUiEnabledByDefault: false } });

        // Esperamos los recursos internos del plugin.
        const loaded = await geoman.waitForGeomanLoaded();
        if (disposed) return;

        if (!loaded) throw new Error("Geoman no pudo completar su inicialización.");

        // Restauramos los borradores antes de escuchar nuevos cambios.
        const initialDraft = getInitialDraft();

        if (initialDraft?.features.length) {
          await geoman.features.importGeoJson(initialDraft as GeoJsonImportFeatureCollection);
          if (disposed) return;
        }

        // Escuchamos creación, edición y eliminación.
        geoman.mapAdapter.on("gm:create", handleCreate);
        geoman.mapAdapter.on("gm:editend", handleChange);
        geoman.mapAdapter.on("gm:remove", handleChange);

        // Publicamos la instancia cuando terminó de inicializarse.
        geomanRef.current = geoman;
        setReadyMap(map);
      } catch (error) {
        if (!disposed) {
          // Liberamos los recursos antes de comunicar el error.
          dispose();
          notifyError(error instanceof Error ? error : new Error(String(error)));
        }
      }
    })();

    // React finaliza esta sesión al desmontar o cambiar sus entradas.
    return dispose;
  }, [map, enabled]);

  /** Ejecuta una acción después de desactivar los modos anteriores. */
  const run = (operation: (instance: Geoman) => Promise<void>): Promise<void> => {
    // Capturamos la instancia a la que pertenece esta solicitud.
    const instance = geomanRef.current;

    // Un error anterior permite continuar con las siguientes acciones.
    const command = commands.current.catch(() => undefined).then(async () => {
      if (!instance || instance !== geomanRef.current) {
        throw new Error("Geoman todavía no está disponible para esta acción.");
      }

      // Finalizamos las herramientas anteriores antes de activar otra.
      await instance.disableAllModes();

      // Ejecutamos la operación mientras la instancia siga vigente.
      if (instance === geomanRef.current) await operation(instance);
    });

    // Conservamos la operación para ordenar las siguientes solicitudes.
    commands.current = command;
    return command;
  };

  /** Activa un dibujo y registra el propósito de su geometría. */
  const draw = (
    shape: DrawModeName,
    purpose: NonNullable<typeof purposeRef.current>,
  ): Promise<void> => run(async (instance) => {
    purposeRef.current = purpose;
    await instance.enableDraw(shape);
  });

  return {
    // La disponibilidad corresponde exclusivamente al mapa recibido.
    isReady: enabled && map !== null && readyMap === map,

    // Activamos los modos de dibujo con sus propósitos explícitos.
    drawZone: () => draw("polygon", "ZONE"),
    drawSamplingPoint: () => draw("marker", "SAMPLING_POINT"),
    drawMeasurement: () => draw("line", "MEASUREMENT"),
    drawRoverRoute: () => draw("line", "ROVER_ROUTE"),

    // El usuario elimina una geometría pulsando sobre ella.
    remove: () => run((instance) => instance.enableGlobalRemovalMode()),

    // Retiramos todos los borradores y entregamos la colección resultante.
    clearAll: () => run(async (instance) => {
      await instance.features.deleteAll();

      if (instance === geomanRef.current) {
        options.onChange?.(instance.features.exportGeoJson());
      }
    }),

    // Activamos la edición de las geometrías administradas por Geoman.
    edit: () => run((instance) => instance.enableGlobalEditMode()),

    // Finalizamos la herramienta conservando los dibujos completados.
    cancel: () => run(async () => undefined),
  };
}

/**
 * DOCUMENTACIÓN DE INTEGRACIÓN
 *
 * initialDraft restaura los dibujos conservados por el consumidor.
 * onChange entrega la colección completa después de modificar geometrías.
 *
 * gisPurpose distingue ZONE, SAMPLING_POINT, MEASUREMENT y ROVER_ROUTE.
 * El consumidor adapta las líneas ROVER_ROUTE al contrato MapLineFeature.
 *
 * remove activa la eliminación por click.
 * clearAll elimina los borradores de Geoman.
 * cancel finaliza la herramienta activa y conserva los dibujos completados.
 *
 * Los borradores permanecen en memoria hasta que el consumidor los
 * exporta o integra su persistencia mediante un servicio de geometrías.
 */
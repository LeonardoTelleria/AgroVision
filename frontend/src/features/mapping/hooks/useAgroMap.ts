/**
 * =========================================
 * useAgroMap
 * =========================================
 *
 * Hook central del motor cartográfico de AgroVision.
 *
 * Responsabilidad:
 * - crear una instancia MapLibre por contenedor React;
 * - consumir la configuración central de baseMap;
 * - registrar los controles de navegación y escala;
 * - exponer la instancia cuando finaliza su carga inicial;
 * - comunicar los errores del motor cartográfico;
 * - adaptar el canvas al tamaño del contenedor;
 * - liberar los recursos al finalizar la sesión.
 *
 * Integración:
 * AgroMap proporciona el contenedor y las opciones.
 * useAgroMap administra la instancia de MapLibre.
 * Los consumidores reciben el mapa cargado para integrar
 * capas GIS, interacciones y herramientas de edición.
 *
 * =========================================
 */

// Importamos los hooks necesarios para administrar el ciclo de vida del mapa.
import { useEffect, useEffectEvent, useRef, useState } from "react";

// Importamos el contrato de las referencias de React.
import type { RefObject } from "react";

// Importamos el motor cartográfico y sus controles oficiales.
import { Map, NavigationControl, ScaleControl, setWorkerUrl } from "maplibre-gl";

// Importamos el contrato de los errores emitidos por MapLibre.
import type { ErrorEvent as MapErrorEvent } from "maplibre-gl";

// Vite genera la URL del worker utilizado por el motor cartográfico.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

// Cargamos los estilos oficiales del canvas, los controles y los popups.
import "maplibre-gl/dist/maplibre-gl.css";

// Consumimos la configuración central y sus valores iniciales.
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, getBaseMapOptions } from "../layers/baseMap";

// Compartimos el contrato de coordenadas del sistema GIS.
import type { LngLat } from "../types/mappingGeo.types";

// Configuramos el worker antes de crear cualquier instancia de MapLibre.
setWorkerUrl(workerUrl);

/**
 * Opciones públicas de inicialización del mapa.
 *
 * Los valores opcionales utilizan la configuración predeterminada
 * cuando el consumidor no proporciona una alternativa.
 */
export interface UseAgroMapOptions {
  // Referencia al elemento HTML donde se montará el canvas.
  readonly containerRef: RefObject<HTMLDivElement | null>;

  // Centro inicial siguiendo el orden [longitud, latitud].
  readonly center?: LngLat;

  // Nivel inicial de acercamiento.
  readonly zoom?: number;

  // Habilita la interacción mediante teclado, ratón y gestos.
  readonly interactive?: boolean;

  // Controla la presencia de los controles de zoom y orientación.
  readonly showNavigationControl?: boolean;

  // Controla la presencia de la escala métrica.
  readonly showScaleControl?: boolean;

  // Recibe la instancia cuando termina su carga inicial.
  readonly onMapReady?: (map: Map) => void;

  // Recibe errores de inicialización y eventos de error del motor.
  readonly onMapError?: (error: Error) => void;
}

/**
 * Resultado público del hook.
 *
 * mapRef permite consultar la instancia durante su ciclo de vida.
 * map proporciona una salida reactiva después de la carga inicial.
 */
export interface UseAgroMapResult {
  // Referencia persistente a la instancia creada.
  readonly mapRef: RefObject<Map | null>;

  // Instancia cargada correspondiente a la configuración vigente.
  readonly map: Map | null;

  // Indica que la instancia terminó su carga inicial.
  readonly isMapLoaded: boolean;
}

/** Snapshot de una instancia cargada y de su configuración de origen. */
interface LoadedMapState {
  // Instancia que completó el evento inicial de carga.
  readonly map: Map;

  // Identidad de los valores utilizados para crear el mapa.
  readonly key: string;

  // Referencia del contenedor asociado con esta instancia.
  readonly containerRef: RefObject<HTMLDivElement | null>;
}

/**
 * Administra una instancia cartográfica y conserva los callbacks vigentes.
 *
 * Los cambios en la configuración inicial reconstruyen la instancia.
 * Los cambios de identidad de los callbacks conservan el mapa existente.
 */
export function useAgroMap(options: UseAgroMapOptions): UseAgroMapResult {
  // Aplicamos los valores predeterminados a las opciones recibidas.
  const {
    containerRef,
    center = DEFAULT_MAP_CENTER,
    zoom = DEFAULT_MAP_ZOOM,
    interactive = true,
    showNavigationControl = true,
    showScaleControl = true,
  } = options;

  // Utilizamos coordenadas individuales para reconocer centros equivalentes.
  const [longitude, latitude] = center;

  // Conservamos la instancia entre renders del componente.
  const mapRef = useRef<Map | null>(null);

  // Identificamos los valores que determinan la creación de la instancia.
  const configurationKey = `${longitude}:${latitude}:${zoom}:${interactive}:${showNavigationControl}:${showScaleControl}`;

  // Asociamos la instancia cargada con su configuración y su contenedor.
  const [loaded, setLoaded] = useState<LoadedMapState | null>(null);

  // Leemos el callback vigente sin reconstruir el mapa cuando cambia su referencia.
  const notifyReady = useEffectEvent((instance: Map) => options.onMapReady?.(instance));

  // Comunicamos los errores mediante el callback vigente del consumidor.
  const notifyError = useEffectEvent((error: Error) => options.onMapError?.(error));

  /**
   * Inicialización y destrucción de la sesión cartográfica.
   *
   * Cada ejecución administra su instancia, sus listeners
   * y su observador de tamaño.
   */
  useEffect(() => {
    // Recuperamos el contenedor asignado por React.
    const container = containerRef.current;

    // Esperamos a que el elemento HTML esté disponible.
    if (!container) return;

    // Declaramos la instancia que pertenecerá a esta ejecución.
    let instance: Map;

    try {
      // Combinamos la configuración central con las opciones del consumidor.
      instance = new Map({
        ...getBaseMapOptions(),
        container,
        center: [longitude, latitude],
        zoom,
        interactive,
      });
    } catch (error) {
      // Normalizamos el fallo de construcción al contrato público Error.
      notifyError(error instanceof Error ? error : new Error(String(error)));
      return;
    }

    // Exponemos la instancia creada mientras se completa su carga inicial.
    mapRef.current = instance;

    // Registramos si la instancia ya fue destruida.
    let removed = false;

    // Conservamos el observador para liberarlo incluso si falla la configuración.
    let observer: ResizeObserver | null = null;

    // Publicamos el mapa una vez que termina su carga inicial.
    const handleLoad = (): void => {
      // Protegemos la sesión frente a notificaciones posteriores a su destrucción.
      if (removed) return;

      // Ajustamos el canvas al tamaño actual antes de entregar la instancia.
      instance.resize();

      // Publicamos el snapshot cargado para los consumidores de React.
      setLoaded({ map: instance, key: configurationKey, containerRef });

      // Informamos que el mapa está disponible para las integraciones GIS.
      notifyReady(instance);
    };

    // Comunicamos los errores emitidos durante la vida de esta instancia.
    const handleError = (event: MapErrorEvent): void => {
      notifyError(event.error instanceof Error ? event.error : new Error(String(event.error)));
    };

    // Sincronizamos las referencias y el estado cuando MapLibre se destruye.
    const handleRemove = (): void => {
      // Marcamos la instancia para evitar una segunda destrucción.
      removed = true;

      // Detenemos las observaciones de tamaño del contenedor.
      observer?.disconnect();

      // Limpiamos únicamente la referencia perteneciente a esta sesión.
      if (mapRef.current === instance) mapRef.current = null;

      // Retiramos el snapshot si corresponde al mapa eliminado.
      setLoaded((current) => current?.map === instance ? null : current);
    };

    // El evento inicial de carga se procesa una sola vez por instancia.
    instance.once("load", handleLoad);

    // Conservamos la escucha de errores durante toda la sesión.
    instance.on("error", handleError);

    // Observamos la destrucción para mantener sincronizada la salida del hook.
    instance.on("remove", handleRemove);

    // Centralizamos la liberación de los recursos de esta ejecución.
    const cleanup = (): void => {
      // Desconectamos el observador antes de retirar el canvas.
      observer?.disconnect();

      // Retiramos los listeners de carga y de errores.
      instance.off("load", handleLoad);
      instance.off("error", handleError);

      // MapLibre libera los controles, el canvas y sus recursos internos.
      if (!removed) instance.remove();

      // Retiramos el listener después de sincronizar el estado de destrucción.
      instance.off("remove", handleRemove);
    };

    try {
      // Incorporamos los controles de zoom y orientación cuando están habilitados.
      if (showNavigationControl) {
        instance.addControl(
          new NavigationControl({ showCompass: true, showZoom: true, visualizePitch: false }),
          "top-right",
        );
      }

      // Incorporamos una escala que utiliza metros o kilómetros según el zoom.
      if (showScaleControl) {
        instance.addControl(new ScaleControl({ maxWidth: 100, unit: "metric" }), "bottom-left");
      }

      // Detectamos cambios del layout aunque el tamaño de la ventana permanezca igual.
      observer = new ResizeObserver(() => {
        // Actualizamos el canvas mientras la instancia permanezca activa.
        if (!removed) instance.resize();
      });

      // Observamos específicamente el contenedor cartográfico.
      observer.observe(container);
    } catch (error) {
      // Liberamos la instancia si falla la configuración posterior a su creación.
      cleanup();

      // Entregamos el fallo al consumidor mediante el contrato público.
      notifyError(error instanceof Error ? error : new Error(String(error)));
      return;
    }

    // React ejecuta la limpieza al desmontar o cambiar la configuración inicial.
    return cleanup;
  }, [containerRef, longitude, latitude, zoom, interactive, showNavigationControl, showScaleControl, configurationKey]);

  // Exponemos únicamente el snapshot correspondiente a las entradas vigentes.
  const map = loaded?.key === configurationKey && loaded.containerRef === containerRef ? loaded.map : null;

  // Entregamos la referencia persistente y el estado reactivo de carga.
  return { mapRef, map, isMapLoaded: map !== null };
}

/**
 * DOCUMENTACIÓN DE INTEGRACIÓN
 *
 * Entrada:
 * UseAgroMapOptions con el contenedor, la configuración inicial
 * y los callbacks opcionales de disponibilidad y error.
 *
 * Salida:
 * mapRef se asigna al crear la instancia.
 * map permanece en null hasta completar la carga inicial.
 * isMapLoaded indica la disponibilidad inicial del mapa vigente.
 *
 * Configuración:
 * baseMap centraliza estilo, cámara y opciones compartidas.
 * Cambiar centro, zoom, interactividad, controles o la referencia
 * del contenedor reconstruye la instancia.
 * Un nuevo array con las mismas coordenadas conserva el mapa.
 *
 * Callbacks:
 * useEffectEvent requiere React 19.2 o posterior y permite
 * utilizar los callbacks vigentes durante la sesión.
 *
 * Tamaño y limpieza:
 * ResizeObserver adapta el canvas a cambios del contenedor.
 * La destrucción libera listeners, observador y recursos de MapLibre,
 * y retira la instancia de las referencias y del estado reactivo.
 *
 * Carga y errores:
 * isMapLoaded describe la carga inicial; los eventos de error posteriores
 * se comunican mediante onMapError y conservan la instancia activa.
 */

/** 
 *             useAgroMap
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
     creación   controles   cleanup
        │
        ▼
     MapLibre
        │
        ▼
   OpenFreeMap
 */
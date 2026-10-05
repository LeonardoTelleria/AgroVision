/**
 * =========================================
 * useAgroMap
 * =========================================
 *
 * Hook central del motor cartográfico de AgroVision.
 *
 * Responsabilidad:
 * Crear, configurar, exponer y destruir correctamente
 * la instancia de MapLibre utilizada por el sistema GIS.
 *
 * Este hook NO dibuja todavía:
 * - parcelas;
 * - zonas;
 * - sensores;
 * - riesgos;
 * - trayectorias;
 * - GeoJSON;
 * - popups;
 * - herramientas Geoman.
 *
 * Esas responsabilidades pertenecerán a capas y componentes
 * especializados que construiremos posteriormente.
 *
 * Flujo:
 *
 * AgroMap.tsx
 *      ↓
 * useAgroMap()
 *      ↓
 * MapLibre
 *      ↓
 * OpenFreeMap
 *
 * =========================================
 */

import { useEffect, useRef, useState } from "react"

// Importamos los tipos y clases principales de MapLibre.
import { Map, NavigationControl, ScaleControl, setWorkerUrl } from "maplibre-gl";
// importacion del worker MapLibre para Vite
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
// Importamos el CSS oficial de MapLibre. Aquí viven estilos de controles, atribución y otros elementos internos del motor cartográfico.
import "maplibre-gl/dist/maplibre-gl.css";

setWorkerUrl(workerUrl)

/**
 * =========================================
 * Constantes del mapa
 * =========================================
*/
const OPENFREEMAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

/**
 * Opciones necesarias para inicializar AgroMap.
 *
 * El componente AgroMap será responsable de proporcionar
 * estas opciones al hook.
 */
export interface UseAgroMapOptions {
    // Referencia al elemento HTML donde MapLibre deberá montar su canvas.
    readonly containerRef: React.RefObject<HTMLDivElement | null>;
    readonly center: [number, number];
    readonly zoom: number;
    readonly interactive: boolean;
    readonly showNavigationControl: boolean;
    readonly showScaleControl: boolean;
    readonly onMapReady?: (map: Map) => void;
}   

// Resultado público que expone useAgroMap
export interface UseAgroMapResult {

  /**
   * Referencia persistente a la instancia de MapLibre.
   *
   * Será utilizada por:
   * - layers;
   * - Geoman;
   * - popups;
   * - interacción;
   * - controles personalizados.
   */
  readonly mapRef: React.RefObject<Map | null>;

  // Indica si MapLibre terminó de cargar correctamente su estilo y recursos iniciales.
  readonly isMapLoaded: boolean;
}

// Hook responsable del ciclo de vida completo de una instancia de MapLibre.
export function useAgroMap(
    options: UseAgroMapOptions
): UseAgroMapResult {

   // Extraemos las opciones recibidas para que el código sea más fácil de leer.
    const {
        containerRef,
        center,
        zoom,
        interactive,
        showNavigationControl,
        showScaleControl,
        onMapReady,
    } = options;

    // useRef es importante porque queremos conservar la misma instancia entre renders de React.
    const mapRef = useRef<Map | null>(null);

    // Guardamos el callback más reciente recibido desde el componente padre.
    // Esto evita que un cambio de referencia de la funciónobligue a destruir y reconstruir todo el mapa.
    const onMapReadyRef = useRef(onMapReady);

    /**
     * Actualizamos la referencia al callback cuando cambie.
     *
     * La instancia de MapLibre continuará siendo la misma,
     * pero utilizará siempre la versión más reciente
     * de la función.
    */
    useEffect(() => { onMapReadyRef.current = onMapReady }, [onMapReady]);

    //  Estado que informa si MapLibre ya terminó su proceso inicial de carga.
    const [isMapLoaded, setIsMapLoaded] = useState(false);

/**
 * =====================================================
 * Inicialización y destrucción del mapa
 * =====================================================
 *
 * Este efecto:
 *
 * 1. comprueba que exista el contenedor;
 * 2. evita crear una instancia duplicada;
 * 3. crea MapLibre;
 * 4. registra los controles;
 * 5. espera al evento "load";
 * 6. informa que el mapa está listo;
 * 7. destruye la instancia al desmontar.
*/
    useEffect(() => {
        //Verificamos que se haya asignado correctamente el elemento HTML a nuestra referencia.
        if (!containerRef.current) {
            return;
        }
        // Seguridad contra doble inicialización. Si ya tenemos una instancia de MapLibre asociad al componente, no creamos otra.
        if (mapRef.current) {
            return;
        }

        // instancia principal de MapLibre.
        const map = new Map({

            // elemento DOM donde MapLibre insertará su canvas y estructura interna.
            container: containerRef.current,

            style: OPENFREEMAP_STYLE_URL,
            center,
            zoom,
            interactive,
            attributionControl: {
                compact: true,
            },
            dragRotate: true,
            pitchWithRotate: true,
            maxPitch: 85,
        });

        // Guardamos inmediatamente la instancia en el ref. 
        // Desde este momento el resto de AgroVision podrá acceder al mismo mapa a través de mapRef.
        mapRef.current = map;

        // Escuchamos el evento "load". indica que MapLibre terminó de cargar y está listo para comenzara recibir las capas y fuentes.
        map.on("load", () => {

            //Comprobamos si la pantalla solicitó controles de navegación.
            if (showNavigationControl) {
                map.addControl(
                    new NavigationControl({
                        showCompass: true,
                        showZoom: true,
                        visualizePitch: false,
                    }), "top-right",
                );
            }

            if (showScaleControl) {
                map.addControl(
                    new ScaleControl({
                        maxWidth: 100,
                        unit: "metric",
                    }), "bottom-left",
                );
            }
            // Informamos a React de que el mapa terminó correctamente su inicialización.
            setIsMapLoaded(true);

            /**
             * Ejecutamos el callback más reciente proporcionado por el componente padre.
             *
             * Gracias a optional chaining, no ocurre nada cuando onMapReady no fue proporcionado.*/
            onMapReadyRef.current?.(map);
            map.resize();
        });

        /**=================================================
         * Cleanup
         * =================================================*/
        return () => {
            map.remove();
            mapRef.current = null;
            setIsMapLoaded(false);
        };

        //Estas dependencias representan parámetros que sí justifican reconstruir la instancia inicial.
    },  [ containerRef, center, zoom, interactive, showNavigationControl, showScaleControl]);

    // Devolvemos únicamente la información que el componente consumidor necesita.
    return {
        mapRef,
        isMapLoaded,
    };
}

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
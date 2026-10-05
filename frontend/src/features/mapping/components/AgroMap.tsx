/** 
 * 
 * Aquí se crea, configura, muestra y destruye correctamente 
 * la instancia de MapLibre dentro de React.
 */

import { useEffect, useRef } from 'react';

// Importamos la clase principal de MapLibre GL JS, esta crea y controla la instancia interactiva del mapa
import { Map, NavigationControl, ScaleControl, setWorkerUrl } from 'maplibre-gl';

//IMportamos el worker oficial de Maplibre.
// Vite necesita conocer la URL de este worker para ejecutar la parte de renderizado a desplegar
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

// Configuramos el worker de MapLibre para el entorno Vite.
// Esta línea debe ejecutarse antes de crear cualquier mapa.
setWorkerUrl(workerUrl);

// URL del estilo cartográfico que utilizaremos como mapa base.
// OpenFreeMap publica este estilo compatible directamente con MapLibre.
const OPENFREEMAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

// Centro inicial del mapa. Las coordenadas siguen el orden [longitud, latitud].
// En este caso se apunta aproximadamente al centro de Nicaragua.
const DEFAULT_CENTER: [number, number] = [-85.2, 12.9];

// Nivel de zoom inicial.
// 7 permite visualizar Nicaragua y sus alrededores sin empezar demasiado cerca de una zona concreta.
const DEFAULT_ZOOM = 7;

// Definimos las propiedades públicas del componente.
// Mantenerlas aquí inicialmente permite que AgroMap funcione
// antes de crear nuestro archivo especializado de tipos GIS.
interface AgroMapProps {
  
    // Clase CSS adicional opcional para que cada pantalla pueda modificar el tamaño o posición del mapa sin tocar el componente.
    readonly className?: string;

    // Centro opcional , si no recibe uno, utilizará Nicaragua por defecto 
    readonly center?: [number, number];

    // Zoom inicial opcional, asi Dashboard y Mapping utilizan escalas distintas.
    readonly zoom?: number;

    // Indica si el usuario podrá interactuar con el mapa, por defecto estará habilitado.
    readonly interactive?: boolean;

    // Controla si mostramos los controles de navegacion 
    readonly showNavigationControl?: boolean;

    // Controla si mostramos la escala métrica del mapa
    readonly showScaleControl?: boolean;

    // Callback opcional que expone la instancia de MapLibre cuando el mapa termina de cargar.
    readonly onMapReady?: (map: Map) => void;
}

// componente reutilizable que usará MappingPage y DashboardPage 
export function AgroMap({

    className="",
    center = DEFAULT_CENTER,
    zoom = DEFAULT_ZOOM,
    interactive = true,
    showNavigationControl = true,
    showScaleControl = true,
    onMapReady,

}: AgroMapProps) {
    // Referencia al elemento HTML que servirá como contenedor físico de MapLibre.
    const mapContainerRef = useRef<HTMLDivElement | null>(null);

    // Referencia persistente a la instancia de MapLibre.
    // useRef evita que React vuelva a crear la instancia en cada render del componente.
    const mapRef = useRef<Map | null>(null);

    // useEffect sincroniza la creación y destrucción del mapa con el montaje/desmontaje del componente React.
    useEffect(() => {
        // Verificamos que React haya podido obtener correctamente el elemento contenedor.
        if (!mapContainerRef.current) {
            return;
        }
        // se evita crear accidentalmente dos mapas dentro del mismo component
        if (mapRef.current) {
            return 
        }

        // Se crea la instancia principal de maplibre
        const map = new Map({
            // se entrega el elemento DOM donde se dibujará el mapa
            container: mapContainerRef.current,
            // indicamos el estilo cartografico 
            style: OPENFREEMAP_STYLE_URL,
            // picicion,  zoom inicial e interactividad del mapa
            center,
            zoom, 
            interactive,
            // Dejamos explícitamente habilitada la atribución. la cartografía utiliza datos provenientes de OpenStreetMap/OpenFreeMap.
            // "compact: true" hace que se muestre de forma compacta y responsive.
            attributionControl: {
                compact: true},
            // se habilita la rotacion para usar mas delante la vista 3D y que responda el gesto de pitch
            dragRotate: true,
            pitchWithRotate: true,
            // límite razonable de inclinación 3D
            maxPitch: 85,
        });

        // guardamos la instancia creada dentro de la referencia 
        mapRef.current = map;

        // Esperamos a que maplibre cargue su estilo y recursos
        map.on("load", () => {
            // se añaden los controles de bav solo si la pantalla lo solicita 
            if (showNavigationControl) {
                map.addControl(
                    new NavigationControl({
                        // mostramos el control de rotacion, zoom y pitch (solo se va habilitar en 3D)
                        showCompass: true,
                        showZoom: true,
                        visualizePitch: false, // true cuando se implemente el 3D
                    }), "top-right",  
                );
            }

            // añadios la escala metrica si esta habilitada 
            if (showScaleControl) {
                // ScaleControl muestra una referencia visual de distancia basada en el nivel de zoom actual.
                map.addControl(
                    new ScaleControl({
                        maxWidth: 100,
                        unit: "metric" // se usan KM donde correspondan y M para dist menores
                    }), "bottom-left"   
                );
            }

            // se avisa al componente padre que el mapa ya esta disponible
            onMapReady?.(map)

            // Solicitamos a MapLibre recalcular el tamaño del canvas. Esto evita problemas cuando el contenedor aparece dentro de un layout dinámico de React.
            map.resize();
        });

        /** Funcion de limpieza ejecutada uando React desmonta el componente o vuelve a ejecutar este efecto */ 
        return () => {
            // Eliminamos completamente la instancia de MapLibre. Esto libera listeners, canvas, workers y memoria asociada.
            map.remove();

            // Limpiamos la referencia para que no apuntea una instancia que ya fue destruida.
            mapRef.current = null
        };
    }, [
        center, zoom, interactive, showNavigationControl, showScaleControl, onMapReady,
    ]);

    // clase final del contenedor.
    // La clase "agroMap" siempre estará presente y la clase externa se añadirá únicamente cuando el consumidor la proporcione.
    const mapClassName = className.length > 0 ? `agroMap ${className}` : `agroMap`

    // renderizamos solo el contenedor del mapa que mMapLibre usara como superficie de render
    return (
        <div 
            // Aplicamos las clases CSS definidas anteriormente.
            className={mapClassName}
            // Referenciamos el elemento para que MapLibre pueda inicializarse dentro de él.
            ref={mapContainerRef}
            // Definimos un nombre accesible para la región.
            role="region"
            aria-label="Mapa interactivo AgroVision"
            style={{
                width: "100%",
                height: "100%",
                minHeight: "320px",
            }}
        />
    );
}

/** 
 * AgroMap.tsx
      │
      ▼
<div ref={mapContainerRef}>
      │
      ▼
new Map(...)
      │
      ├── OpenFreeMap
      ├── Nicaragua
      ├── zoom
      ├── interacción
      ├── navegación
      └── escala
      │
      ▼
     MAPA
 */


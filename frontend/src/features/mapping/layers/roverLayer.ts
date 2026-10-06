/**
 * =========================================
 * AgroVision Rover Layer
 * =========================================
 *
 * Vehículo agrícola animado utilizado para representar un rover operando dentro de una finca AgroVision.
 *
 * Responsabilidad:
 * - crear la fuente GeoJSON del rover y mostrar su posición actual;
 * - moverlo sobre una trayectoria;
 * - mantener la posición sincronizada con Turf y permitir iniciar y detener la animación.
 *
 * Flujo:
 *
 * LineString
 *     ↓
 * Turf length
 *     ↓
 * Turf along
 *     ↓
 * posición actual
 *     ↓
 * GeoJSON Point
 *     ↓
 * MapLibre
 *
 * =========================================
 */

// Importamos los tipos GeoJSON necesarios.
import type { Feature, GeoJsonProperties, LineString, Point} from "geojson";

// Importamos Turf para calcular la posición del rover sobre la trayectoria.
import { along, length } from "@turf/turf";

// Importamos MapLibre.
import type { GeoJSONSource, Map} from "maplibre-gl";

// =========================================
// IDS
// =========================================

// ID de la fuente GeoJSON del rover.
export const ROVER_SOURCE_ID = "agrovision-rover-source";

// ID de la capa visual del rover.
export const ROVER_LAYER_ID = "agrovision-rover-layer";

// =========================================
// TYPES
// =========================================

// Propiedades mínimas del rover.
export interface RoverProperties {
  // ID unico, estado operacional y velocidad simulada en km/h.
  readonly roverId: string;
  readonly status:
    | "ACTIVE"
    | "PAUSED"
    | "OFFLINE";
  readonly speedKmh: number;
}

// Feature puntual del rover.
export type RoverFeature = Feature<Point, RoverProperties>;

// =========================================
// CONSTANTS
// =========================================

// Velocidad visual de desplazamiento e intervalo de actualización.
const ROVER_SPEED_KMH = 12;
const ROVER_FRAME_TIME = 1000 / 30;

/** =========================================
 * STATE
 * =========================================
 */ 

// ID de la animación actualmente activa.
let roverAnimationFrame: number | null = null;

// Tiempo del último frame.
let lastAnimationTime = 0;

// Distancia recorrida actualmente.
let currentDistanceKm = 0;

// =========================================
// CREATE ROVER
// =========================================

/**
 * Crea el Feature puntual inicial del rover.
 */
export const createRoverFeature = (
  coordinates: [number, number],
): RoverFeature => {
  // Devolvemos un Feature GeoJSON válido.
  return {

    type: "Feature",
    // ID estable.
    id: "rover-001",
    // Posición actual donde el rover es el punto y las Coordenadas [longitude , latitude]
    geometry: {
      type: "Point",
      coordinates,
    },

    // Estado operativo.
    properties: {
      // ID visible.
      roverId: "rover-001",
      // Inicialmente activo y  su velocidad simulada.
      status: "ACTIVE",
      speedKmh: ROVER_SPEED_KMH,
    },
  };
};

// =========================================
// ADD ROVER
// =========================================

/**
 * Agrega el rover al mapa.
 */
export const addRoverLayer = (
  map: Map,
  initialCoordinates: [number, number],
): boolean => {
  // Evitamos duplicar la fuente.
  if (!map.getSource(ROVER_SOURCE_ID)) {
    // Creamos la fuente GeoJSON.
    map.addSource(
      ROVER_SOURCE_ID,
      {
        // Tipo de fuente y posicion inicial 
        type: "geojson",
        data: createRoverFeature(initialCoordinates)
      },
    );
  }

  // Evitamos duplicar la capa.
  if (map.getLayer(ROVER_LAYER_ID)) {
    return false;
  }

  // Agregamos la representación visual.
  map.addLayer({
    // ID único.
    id: ROVER_LAYER_ID,
    // Representación puntual.
    type: "circle",
    // Fuente del rover.
    source: ROVER_SOURCE_ID,
    // Diseño visual del vehículo.
    paint: {
      // Tamaño del rover y color princpal 
      "circle-radius": 7,
      "circle-color": "#123C35",

      // Borde claro para separarlo del mapa, grosor del borde
      "circle-stroke-color": "#FFFFFF",
      "circle-stroke-width": 2,
    },
  });

  // Confirmamos que fue agregado.
  return true;
};

// =========================================
// UPDATE POSITION
// =========================================

/**
 * Actualiza la posición del rover.
 */
export const updateRoverPosition = (
  map: Map,
  coordinates: [number, number],
): void => {
  // Obtenemos explícitamente la fuente GeoJSON.
  const source = map.getSource<GeoJSONSource>(ROVER_SOURCE_ID);

  // Si no existe, no hacemos nada.
  if (!source) {
    return;
  }

  // Creamos el nuevo Feature puntual y actualizamos solamente la posición 
  const rover = createRoverFeature(coordinates);

  void source.setData(rover);
};

// =========================================
// START ANIMATION
// =========================================

/**
 * Inicia el movimiento del rover sobre un LineString existente.
 */
export const startRoverAnimation = (
  map: Map,
  route: Feature<LineString, GeoJsonProperties>
): void => {
  // Detenemos cualquier animación anterior.
  stopRoverAnimation();

  // Calculamos la longitud completa de la ruta.
  const routeLengthKm = length(route, {units: "kilometers"});

  // Reiniciamos la posición y el reloj
  currentDistanceKm = 0;
  lastAnimationTime = performance.now();

  /** Frame principal de animación. */
  const animate = (timestamp: number): void => {
    // Calculamos el tiempo transcurrido.
    const elapsed = timestamp - lastAnimationTime;

    // Limitamos actualizaciones para evitar procesamiento innecesario.
    if (elapsed < ROVER_FRAME_TIME) {
      roverAnimationFrame = requestAnimationFrame(animate);

      return;
    }

    // Guardamos el instante actual.
    lastAnimationTime = timestamp;

    // Convertimos velocidad km/h a km/ms.
    const distancePerMillisecond = ROVER_SPEED_KMH / 3_600_000;

    // Calculamos la distancia recorrida.
    currentDistanceKm += distancePerMillisecond * elapsed;

    // Reiniciamos la ruta cuando llegamos al final para mantener la demo activa.
    if (currentDistanceKm > routeLengthKm) {
      currentDistanceKm = 0;
    }

    // Calculamos la posición exacta sobre el LineString mediante Turf.
    const currentPoint = along(
      route,
      currentDistanceKm,
      {units: "kilometers"},
    );
    
    // se extrae unicamente longitud y latitud 
    const [ longitude, latitude] = currentPoint.geometry.coordinates
    // Actualizamos el rover estrictamente compatible con nuestro contrato -> una tupla de dos coordenas [number, number]
    updateRoverPosition(map, [longitude, latitude]);

    // Solicitamos el siguiente frame
    roverAnimationFrame = requestAnimationFrame(animate);
  }
  // Iniciamos el ciclo de animación.
  roverAnimationFrame = requestAnimationFrame(animate);
};

// =========================================
// STOP ANIMATION
// =========================================

/**
 * Detiene la animación del rover.
 */
export const stopRoverAnimation =
  (): void => {
    // Solo cancelamos cuando existe una animación activa.
    if (roverAnimationFrame !== null) {
      // Cancelamos el frame actual.
      cancelAnimationFrame(roverAnimationFrame);

      // Limpiamos el estado.
      roverAnimationFrame = null;
    }
  };

// =========================================
// REMOVE
// =========================================

/**
 * Elimina el rover del mapa.
 */
export const removeRoverLayer = (
  map: Map,
): void => {
  // Detenemos primero la animación.
  stopRoverAnimation();

  // Eliminamos la capa visual.
  if (map.getLayer(ROVER_LAYER_ID)) {
    map.removeLayer(ROVER_LAYER_ID);
  }

  // Eliminamos la fuente.
  if (map.getSource(ROVER_SOURCE_ID)) {
    map.removeSource(ROVER_SOURCE_ID);
  }
};
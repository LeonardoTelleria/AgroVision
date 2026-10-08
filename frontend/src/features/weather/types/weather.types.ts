// Contratos TypeScript del módulo meteorológico para datos, códigos, coordenadas y estados de interfaz.

/**
 * =========================================
 * Weather Types
 * =========================================
 *
 * Contratos de datos del módulo meteorológico de AgroVision.
 *
 * Responsabilidad:
 * - representar las coordenadas utilizadas para consultar el clima;
 * - definir los códigos meteorológicos recibidos desde Open-Meteo;
 * - representar las condiciones meteorológicas normalizadas;
 * - representar el clima actual;
 * - representar el pronóstico diario;
 * - representar la ubicación asociada a una consulta;
 * - definir la respuesta final que consumirá la interfaz;
 * - tipar la respuesta externa mínima utilizada desde Open-Meteo;
 * - definir estados de carga y error para los componentes de clima.
 *
 * Flujo previsto:
 *
 * Open-Meteo
 *      ↓
 * OpenMeteoForecastResponse
 *      ↓
 * weatherService.ts
 *      ↓
 * WeatherData
 *      ↓
 * Sidebar / WeatherModal
 *
 * Este archivo NO:
 * - realiza peticiones HTTP;
 * - contiene lógica de React;
 * - transforma respuestas de Open-Meteo;
 * - controla la apertura del modal;
 * - contiene estilos visuales.
 *
 * =========================================
 */


/**
 * =========================================
 * Coordenadas
 * =========================================
 */

/**
 * Coordenadas geográficas utilizadas para consultar información
 * meteorológica de una finca, field o zona.
 *
 * Open-Meteo recibe las coordenadas en grados decimales.
 */
export interface WeatherCoordinates {
  readonly latitude: number;
  readonly longitude: number;
}


/**
 * =========================================
 * Fuente meteorológica
 * =========================================
 */

/**
 * Fuente externa utilizada para obtener los datos meteorológicos.
 *
 * Mantener la fuente tipada permite que AgroVision pueda incorporar
 * otra fuente en el futuro sin cambiar el significado de WeatherData.
 */
export type WeatherSource = "OPEN_METEO";


/**
 * =========================================
 * Códigos meteorológicos
 * =========================================
 */

/**
 * Códigos meteorológicos utilizados por Open-Meteo siguiendo
 * la clasificación WMO.
 *
 * El servicio meteorológico será responsable de convertir estos
 * códigos en una condición entendible por la interfaz.
 */
export type OpenMeteoWeatherCode =
  | 0
  | 1
  | 2
  | 3
  | 45
  | 48
  | 51
  | 53
  | 55
  | 56
  | 57
  | 61
  | 63
  | 65
  | 66
  | 67
  | 71
  | 73
  | 75
  | 77
  | 80
  | 81
  | 82
  | 85
  | 86
  | 95
  | 96
  | 99;


/**
 * =========================================
 * Condición meteorológica normalizada
 * =========================================
 */

/**
 * Categorías internas utilizadas por AgroVision.
 *
 * Estos valores son independientes del proveedor externo.
 * De esta manera la interfaz no necesita conocer directamente
 * los códigos numéricos enviados por Open-Meteo.
 */
export type WeatherConditionKey =
  | "CLEAR"
  | "MAINLY_CLEAR"
  | "PARTLY_CLOUDY"
  | "OVERCAST"
  | "FOG"
  | "DRIZZLE"
  | "FREEZING_DRIZZLE"
  | "RAIN"
  | "FREEZING_RAIN"
  | "SNOW"
  | "SNOW_GRAINS"
  | "RAIN_SHOWERS"
  | "SNOW_SHOWERS"
  | "THUNDERSTORM"
  | "THUNDERSTORM_HAIL"
  | "UNKNOWN";


/**
 * Condición meteorológica preparada para ser mostrada
 * directamente por la interfaz.
 */
export interface WeatherCondition {
  /**
   * Clave técnica estable utilizada dentro de AgroVision.
   */
  readonly key: WeatherConditionKey;

  /**
   * Texto amigable para presentar al usuario.
   *
   * Ejemplos:
   * - "Despejado"
   * - "Parcialmente nublado"
   * - "Lluvia moderada"
   * - "Tormenta eléctrica"
   */
  readonly label: string;

  /**
   * Código meteorológico original recibido desde Open-Meteo.
   *
   * Se conserva para trazabilidad y futuras decisiones visuales.
   */
  readonly code: OpenMeteoWeatherCode;
}


/**
 * =========================================
 * Ubicación meteorológica
 * =========================================
 */

/**
 * Información de ubicación asociada con los datos meteorológicos.
 *
 * locationName será definido por AgroVision según el contexto
 * desde el cual se realice la consulta.
 *
 * Ejemplo:
 * "Finca 001"
 * "Zona A"
 * "Lote Norte"
 */
export interface WeatherLocation {
  readonly locationName: string;

  /**
   * Texto geográfico secundario.
   *
   * Ejemplo:
   * "Chinandega, Nicaragua"
   */
  readonly locationDescription: string;

  readonly coordinates: WeatherCoordinates;

  /**
   * Zona horaria devuelta por el proveedor.
   *
   * Ejemplo:
   * "America/Managua"
   */
  readonly timezone: string;
}


/**
 * =========================================
 * Clima actual
 * =========================================
 */

/**
 * Datos meteorológicos actuales normalizados para AgroVision.
 *
 * Todos los nombres utilizan unidades explícitas para evitar
 * ambigüedad al consumirlos desde los componentes.
 */
export interface CurrentWeather {
  /**
   * Temperatura actual del aire en grados Celsius.
   */
  readonly temperatureCelsius: number;

  /**
   * Temperatura percibida por una persona considerando
   * otras condiciones ambientales.
   */
  readonly apparentTemperatureCelsius: number;

  /**
   * Humedad relativa del aire en porcentaje.
   *
   * Rango esperado:
   * 0 - 100
   */
  readonly relativeHumidityPercentage: number;

  /**
   * Velocidad actual del viento en kilómetros por hora.
   */
  readonly windSpeedKmh: number;

  /**
   * Dirección del viento expresada en grados.
   *
   * 0 / 360 = norte
   * 90 = este
   * 180 = sur
   * 270 = oeste
   */
  readonly windDirectionDegrees: number;

  /**
   * Velocidad de las ráfagas de viento en kilómetros por hora.
   */
  readonly windGustsKmh: number;

  /**
   * Precipitación registrada para el periodo actual,
   * expresada en milímetros.
   */
  readonly precipitationMm: number;

  /**
   * Porcentaje de cobertura nubosa.
   *
   * Rango esperado:
   * 0 - 100
   */
  readonly cloudCoverPercentage: number;

  /**
   * Presión atmosférica reducida al nivel del mar,
   * expresada en hectopascales.
   */
  readonly pressureMslHpa: number;

  /**
   * Condición meteorológica ya traducida al lenguaje
   * interno de AgroVision.
   */
  readonly condition: WeatherCondition;

  /**
   * Indica si la observación corresponde al periodo diurno.
   */
  readonly isDay: boolean;

  /**
   * Fecha y hora correspondientes a la observación.
   */
  readonly observedAt: string;

  /**
     * Índice UV correspondiente al periodo actual.
     *
     * 0 - 2   Bajo
     * 3 - 5   Moderado
     * 6 - 7   Alto
     * 8 - 10  Muy alto
     * 11+     Extremo
     */
    readonly uvIndex: number;
}

/**
 * =========================================
 * Astronomía
 * =========================================
 *
 * Información solar correspondiente al día actual de la ubicación consultada.
 */
export interface WeatherAstronomy {
  /**
   * Hora local de salida del sol.
   *
   * Ejemplo:
   * 2026-10-07T05:38
   */
  readonly sunrise: string;

  /**
   * Hora local de puesta del sol.
   *
   * Ejemplo:
   * 2026-10-07T17:32
   */
  readonly sunset: string;
}


/**
 * =========================================
 * Pronóstico diario
 * =========================================
 */

/**
 * Pronóstico meteorológico correspondiente a un día.
 *
 * El modal utilizará una colección de estos elementos para
 * presentar los próximos días sin depender directamente
 * de la estructura de Open-Meteo.
 */
export interface DailyWeatherForecast {
  /**
   * Fecha del pronóstico.
   *
   * Formato esperado:
   * YYYY-MM-DD
   */
  readonly date: string;

  /**
   * Condición predominante esperada para el día.
   */
  readonly condition: WeatherCondition;

  /**
   * Temperatura máxima pronosticada.
   */
  readonly temperatureMaxCelsius: number;

  /**
   * Temperatura mínima pronosticada.
   */
  readonly temperatureMinCelsius: number;

  /**
   * Probabilidad máxima de precipitación durante el día.
   *
   * Rango esperado:
   * 0 - 100
   */
  readonly precipitationProbabilityMaxPercentage: number;

  /**
   * Precipitación acumulada pronosticada para el día.
   */
  readonly precipitationSumMm: number;

  /**
   * Velocidad máxima del viento pronosticada.
   */
  readonly windSpeedMaxKmh: number;

  /**
   * Ráfaga máxima de viento pronosticada.
   */
  readonly windGustsMaxKmh: number;
}

/**
 * Datos horarios utilizados internamente
 * para resolver el UV actual.
 */
export interface OpenMeteoHourlyWeatherResponse {
  readonly time: readonly string[];
  readonly uv_index: readonly number[];
}


/**
 * =========================================
 * Respuesta normalizada de AgroVision
 * =========================================
 */

/**
 * Contrato final del módulo meteorológico.
 *
 * Esta es la estructura que deben consumir Sidebar y WeatherModal.
 *
 * La interfaz NO debe depender de OpenMeteoForecastResponse.
 */
export interface WeatherData {
  readonly source: WeatherSource;

  readonly location: WeatherLocation;

  readonly current: CurrentWeather;

  readonly forecast: readonly DailyWeatherForecast[];

  /**
   * Momento en el que AgroVision completó la consulta
   * y normalizó la respuesta.
   */
  readonly fetchedAt: string;

  readonly astronomy: WeatherAstronomy;
}


/**
 * =========================================
 * Estado de consulta
 * =========================================
 */

/**
 * Estados posibles de una consulta meteorológica desde la interfaz.
 */
export type WeatherRequestStatus =
  | "IDLE"
  | "LOADING"
  | "SUCCESS"
  | "ERROR";


/**
 * Información de error que puede ser presentada por WeatherModal
 * o utilizada por el Sidebar para mostrar un estado alternativo.
 */
export interface WeatherError {
  /**
   * Código interno estable.
   *
   * Ejemplos futuros:
   * "NETWORK_ERROR"
   * "INVALID_RESPONSE"
   * "REQUEST_FAILED"
   */
  readonly code: string;

  /**
   * Mensaje entendible por el usuario.
   */
  readonly message: string;
}


/**
 * Estado completo que puede utilizar un componente consumidor
 * mientras solicita datos meteorológicos.
 */
export interface WeatherRequestState {
  readonly status: WeatherRequestStatus;

  readonly data: WeatherData | null;

  readonly error: WeatherError | null;
}


/**
 * =========================================
 * Contrato externo — Open-Meteo
 * =========================================
 *
 * Las siguientes interfaces representan solamente los campos
 * de Open-Meteo que AgroVision necesita.
 *
 * No deben ser utilizadas directamente por los componentes.
 *
 * weatherService.ts será responsable de recibir estas estructuras
 * y convertirlas a WeatherData.
 * =========================================
 */


/**
 * Datos actuales recibidos desde Open-Meteo.
 *
 * Conservamos aquí los nombres originales del proveedor para que
 * la frontera entre API externa y modelo interno sea explícita.
 */
export interface OpenMeteoCurrentWeatherResponse {
  readonly time: string;

  readonly temperature_2m: number;

  readonly relative_humidity_2m: number;

  readonly apparent_temperature: number;

  readonly precipitation: number;

  readonly weather_code: number;

  readonly cloud_cover: number;

  readonly pressure_msl: number;

  readonly wind_speed_10m: number;

  readonly wind_direction_10m: number;

  readonly wind_gusts_10m: number;

  readonly is_day: 0 | 1;
}


/**
 * Pronóstico diario recibido desde Open-Meteo.
 *
 * Cada posición de los arrays pertenece al mismo día.
 *
 * Ejemplo:
 *
 * time[0]
 * weather_code[0]
 * temperature_2m_max[0]
 *
 * representan todos el primer día del pronóstico.
 */
export interface OpenMeteoDailyWeatherResponse {
  readonly time: readonly string[];

  readonly weather_code: readonly number[];

  readonly temperature_2m_max: readonly number[];

  readonly temperature_2m_min: readonly number[];

  readonly precipitation_probability_max: readonly number[];

  readonly precipitation_sum: readonly number[];

  readonly wind_speed_10m_max: readonly number[];

  readonly wind_gusts_10m_max: readonly number[];

  readonly sunrise: readonly string[];

  readonly sunset: readonly string[];
}


/**
 * Respuesta meteorológica externa recibida desde Open-Meteo.
 *
 * Este contrato pertenece únicamente a la frontera del servicio.
 */
export interface OpenMeteoForecastResponse {
  readonly latitude: number;

  readonly longitude: number;

  readonly generationtime_ms: number;

  readonly utc_offset_seconds: number;

  readonly timezone: string;

  readonly timezone_abbreviation: string;

  readonly elevation: number;

  readonly current: OpenMeteoCurrentWeatherResponse;

  readonly daily: OpenMeteoDailyWeatherResponse;

  readonly hourly: OpenMeteoHourlyWeatherResponse;
}


/**
 * =========================================
 * Parámetros internos del servicio
 * =========================================
 */

/**
 * Información necesaria para solicitar el clima de una ubicación.
 *
 * El servicio no necesita conocer una finca completa ni una
 * geometría GeoJSON. Solo recibe una ubicación ya resuelta
 * y sus coordenadas.
 */
export interface WeatherQuery {
  readonly coordinates: WeatherCoordinates;

  /**
   * Nombre que aparecerá en la interfaz.
   *
   * Ejemplo:
   * "Finca 001"
   */
  readonly locationName: string;

  /**
   * Descripción geográfica complementaria.
   *
   * Ejemplo:
   * "Chinandega, Nicaragua"
   */
  readonly locationDescription: string;
}



/**
 * =========================================
 * DOCUMENTACIÓN DEL CONTRATO
 * =========================================
 *
 * Separación de responsabilidades:
 *
 * OpenMeteoForecastResponse
 * representa exclusivamente la estructura recibida desde
 * el proveedor meteorológico.
 *
 * WeatherData
 * representa exclusivamente la estructura estable utilizada
 * dentro de AgroVision.
 *
 * WeatherCondition
 * evita que los componentes conozcan directamente los códigos WMO.
 *
 * WeatherCoordinates
 * permite consultar cualquier finca, field o zona sin acoplar
 * este módulo directamente al GIS.
 *
 * WeatherQuery
 * será el contrato de entrada de weatherService.ts.
 *
 * WeatherRequestState
 * permite que los componentes representen correctamente:
 * - estado inicial;
 * - carga;
 * - datos disponibles;
 * - error.
 *
 * Esta separación permitirá posteriormente reutilizar el clima real
 * tanto en el Sidebar como en Mapping, Dashboard, Alertas o análisis
 * prescriptivo sin duplicar contratos.
 *
 * =========================================
 */


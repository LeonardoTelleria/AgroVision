// Servicio para consultar posteriormente Open-Meteo y transformar sus respuestas a los contratos internos de AgroVision.
/**
 * =========================================
 * Weather Service
 * =========================================
 *
 * Servicio meteorológico de AgroVision.
 *
 * Responsabilidad:
 * - recibir una ubicación y sus coordenadas;
 * - construir la consulta hacia Open-Meteo;
 * - solicitar condiciones meteorológicas reales;
 * - validar la respuesta externa;
 * - traducir códigos meteorológicos WMO;
 * - normalizar la información al contrato interno WeatherData;
 * - diferenciar errores de red, HTTP, datos inválidos y cancelaciones.
 *
 * Flujo:
 *
 * Sidebar / WeatherModal
 *          ↓
 *     WeatherQuery
 *          ↓
 *   getWeather(...)
 *          ↓
 *      Open-Meteo
 *          ↓
 * OpenMeteoForecastResponse
 *          ↓
 *    normalización
 *          ↓
 *      WeatherData
 *
 * Este archivo NO:
 * - contiene componentes React;
 * - controla estados visuales;
 * - contiene estilos;
 * - conoce el Sidebar;
 * - conoce WeatherModal;
 * - accede directamente al GeoJSON;
 * - contiene datos meteorológicos simulados.
 *
 * =========================================
 */

import type {
  CurrentWeather,
  DailyWeatherForecast,
  OpenMeteoCurrentWeatherResponse,
  OpenMeteoDailyWeatherResponse,
  OpenMeteoForecastResponse,
  OpenMeteoWeatherCode,
  WeatherCondition,
  WeatherConditionKey,
  WeatherData,
  WeatherQuery,
  OpenMeteoHourlyWeatherResponse,
  WeatherAstronomy,
} from "../types/weather.types";


/**
 * =========================================
 * Configuración de Open-Meteo
 * =========================================
 */

/**
 * Endpoint oficial utilizado para condiciones actuales
 * y pronóstico meteorológico.
 */
const OPEN_METEO_FORECAST_URL =
  "https://api.open-meteo.com/v1/forecast";


/**
 * Cantidad de días solicitados para el pronóstico.
 *
 * Siete días proporcionan suficiente información para
 * el modal sin solicitar datos innecesarios.
 */
const WEATHER_FORECAST_DAYS = 7;


/**
 * Variables meteorológicas actuales necesarias
 * para la interfaz de AgroVision.
 */
const CURRENT_VARIABLES = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "precipitation",
  "weather_code",
  "cloud_cover",
  "pressure_msl",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "is_day",
] as const;

/**
 * Variables horarias necesarias.
 *
 * Open-Meteo no entrega UV dentro de current,
 * por lo que utilizamos la serie horaria para
 * encontrar el UV correspondiente a la hora actual.
 */
const HOURLY_VARIABLES = [
  'uv_index',
] as const;

/**
 * Variables solicitadas para cada día del pronóstico.
 */
const DAILY_VARIABLES = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_probability_max",
  "precipitation_sum",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  'sunrise',
  'sunset',
] as const;


/**
 * =========================================
 * Errores del servicio
 * =========================================
 */

/**
 * Errores técnicos que puede producir weatherService.
 *
 * Mantener códigos internos permite que la interfaz decida
 * posteriormente qué mensaje o estado visual presentar.
 */
export type WeatherServiceErrorCode =
  | "INVALID_COORDINATES"
  | "INVALID_QUERY"
  | "REQUEST_ABORTED"
  | "NETWORK_ERROR"
  | "HTTP_ERROR"
  | "INVALID_RESPONSE";


/**
 * Error especializado utilizado por el módulo meteorológico.
 *
 * El componente consumidor puede comprobar:
 *
 * error instanceof WeatherServiceError
 *
 * y utilizar `error.code` para distinguir el problema.
 */
export class WeatherServiceError extends Error {
  readonly code: WeatherServiceErrorCode;

  readonly httpStatus: number | null;

  constructor(
    code: WeatherServiceErrorCode,
    message: string,
    httpStatus: number | null = null,
  ) {
    super(message);

    this.name = "WeatherServiceError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}


/**
 * =========================================
 * Códigos WMO admitidos
 * =========================================
 */

/**
 * Catálogo de códigos que Open-Meteo puede devolver
 * mediante la variable weather_code.
 *
 * Se utiliza también para validar datos externos antes
 * de incorporarlos al estado de AgroVision.
 */
const OPEN_METEO_WEATHER_CODES = new Set<number>([
  0,
  1,
  2,
  3,
  45,
  48,
  51,
  53,
  55,
  56,
  57,
  61,
  63,
  65,
  66,
  67,
  71,
  73,
  75,
  77,
  80,
  81,
  82,
  85,
  86,
  95,
  96,
  99,
]);


/**
 * =========================================
 * Utilidades básicas de validación
 * =========================================
 */

/**
 * Comprueba que un valor sea un objeto no nulo.
 *
 * Nos permite validar la respuesta HTTP sin confiar
 * directamente en un cast de TypeScript.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}


/**
 * Comprueba que el valor sea un número válido y finito.
 */
function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}


/**
 * Comprueba que el valor sea una cadena.
 */
function isString(value: unknown): value is string {
  return typeof value === "string";
}


/**
 * Comprueba un array formado únicamente por números válidos.
 */
function isNumberArray(value: unknown): value is readonly number[] {
  return (
    Array.isArray(value) &&
    value.every((item) => isFiniteNumber(item))
  );
}


/**
 * Comprueba un array formado únicamente por cadenas.
 */
function isStringArray(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => isString(item))
  );
}


/**
 * =========================================
 * Validación de coordenadas
 * =========================================
 */

/**
 * Comprueba las coordenadas recibidas antes de enviar
 * una solicitud al proveedor meteorológico.
 *
 * Latitud válida:
 * -90 ... 90
 *
 * Longitud válida:
 * -180 ... 180
 */
function validateCoordinates(query: WeatherQuery): void {
  const { latitude, longitude } = query.coordinates;

  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new WeatherServiceError(
      "INVALID_COORDINATES",
      "Las coordenadas proporcionadas para consultar el clima no son válidas.",
    );
  }
}


/**
 * Comprueba además la información descriptiva necesaria
 * para construir WeatherData.
 */
function validateWeatherQuery(query: WeatherQuery): void {
  validateCoordinates(query);

  if (!query.locationName.trim()) {
    throw new WeatherServiceError(
      "INVALID_QUERY",
      "La ubicación meteorológica necesita un nombre válido.",
    );
  }

  if (!query.locationDescription.trim()) {
    throw new WeatherServiceError(
      "INVALID_QUERY",
      "La ubicación meteorológica necesita una descripción válida.",
    );
  }
}


/**
 * =========================================
 * Construcción de la URL
 * =========================================
 */

/**
 * Construye la URL completa de Open-Meteo.
 *
 * URLSearchParams se encarga de codificar correctamente
 * todos los parámetros y evita concatenaciones manuales.
 */
function buildWeatherRequestUrl(query: WeatherQuery): string {
  const params = new URLSearchParams({
    latitude: String(query.coordinates.latitude),
    longitude: String(query.coordinates.longitude),

    current: CURRENT_VARIABLES.join(","),
    hourly: HOURLY_VARIABLES.join(','),
    daily: DAILY_VARIABLES.join(","),

    /**
     * Solicitamos explícitamente las unidades utilizadas
     * internamente por AgroVision.
     */
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",

    /**
     * Open-Meteo resolverá la zona horaria apropiada
     * para las coordenadas solicitadas.
     */
    timezone: "auto",

    forecast_days: String(WEATHER_FORECAST_DAYS),
  });

  return `${OPEN_METEO_FORECAST_URL}?${params.toString()}`;
}


/**
 * =========================================
 * Validación de clima actual
 * =========================================
 */

/**
 * =========================================
 * Validación horaria
 * =========================================
 */

function isOpenMeteoHourlyWeatherResponse(
  value: unknown,
): value is OpenMeteoHourlyWeatherResponse {
  if (!isRecord(value)) {
    return false;
  }

  if (
    !isStringArray(value.time) ||
    !isNumberArray(value.uv_index)
  ) {
    return false;
  }

  return (
    value.time.length > 0 &&
    value.time.length ===
      value.uv_index.length
  );
}

/**
 * Comprueba solamente los campos externos que AgroVision
 * ha solicitado a Open-Meteo.
 */
function isOpenMeteoCurrentWeatherResponse(
  value: unknown,
): value is OpenMeteoCurrentWeatherResponse {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.time) &&
    isFiniteNumber(value.temperature_2m) &&
    isFiniteNumber(value.relative_humidity_2m) &&
    isFiniteNumber(value.apparent_temperature) &&
    isFiniteNumber(value.precipitation) &&
    isFiniteNumber(value.weather_code) &&
    isFiniteNumber(value.cloud_cover) &&
    isFiniteNumber(value.pressure_msl) &&
    isFiniteNumber(value.wind_speed_10m) &&
    isFiniteNumber(value.wind_direction_10m) &&
    isFiniteNumber(value.wind_gusts_10m) &&
    (value.is_day === 0 || value.is_day === 1)
  );
}


/**
 * =========================================
 * Validación del pronóstico
 * =========================================
 */

/**
 * Comprueba la estructura de los arrays diarios.
 */
function isOpenMeteoDailyWeatherResponse(
  value: unknown,
): value is OpenMeteoDailyWeatherResponse {
  if (!isRecord(value)) {
    return false;
  }

  if (
    !isStringArray(value.time) ||
    !isNumberArray(value.weather_code) ||
    !isNumberArray(value.temperature_2m_max) ||
    !isNumberArray(value.temperature_2m_min) ||
    !isNumberArray(value.precipitation_probability_max) ||
    !isNumberArray(value.precipitation_sum) ||
    !isNumberArray(value.wind_speed_10m_max) ||
    !isNumberArray(value.wind_gusts_10m_max) ||
    !isStringArray(value.sunrise) ||
    !isStringArray(value.sunset)
  ) {
    return false;
  }

  /**
   * Todos los arrays diarios deben representar la misma
   * cantidad de días.
   */
  const expectedLength = value.time.length;

  if (expectedLength === 0) {
    return false;
  }

  return (
    value.weather_code.length === expectedLength &&
    value.temperature_2m_max.length === expectedLength &&
    value.temperature_2m_min.length === expectedLength &&
    value.precipitation_probability_max.length === expectedLength &&
    value.precipitation_sum.length === expectedLength &&
    value.wind_speed_10m_max.length === expectedLength &&
    value.wind_gusts_10m_max.length === expectedLength &&
    value.sunrise.length === expectedLength &&
    value.sunset.length === expectedLength
  );
}


/**
 * =========================================
 * Validación de la respuesta completa
 * =========================================
 */

/**
 * Type guard de la respuesta externa.
 *
 * No confiamos automáticamente en response.json().
 * Todo dato procedente de una API externa debe cruzar
 * esta frontera antes de entrar a AgroVision.
 */
function isOpenMeteoForecastResponse(
  value: unknown,
): value is OpenMeteoForecastResponse {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isFiniteNumber(value.latitude) &&
    isFiniteNumber(value.longitude) &&
    isFiniteNumber(value.generationtime_ms) &&
    isFiniteNumber(value.utc_offset_seconds) &&
    isString(value.timezone) &&
    isString(value.timezone_abbreviation) &&
    isFiniteNumber(value.elevation) &&
    isOpenMeteoCurrentWeatherResponse(value.current) &&
    isOpenMeteoHourlyWeatherResponse(value.hourly) &&
    isOpenMeteoDailyWeatherResponse(value.daily)
  );
}


/**
 * =========================================
 * Validación de códigos meteorológicos
 * =========================================
 */

/**
 * Comprueba que un número pertenezca al catálogo WMO
 * que hemos definido en weather.types.ts.
 */
function isOpenMeteoWeatherCode(
  code: number,
): code is OpenMeteoWeatherCode {
  return OPEN_METEO_WEATHER_CODES.has(code);
}


/**
 * =========================================
 * Traducción de condiciones meteorológicas
 * =========================================
 */

/**
 * Crea una condición interna reutilizable.
 */
function createWeatherCondition(
  code: OpenMeteoWeatherCode,
  key: WeatherConditionKey,
  label: string,
): WeatherCondition {
  return {
    code,
    key,
    label,
  };
}


/**
 * Traduce un código meteorológico WMO recibido desde
 * Open-Meteo a una condición comprensible por AgroVision.
 *
 * Los componentes React nunca tendrán que interpretar
 * directamente los códigos numéricos.
 */
function normalizeWeatherCondition(
  rawCode: number,
): WeatherCondition {
  if (!isOpenMeteoWeatherCode(rawCode)) {
    throw new WeatherServiceError(
      "INVALID_RESPONSE",
      `Open-Meteo devolvió un código meteorológico no reconocido: ${rawCode}.`,
    );
  }

  switch (rawCode) {
    case 0:
      return createWeatherCondition(
        rawCode,
        "CLEAR",
        "Despejado",
      );

    case 1:
      return createWeatherCondition(
        rawCode,
        "MAINLY_CLEAR",
        "Mayormente despejado",
      );

    case 2:
      return createWeatherCondition(
        rawCode,
        "PARTLY_CLOUDY",
        "Parcialmente nublado",
      );

    case 3:
      return createWeatherCondition(
        rawCode,
        "OVERCAST",
        "Nublado",
      );

    case 45:
      return createWeatherCondition(
        rawCode,
        "FOG",
        "Niebla",
      );

    case 48:
      return createWeatherCondition(
        rawCode,
        "FOG",
        "Niebla con escarcha",
      );

    case 51:
      return createWeatherCondition(
        rawCode,
        "DRIZZLE",
        "Llovizna ligera",
      );

    case 53:
      return createWeatherCondition(
        rawCode,
        "DRIZZLE",
        "Llovizna moderada",
      );

    case 55:
      return createWeatherCondition(
        rawCode,
        "DRIZZLE",
        "Llovizna intensa",
      );

    case 56:
      return createWeatherCondition(
        rawCode,
        "FREEZING_DRIZZLE",
        "Llovizna helada ligera",
      );

    case 57:
      return createWeatherCondition(
        rawCode,
        "FREEZING_DRIZZLE",
        "Llovizna helada intensa",
      );

    case 61:
      return createWeatherCondition(
        rawCode,
        "RAIN",
        "Lluvia ligera",
      );

    case 63:
      return createWeatherCondition(
        rawCode,
        "RAIN",
        "Lluvia moderada",
      );

    case 65:
      return createWeatherCondition(
        rawCode,
        "RAIN",
        "Lluvia intensa",
      );

    case 66:
      return createWeatherCondition(
        rawCode,
        "FREEZING_RAIN",
        "Lluvia helada ligera",
      );

    case 67:
      return createWeatherCondition(
        rawCode,
        "FREEZING_RAIN",
        "Lluvia helada intensa",
      );

    case 71:
      return createWeatherCondition(
        rawCode,
        "SNOW",
        "Nevada ligera",
      );

    case 73:
      return createWeatherCondition(
        rawCode,
        "SNOW",
        "Nevada moderada",
      );

    case 75:
      return createWeatherCondition(
        rawCode,
        "SNOW",
        "Nevada intensa",
      );

    case 77:
      return createWeatherCondition(
        rawCode,
        "SNOW_GRAINS",
        "Granos de nieve",
      );

    case 80:
      return createWeatherCondition(
        rawCode,
        "RAIN_SHOWERS",
        "Chubascos ligeros",
      );

    case 81:
      return createWeatherCondition(
        rawCode,
        "RAIN_SHOWERS",
        "Chubascos moderados",
      );

    case 82:
      return createWeatherCondition(
        rawCode,
        "RAIN_SHOWERS",
        "Chubascos intensos",
      );

    case 85:
      return createWeatherCondition(
        rawCode,
        "SNOW_SHOWERS",
        "Chubascos de nieve ligeros",
      );

    case 86:
      return createWeatherCondition(
        rawCode,
        "SNOW_SHOWERS",
        "Chubascos de nieve intensos",
      );

    case 95:
      return createWeatherCondition(
        rawCode,
        "THUNDERSTORM",
        "Tormenta eléctrica",
      );

    case 96:
      return createWeatherCondition(
        rawCode,
        "THUNDERSTORM_HAIL",
        "Tormenta con granizo ligero",
      );

    case 99:
      return createWeatherCondition(
        rawCode,
        "THUNDERSTORM_HAIL",
        "Tormenta con granizo intenso",
      );
  }
}


/**
 * =========================================
 * Normalización numérica
 * =========================================
 */

/**
 * Redondea un valor manteniendo una cantidad determinada
 * de posiciones decimales.
 *
 * Evitamos enviar a la interfaz números con una precisión
 * innecesariamente grande.
 */
function roundValue(
  value: number,
  decimalPlaces = 1,
): number {
  const factor = 10 ** decimalPlaces;

  return Math.round(value * factor) / factor;
}


/**
 * =========================================
 * Normalización del clima actual
 * =========================================
 */
/**
 * =========================================
 * UV actual
 * =========================================
 *
 * Open-Meteo proporciona UV mediante hourly.
 *
 * Buscamos la entrada que corresponde a la misma
 * hora que current.time.
 *
 * Ejemplo:
 *
 * current.time
 * 2026-10-07T20:15
 *
 * hourly.time
 * 2026-10-07T20:00
 *
 * Ambos pertenecen a la hora 20.
 */
function getCurrentUvIndex(
  currentTime: string,
  hourly: OpenMeteoHourlyWeatherResponse,
): number {
  /**
   * YYYY-MM-DDTHH
   */
  const currentHour =
    currentTime.slice(0, 13);

  const index =
    hourly.time.findIndex(
      (time) =>
        time.slice(0, 13) ===
        currentHour,
    );


  /**
   * Si por alguna razón no encontramos
   * exactamente la hora, utilizamos el
   * primer dato disponible como fallback.
   */
  if (index === -1) {
    return roundValue(
      hourly.uv_index[0] ?? 0,
      1,
    );
  }


  return roundValue(
    hourly.uv_index[index] ?? 0,
    1,
  );
}

/**
 * Transforma el bloque `current` de Open-Meteo
 * al contrato CurrentWeather de AgroVision.
 */
function normalizeCurrentWeather(
  current: OpenMeteoCurrentWeatherResponse,
  hourly: OpenMeteoHourlyWeatherResponse,
): CurrentWeather {
  return {
    temperatureCelsius: roundValue(
      current.temperature_2m,
    ),

    apparentTemperatureCelsius: roundValue(
      current.apparent_temperature,
    ),

    relativeHumidityPercentage: Math.round(
      current.relative_humidity_2m,
    ),

    windSpeedKmh: roundValue(
      current.wind_speed_10m,
    ),

    windDirectionDegrees: Math.round(
      current.wind_direction_10m,
    ),

    windGustsKmh: roundValue(
      current.wind_gusts_10m,
    ),

    precipitationMm: roundValue(
      current.precipitation,
    ),

    cloudCoverPercentage: Math.round(
      current.cloud_cover,
    ),

    pressureMslHpa: roundValue(
      current.pressure_msl,
    ),

    uvIndex: getCurrentUvIndex(
    current.time,
    hourly,
    ),

    condition: normalizeWeatherCondition(
      current.weather_code,
    ),

    isDay: current.is_day === 1,

    observedAt: current.time,
  };
}


/**
 * =========================================
 * Normalización del pronóstico diario
 * =========================================
 */

/**
 * Convierte los arrays paralelos de Open-Meteo en objetos
 * independientes, mucho más seguros y sencillos de consumir
 * desde React.
 *
 * Open-Meteo:
 *
 * time[0]
 * weather_code[0]
 * temperature_2m_max[0]
 *
 *              ↓
 *
 * {
 *   date,
 *   condition,
 *   temperatureMaxCelsius,
 *   ...
 * }
 */
function normalizeDailyForecast(
  daily: OpenMeteoDailyWeatherResponse,
): readonly DailyWeatherForecast[] {
  return daily.time.map((date, index) => ({
    date,

    condition: normalizeWeatherCondition(
      daily.weather_code[index],
    ),

    temperatureMaxCelsius: roundValue(
      daily.temperature_2m_max[index],
    ),

    temperatureMinCelsius: roundValue(
      daily.temperature_2m_min[index],
    ),

    precipitationProbabilityMaxPercentage: Math.round(
      daily.precipitation_probability_max[index],
    ),

    precipitationSumMm: roundValue(
      daily.precipitation_sum[index],
    ),

    windSpeedMaxKmh: roundValue(
      daily.wind_speed_10m_max[index],
    ),

    windGustsMaxKmh: roundValue(
      daily.wind_gusts_10m_max[index],
    ),
  }));
}


/**
 * =========================================
 * Normalización de la respuesta final
 * =========================================
 */

/**
 * =========================================
 * Astronomía
 * =========================================
 *
 * Open-Meteo devuelve sunrise y sunset dentro
 * del bloque daily.
 *
 * Para el panel utilizamos el primer día,
 * correspondiente al día actual.
 */
function normalizeAstronomy(
  daily: OpenMeteoDailyWeatherResponse,
): WeatherAstronomy {
  return {
    sunrise:
      daily.sunrise[0],

    sunset:
      daily.sunset[0],
  };
}

/**
 * Convierte la respuesta completa del proveedor externo
 * a WeatherData.
 *
 * A partir de este punto, ningún consumidor necesita conocer
 * la estructura original de Open-Meteo.
 */
function normalizeWeatherData(
  response: OpenMeteoForecastResponse,
  query: WeatherQuery,
): WeatherData {
  return {
    source: "OPEN_METEO",

    location: {
      locationName: query.locationName,
      locationDescription: query.locationDescription,

      /**
       * Conservamos las coordenadas solicitadas por AgroVision.
       *
       * Open-Meteo puede resolver internamente sus modelos
       * meteorológicos a una celda cercana, pero la ubicación
       * lógica continúa siendo la finca o zona seleccionada.
       */
      coordinates: {
        latitude: query.coordinates.latitude,
        longitude: query.coordinates.longitude,
      },

      timezone: response.timezone,
    },

    current: normalizeCurrentWeather(
      response.current,
      response.hourly
    ),

    astronomy: normalizeAstronomy(
        response.daily,
    ),

    forecast: normalizeDailyForecast(
      response.daily,
    ),

    fetchedAt: new Date().toISOString(),
  };
}


/**
 * =========================================
 * Identificación de cancelaciones
 * =========================================
 */

/**
 * fetch produce normalmente un error llamado AbortError
 * cuando AbortController cancela la solicitud.
 */
function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.name === "AbortError"
  );
}


/**
 * =========================================
 * Servicio público
 * =========================================
 */

/**
 * Obtiene información meteorológica real para una ubicación.
 *
 * @param query
 * Nombre, descripción y coordenadas que representan
 * la ubicación dentro de AgroVision.
 *
 * @param signal
 * AbortSignal opcional para permitir que React cancele una
 * solicitud si el componente se desmonta o cambia de ubicación.
 *
 * @returns
 * WeatherData completamente normalizado.
 *
 * Ejemplo futuro:
 *
 * const weather = await getWeather({
 *   locationName: "Finca 001",
 *   locationDescription: "Chinandega, Nicaragua",
 *   coordinates: {
 *     latitude: 12.626,
 *     longitude: -87.126,
 *   },
 * });
 */
export async function getWeather(
  query: WeatherQuery,
  signal?: AbortSignal,
): Promise<WeatherData> {
  /**
   * Validamos antes de consumir red para evitar solicitudes
   * inválidas o difíciles de diagnosticar.
   */
  validateWeatherQuery(query);

  const requestUrl = buildWeatherRequestUrl(query);

  try {
    const response = await fetch(requestUrl, {
      method: "GET",
      signal,
      headers: {
        Accept: "application/json",
      },
    });

    /**
     * fetch solamente rechaza automáticamente problemas de red.
     *
     * Respuestas HTTP 4xx/5xx deben comprobarse manualmente.
     */
    if (!response.ok) {
      throw new WeatherServiceError(
        "HTTP_ERROR",
        `No fue posible obtener la información meteorológica. Open-Meteo respondió con HTTP ${response.status}.`,
        response.status,
      );
    }

    /**
     * JSON procedente de internet se recibe como unknown.
     *
     * No realizamos:
     *
     * const data = await response.json() as OpenMeteoForecastResponse;
     *
     * porque eso confiaría ciegamente en una API externa.
     */
    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      throw new WeatherServiceError(
        "INVALID_RESPONSE",
        "El servicio meteorológico devolvió una respuesta que no pudo interpretarse.",
      );
    }

    /**
     * Aplicamos validación en runtime antes de permitir que
     * los datos entren al dominio de AgroVision.
     */
    if (!isOpenMeteoForecastResponse(payload)) {
      throw new WeatherServiceError(
        "INVALID_RESPONSE",
        "La respuesta meteorológica recibida no contiene la estructura esperada.",
      );
    }

    /**
     * Después de esta frontera podemos trabajar de forma
     * segura con el contrato OpenMeteoForecastResponse.
     */
    return normalizeWeatherData(
      payload,
      query,
    );
  } catch (error: unknown) {
    /**
     * Conservamos errores creados explícitamente por este
     * mismo servicio.
     */
    if (error instanceof WeatherServiceError) {
      throw error;
    }

    /**
     * Una cancelación no significa que Open-Meteo haya fallado.
     *
     * Normalmente ocurre cuando React desmonta el componente
     * o cambia la ubicación antes de recibir la respuesta.
     */
    if (isAbortError(error)) {
      throw new WeatherServiceError(
        "REQUEST_ABORTED",
        "La consulta meteorológica fue cancelada.",
      );
    }

    /**
     * Cualquier otro error producido durante fetch suele
     * representar conectividad, DNS, CORS o indisponibilidad
     * temporal de red.
     */
    throw new WeatherServiceError(
      "NETWORK_ERROR",
      "No fue posible conectar con el servicio meteorológico. Verifica la conexión a internet e inténtalo nuevamente.",
    );
  }
}


/**
 * =========================================
 * Helper para la interfaz
 * =========================================
 */

/**
 * Convierte un error desconocido en un mensaje seguro para UI.
 *
 * WeatherModal podrá utilizar este helper sin necesitar conocer
 * detalles internos del servicio.
 */
export function getWeatherErrorMessage(
  error: unknown,
): string {
  if (error instanceof WeatherServiceError) {
    return error.message;
  }

  return "Ocurrió un error inesperado al consultar la información meteorológica.";
}


/**
 * =========================================
 * DOCUMENTACIÓN DEL SERVICIO
 * =========================================
 *
 * Entrada:
 *
 * WeatherQuery
 * {
 *   locationName,
 *   locationDescription,
 *   coordinates
 * }
 *
 *                ↓
 *
 * Validación de coordenadas
 *
 *                ↓
 *
 * Open-Meteo Forecast API
 *
 *                ↓
 *
 * Validación de respuesta externa
 *
 *                ↓
 *
 * Traducción de códigos WMO
 *
 *                ↓
 *
 * Normalización
 *
 *                ↓
 *
 * WeatherData
 *
 *
 * Principio importante:
 *
 * Los componentes de AgroVision nunca consumen directamente
 * la estructura de Open-Meteo.
 *
 * Esto evita que Sidebar, Mapping o WeatherModal dependan
 * de campos externos como:
 *
 * temperature_2m
 * relative_humidity_2m
 * wind_speed_10m
 *
 * En su lugar utilizan:
 *
 * temperatureCelsius
 * relativeHumidityPercentage
 * windSpeedKmh
 *
 *
 * AbortController:
 *
 * getWeather acepta opcionalmente AbortSignal. Esto será útil
 * cuando integremos el servicio con React para evitar actualizar
 * estado después de desmontar un componente.
 *
 *
 * Dependencias:
 *
 * Este servicio utiliza únicamente APIs nativas del navegador:
 *
 * - fetch
 * - URLSearchParams
 * - AbortSignal
 *
 * Por lo tanto NO requiere instalar axios ni ninguna otra
 * dependencia adicional.
 *
 * =========================================
 */
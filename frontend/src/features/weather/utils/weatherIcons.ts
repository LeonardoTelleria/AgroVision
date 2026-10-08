/**
 * =========================================
 * Weather Icons
 * =========================================
 *
 * Centraliza los SVG meteorológicos animados
 * utilizados por AgroVision.
 *
 * Los componentes NO necesitan conocer nombres
 * de archivos. Solo proporcionan:
 *
 * - condición meteorológica;
 * - día / noche.
 *
 * Open-Meteo
 *      ↓
 * WeatherConditionKey
 *      ↓
 * getWeatherIcon(...)
 *      ↓
 * SVG animado correspondiente
 * =========================================
 */

import clearDay from '../../../assets/weather/clear-day.svg';
import clearNight from '../../../assets/weather/clear-night.svg';

import cloudy from '../../../assets/weather/cloudy.svg';
import drizzle from '../../../assets/weather/drizzle.svg';

import mostlyClearDay from '../../../assets/weather/mostly-clear-day.svg';
import mostlyClearNight from '../../../assets/weather/mostly-clear-night.svg';

import mostlyClearDayDrizzle from '../../../assets/weather/mostly-clear-day-drizzle.svg';
import mostlyClearNightDrizzle from '../../../assets/weather/mostly-clear-night-drizzle.svg';

import overcast from '../../../assets/weather/overcast.svg';

import rain from '../../../assets/weather/rain.svg';

import thunderstorms from '../../../assets/weather/thunderstorms.svg';
import thunderstormsDrizzle from '../../../assets/weather/thunderstorms-drizzle.svg';

import type {
  WeatherConditionKey,
} from '../types/weather.types';


/**
 * Devuelve el SVG animado correspondiente
 * a una condición meteorológica.
 */
export function getWeatherIcon(
  condition: WeatherConditionKey,
  isDay = true,
): string {
  switch (condition) {
    /**
     * Cielo completamente despejado.
     */
    case 'CLEAR':
      return isDay
        ? clearDay
        : clearNight;


    /**
     * Mayormente despejado.
     */
    case 'MAINLY_CLEAR':
      return isDay
        ? mostlyClearDay
        : mostlyClearNight;


    /**
     * Parcialmente nublado.
     *
     * Los iconos mostly-clear son actualmente
     * la representación más cercana dentro
     * del pack descargado.
     */
    case 'PARTLY_CLOUDY':
      return isDay
        ? mostlyClearDay
        : mostlyClearNight;


    /**
     * Cielo cubierto.
     */
    case 'OVERCAST':
      return overcast;


    /**
     * Niebla.
     *
     * Todavía no tenemos un SVG específico de fog,
     * por lo que cloudy funciona como fallback visual.
     */
    case 'FOG':
      return cloudy;


    /**
     * Llovizna.
     */
    case 'DRIZZLE':
    case 'FREEZING_DRIZZLE':
      return drizzle;


    /**
     * Lluvia.
     */
    case 'RAIN':
    case 'FREEZING_RAIN':
      return rain;


    /**
     * Chubascos.
     *
     * Aquí usamos las variantes día/noche con
     * precipitación porque visualmente funcionan
     * especialmente bien para showers.
     */
    case 'RAIN_SHOWERS':
      return isDay
        ? mostlyClearDayDrizzle
        : mostlyClearNightDrizzle;


    /**
     * Tormenta eléctrica.
     */
    case 'THUNDERSTORM':
      return thunderstorms;


    /**
     * Tormenta acompañada de precipitación fuerte
     * o granizo.
     */
    case 'THUNDERSTORM_HAIL':
      return thunderstormsDrizzle;


    /**
     * Por ahora no descargaste iconos específicos
     * de nieve.
     *
     * Utilizamos overcast como fallback temporal
     * hasta añadir los SVG correspondientes.
     */
    case 'SNOW':
    case 'SNOW_GRAINS':
    case 'SNOW_SHOWERS':
      return overcast;


    /**
     * Fallback seguro.
     */
    case 'UNKNOWN':
    default:
      return cloudy;
  }
}

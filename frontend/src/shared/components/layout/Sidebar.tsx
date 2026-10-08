/**
 * =========================================
 * Sidebar
 * =========================================
 *
 * Navegación principal persistente de AgroVision.
 *
 * UX:
 * - fija a la izquierda;
 * - compacta y de alta densidad;
 * - navegación con separación visual;
 * - estado activo contenido dentro del sidebar;
 * - clima anclado y centrado en la zona inferior;
 * - tarjeta climática preparada para glass + blur;
 * - modo compacto con tooltips.
 */

import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';

import { ROUTES, type AppRoutePath } from '../../../app/AppRouter';
import agroVisionLogo from '../../../assets/logos/imagotipo-V-clara.svg';
import weatherImage from '../../../assets/images/weather-images.webp';
import fieldImage from '../../../assets/images/parcelasCampoConcept.png';

/**
 * =========================================
 * Weather
 * =========================================
 *
 * Importamos únicamente lo necesario para sustituir
 * los valores meteorológicos simulados del Sidebar
 * por información real procedente de Open-Meteo.
 */
import { agroVisionFarm } from '../../../features/mapping/data/mappingGeoData';

import { WeatherModal } from '../../../features/weather/components/WeatherModal';

import {
  getWeather,
  getWeatherErrorMessage,
  WeatherServiceError,
} from '../../../features/weather/services/weatherService';

import type {
  WeatherCoordinates,
  WeatherData,
  WeatherError,
  WeatherQuery,
  WeatherRequestStatus,
} from '../../../features/weather/types/weather.types';


interface SidebarProps {
  readonly activePath: AppRoutePath;
  readonly isCollapsed: boolean;
  readonly onNavigate: (path: AppRoutePath) => void;
  readonly onToggle: () => void;
}


/**
 * =========================================
 * Weather coordinates
 * =========================================
 *
 * Calculamos una coordenada representativa de la finca
 * utilizando el centro de los límites de su Polygon GeoJSON.
 *
 * De esta forma el Sidebar NO mantiene una latitud o longitud
 * escrita manualmente y utiliza directamente la ubicación
 * que ya existe en el módulo GIS.
 */
function getFarmWeatherCoordinates(): WeatherCoordinates {
  const ring = agroVisionFarm.geometry.coordinates[0];

  if (!ring || ring.length === 0) {
    throw new Error(
      'La finca principal no contiene coordenadas válidas para consultar el clima.',
    );
  }

  let minLongitude = Number.POSITIVE_INFINITY;
  let maxLongitude = Number.NEGATIVE_INFINITY;
  let minLatitude = Number.POSITIVE_INFINITY;
  let maxLatitude = Number.NEGATIVE_INFINITY;

  for (const coordinate of ring) {
    const longitude = coordinate[0];
    const latitude = coordinate[1];

    if (longitude < minLongitude) {
      minLongitude = longitude;
    }

    if (longitude > maxLongitude) {
      maxLongitude = longitude;
    }

    if (latitude < minLatitude) {
      minLatitude = latitude;
    }

    if (latitude > maxLatitude) {
      maxLatitude = latitude;
    }
  }

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
  };
}


/**
 * Coordenadas meteorológicas de la finca actual.
 */
const FARM_WEATHER_COORDINATES = getFarmWeatherCoordinates();


/**
 * Consulta meteorológica utilizada por el Sidebar.
 *
 * Tanto el nombre como la ubicación proceden directamente
 * de la finca existente en mappingGeoData.ts.
 */
const FARM_WEATHER_QUERY: WeatherQuery = {
  locationName: agroVisionFarm.properties.name,
  locationDescription:
    agroVisionFarm.properties.location ??
    'Ubicación no especificada',
  coordinates: FARM_WEATHER_COORDINATES,
};


/**
 * Formateador pequeño para viento y demás valores
 * visibles dentro de la tarjeta lateral.
 */
const WEATHER_NUMBER_FORMAT = new Intl.NumberFormat('es-NI', {
  maximumFractionDigits: 1,
});


function formatWeatherNumber(value: number): string {
  return WEATHER_NUMBER_FORMAT.format(value);
}


/**
 * Convierte cualquier error producido por weatherService
 * al contrato que utiliza WeatherModal.
 */
function normalizeWeatherError(error: unknown): WeatherError {
  if (error instanceof WeatherServiceError) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: getWeatherErrorMessage(error),
  };
}


export function Sidebar({
  activePath,
  isCollapsed,
  onNavigate,
  onToggle,
}: SidebarProps) {

  /**
   * =========================================
   * Weather state
   * =========================================
   */

  const [weatherStatus, setWeatherStatus] =
    useState<WeatherRequestStatus>('LOADING');

  const [weatherData, setWeatherData] =
    useState<WeatherData | null>(null);

  const [weatherError, setWeatherError] =
    useState<WeatherError | null>(null);

  const [isWeatherModalOpen, setIsWeatherModalOpen] =
    useState(false);


  /**
   * =========================================
   * Weather request
   * =========================================
   *
   * Realiza la consulta meteorológica utilizando el servicio
   * creado anteriormente.
   *
   * AbortSignal permite cancelar la solicitud cuando el
   * componente se desmonta.
   */
  const loadWeather = useCallback(
    (signal?: AbortSignal): void => {
      void getWeather(
        FARM_WEATHER_QUERY,
        signal,
      ).then(
        (data) => {
          if (signal?.aborted) {
            return;
          }

          setWeatherData(data);
          setWeatherError(null);
          setWeatherStatus('SUCCESS');
        },
        (error: unknown) => {
          if (signal?.aborted) {
            return;
          }

          if (
            error instanceof WeatherServiceError &&
            error.code === 'REQUEST_ABORTED'
          ) {
            return;
          }

          setWeatherError(
            normalizeWeatherError(error),
          );

          setWeatherStatus('ERROR');
        },
      );
    },
    [],
  );


  /**
   * Consultamos el clima cuando el Sidebar se monta.
   *
   * Como el Sidebar es global, los datos estarán disponibles
   * sin importar en qué página de AgroVision se encuentre
   * actualmente el usuario.
   */
  useEffect(() => {
    const controller = new AbortController();

    loadWeather(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadWeather]);


  /**
   * =========================================
   * Weather modal
   * =========================================
   */

  const openWeatherModal = useCallback((): void => {
    setIsWeatherModalOpen(true);
  }, []);


  const closeWeatherModal = useCallback((): void => {
    setIsWeatherModalOpen(false);
  }, []);


  /**
   * Permite que el botón "Intentar nuevamente"
   * del panel vuelva a consultar Open-Meteo.
   */
  const retryWeather = useCallback((): void => {
    setWeatherStatus('LOADING');
    setWeatherError(null);
    loadWeather();
  }, [loadWeather]);


  /**
   * Permite abrir la tarjeta mediante teclado.
   */
  function handleWeatherKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
  ): void {
    if (
      event.key === 'Enter' ||
      event.key === ' '
    ) {
      event.preventDefault();
      openWeatherModal();
    }
  }


  /**
   * =========================================
   * Weather sidebar values
   * =========================================
   */

  const weatherTemperature = weatherData
    ? `${Math.round(
        weatherData.current.temperatureCelsius,
      )}°C`
    : '--°C';


  const weatherCondition = weatherData
    ? weatherData.current.condition.label
    : weatherStatus === 'LOADING'
      ? 'Actualizando clima...'
      : weatherStatus === 'ERROR'
        ? 'Clima no disponible'
        : 'Preparando clima...';


  const weatherWind = weatherData
    ? `${formatWeatherNumber(
        weatherData.current.windSpeedKmh,
      )} km/h`
    : '-- km/h';


  const weatherHumidity = weatherData
    ? `${Math.round(
        weatherData.current.relativeHumidityPercentage,
      )}%`
    : '--%';


  const weatherLabel = weatherData
    ? `Clima: ${weatherTemperature}`
    : weatherStatus === 'LOADING'
      ? 'Consultando clima...'
      : 'Abrir clima';


  return (
    <aside className="sidebar" aria-label="Navegación principal">
      <div className="sidebar__brand">
        <img src={agroVisionLogo} alt="AgroVision" />
      </div>

      <button
        type="button"
        className="sidebar__toggle"
        aria-label={isCollapsed ? 'Expandir navegación' : 'Reducir navegación'}
        onClick={onToggle}
      >
        {isCollapsed ? '>' : '<'}
      </button>

      <nav className="sidebar__nav">
        {ROUTES.map((route) => {
          const isActive = route.path === activePath;

          return (
            <button
              key={route.path}
              type="button"
              className={isActive ? 'sidebar__link is-active' : 'sidebar__link'}
              data-label={route.label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onNavigate(route.path)}
            >
              <span className="sidebar__iconSlot" aria-hidden="true">
                <img src={route.icon} alt="" className="sidebar__icon" />
              </span>

              <span className="sidebar__linkLabel">
                {route.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar__weatherZone">
        <img
          src={fieldImage}
          alt=""
          aria-hidden="true"
          className="sidebar__weatherLandscape"
        />

        <div className="sidebar__weatherOverlay" />

        {/*
         * =========================================
         * Weather card
         * =========================================
         *
         * Conservamos exactamente la estructura visual
         * original del Sidebar.
         *
         * Únicamente sustituimos los valores simulados
         * por los datos reales recibidos desde Open-Meteo.
         *
         * Además toda la tarjeta puede abrir WeatherModal.
         */}
        <div
          className="sidebar__weather"
          data-label={weatherLabel}
          role="button"
          tabIndex={0}
          aria-haspopup="dialog"
          aria-expanded={isWeatherModalOpen}
          aria-busy={weatherStatus === 'LOADING'}
          onClick={openWeatherModal}
          onKeyDown={handleWeatherKeyDown}
        >
          <div className="sidebar__weatherMain">
            <div className="sidebar__weatherIcon">
              <img src={weatherImage} alt="" aria-hidden="true" />
            </div>

            <div className="sidebar__weatherTemp">
              <strong>{weatherTemperature}</strong>
              <small>{weatherCondition}</small>
            </div>
          </div>

          <div className="sidebar__weatherStats">
            <span>Viento: {weatherWind}</span>
            <span className="sidebar__weatherDivider">|</span>
            <span>Humedad: {weatherHumidity}</span>
          </div>

          <button
            type="button"
            className="sidebar__weatherBtn"
            aria-haspopup="dialog"
            onClick={openWeatherModal}
          >
            Ver pronóstico
          </button>
        </div>
      </div>


      {/*
       * =========================================
       * Weather Modal
       * =========================================
       *
       * Aunque el componente se declara aquí,
       * WeatherModal utiliza createPortal(document.body).
       *
       * Por eso el panel aparecerá encima de TODA
       * la aplicación y no dentro del Sidebar.
       */}
      <WeatherModal
        isOpen={isWeatherModalOpen}
        status={weatherStatus}
        data={weatherData}
        error={weatherError}
        onClose={closeWeatherModal}
        onRetry={retryWeather}
      />
    </aside>
  );
}

/*{ 
      <div className="sidebar__secondary">
        <button type="button" className="sidebar__secondaryLink">
          <span className="sidebar__iconSlot" aria-hidden="true">
            <img
              src={helpIcon}
              alt="icono de ayuda"
              className="sidebar-secondary__icon"
            />
          </span>
          <span>Ayuda</span>
        </button>

        <button type="button" className="sidebar__secondaryLink">
          <span className="sidebar__iconSlot" aria-hidden="true">
            <img
              src={settingsIcon}
              alt="icono de ajustes"
              className="sidebar-secondary__icon"
            />
          </span>
          <span>Configuración</span>
        </button>
      </div> }*/

/**
 * WeatherService — fetches current weather and 5-day forecast from OpenWeatherMap
 * (free tier, 1000 calls/day) and reports the data as sensor readings.
 *
 * Configuration:
 *   OPENWEATHERMAP_API_KEY — required to enable; service disables gracefully if absent
 *   OPENWEATHERMAP_LAT     — home latitude
 *   OPENWEATHERMAP_LON     — home longitude
 *
 * Sensors registered:
 *   weather:current  — current outdoor conditions (temp, humidity, wind, etc.)
 *   weather:forecast — 5-day daily forecast summary
 */

import { createLogger } from '@protolabsai/utils';
import type { SensorRegistryService } from './sensor-registry-service.js';

const logger = createLogger('WeatherService');

const SENSOR_ID_CURRENT = 'weather:current';
const SENSOR_ID_FORECAST = 'weather:forecast';

interface OpenWeatherCurrentResponse {
  main: { temp: number; feels_like: number; humidity: number };
  wind: { speed: number };
  weather: Array<{ description: string; icon: string }>;
  rain?: { '1h'?: number; '3h'?: number };
  snow?: { '1h'?: number; '3h'?: number };
}

interface OpenWeatherForecastItem {
  dt_txt: string;
  main: { temp: number; feels_like: number; humidity: number };
  wind: { speed: number };
  weather: Array<{ description: string; icon: string }>;
  rain?: { '3h'?: number };
  snow?: { '3h'?: number };
  pop?: number;
}

interface OpenWeatherForecastResponse {
  list: OpenWeatherForecastItem[];
}

export interface WeatherCurrentData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  precipitation: number;
}

export interface WeatherForecastDay {
  date: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  precipitation: number;
  precipitationProbability: number;
}

export class WeatherService {
  private readonly sensorRegistry: SensorRegistryService;
  private readonly apiKey: string | undefined;
  private readonly lat: string | undefined;
  private readonly lon: string | undefined;
  private enabled = false;
  private latestForecast: WeatherForecastDay[] = [];

  constructor(sensorRegistry: SensorRegistryService) {
    this.sensorRegistry = sensorRegistry;
    this.apiKey = process.env.OPENWEATHERMAP_API_KEY;
    this.lat = process.env.OPENWEATHERMAP_LAT;
    this.lon = process.env.OPENWEATHERMAP_LON;
  }

  /**
   * Register weather sensors and perform an initial fetch.
   * If OPENWEATHERMAP_API_KEY is not set, logs a warning and returns without error.
   * Safe to call multiple times — idempotent.
   */
  start(): void {
    if (!this.apiKey) {
      logger.warn(
        'OPENWEATHERMAP_API_KEY not set — weather service disabled. ' +
          'Set the env var to enable weather context for maintenance scheduling.'
      );
      return;
    }

    if (!this.lat || !this.lon) {
      logger.warn(
        'OPENWEATHERMAP_LAT and OPENWEATHERMAP_LON not set — weather service disabled. ' +
          'Set location env vars to enable weather context.'
      );
      return;
    }

    this.sensorRegistry.register({
      id: SENSOR_ID_CURRENT,
      name: 'Weather (Current)',
      description: 'Current outdoor weather conditions from OpenWeatherMap.',
    });

    this.sensorRegistry.register({
      id: SENSOR_ID_FORECAST,
      name: 'Weather (Forecast)',
      description: '5-day weather forecast from OpenWeatherMap.',
    });

    this.enabled = true;
    logger.info('Weather service enabled — fetching initial conditions');

    void this.fetchAndReport().catch((err: unknown) => {
      logger.warn('Initial weather fetch failed:', err);
    });
  }

  /**
   * Fetch current conditions and 5-day forecast, then report to the sensor registry.
   * Called by the scheduler every 30 minutes.
   */
  async fetchAndReport(): Promise<void> {
    if (!this.enabled || !this.apiKey || !this.lat || !this.lon) {
      return;
    }

    await Promise.allSettled([this._fetchCurrent(), this._fetchForecast()]);
  }

  /**
   * Returns true if measurable precipitation is expected within the given number of days.
   * Uses the latest cached forecast data. Returns false if no forecast data is available.
   */
  isPrecipitationExpected(days: number): boolean {
    if (this.latestForecast.length === 0) return false;

    const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    return this.latestForecast.some((day) => {
      const dayDate = new Date(day.date);
      return dayDate <= cutoff && (day.precipitation > 0 || day.precipitationProbability > 0.3);
    });
  }

  private async _fetchCurrent(): Promise<void> {
    const url =
      `https://api.openweathermap.org/data/2.5/weather` +
      `?lat=${this.lat}&lon=${this.lon}&appid=${this.apiKey}&units=metric`;

    let res: Response;
    try {
      res = await fetch(url);
    } catch (err) {
      logger.warn('Weather current fetch network error:', err);
      return;
    }

    if (!res.ok) {
      logger.warn(`Weather current fetch failed: ${res.status} ${res.statusText}`);
      return;
    }

    const raw = (await res.json()) as OpenWeatherCurrentResponse;
    const weatherEntry = raw.weather[0];

    const current: WeatherCurrentData = {
      temp: raw.main.temp,
      feelsLike: raw.main.feels_like,
      humidity: raw.main.humidity,
      windSpeed: raw.wind.speed,
      description: weatherEntry?.description ?? '',
      icon: weatherEntry?.icon ?? '',
      precipitation:
        raw.rain?.['1h'] ?? raw.rain?.['3h'] ?? raw.snow?.['1h'] ?? raw.snow?.['3h'] ?? 0,
    };

    this.sensorRegistry.report({
      sensorId: SENSOR_ID_CURRENT,
      data: current as unknown as Record<string, unknown>,
    });

    logger.debug(`Current weather updated: ${current.description}, ${current.temp}°C`);
  }

  private async _fetchForecast(): Promise<void> {
    const url =
      `https://api.openweathermap.org/data/2.5/forecast` +
      `?lat=${this.lat}&lon=${this.lon}&appid=${this.apiKey}&units=metric`;

    let res: Response;
    try {
      res = await fetch(url);
    } catch (err) {
      logger.warn('Weather forecast fetch network error:', err);
      return;
    }

    if (!res.ok) {
      logger.warn(`Weather forecast fetch failed: ${res.status} ${res.statusText}`);
      return;
    }

    const raw = (await res.json()) as OpenWeatherForecastResponse;

    // Aggregate 3-hour intervals into daily summaries.
    // Prefer the noon reading for each day; fall back to the first available reading.
    const dayMap = new Map<string, OpenWeatherForecastItem>();
    const dayPrecipMap = new Map<string, number>();
    const dayPopMap = new Map<string, number>();

    for (const item of raw.list) {
      const date = item.dt_txt.slice(0, 10);

      // Accumulate total precipitation per day
      const precipAmount = item.rain?.['3h'] ?? item.snow?.['3h'] ?? 0;
      dayPrecipMap.set(date, (dayPrecipMap.get(date) ?? 0) + precipAmount);

      // Track max precipitation probability per day
      const pop = item.pop ?? 0;
      if (pop > (dayPopMap.get(date) ?? 0)) {
        dayPopMap.set(date, pop);
      }

      // Pick representative reading (noon preferred)
      if (!dayMap.has(date) || item.dt_txt.includes('12:00:00')) {
        dayMap.set(date, item);
      }
    }

    const forecast: WeatherForecastDay[] = Array.from(dayMap.entries()).map(([date, item]) => {
      const weatherEntry = item.weather[0];
      return {
        date,
        temp: item.main.temp,
        feelsLike: item.main.feels_like,
        humidity: item.main.humidity,
        windSpeed: item.wind.speed,
        description: weatherEntry?.description ?? '',
        icon: weatherEntry?.icon ?? '',
        precipitation: dayPrecipMap.get(date) ?? 0,
        precipitationProbability: dayPopMap.get(date) ?? 0,
      };
    });

    this.latestForecast = forecast;

    this.sensorRegistry.report({
      sensorId: SENSOR_ID_FORECAST,
      data: { forecast } as unknown as Record<string, unknown>,
    });

    logger.debug(`Forecast updated: ${forecast.length} days`);
  }
}

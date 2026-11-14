// Event-time weather using Open-Meteo (no API key needed).
// Docs: https://open-meteo.com/en/docs
// Never throws: always resolves to a WeatherSummary so weather problems can
// never block event details, browsing or booking (NFR-12).

import { DAY_MS } from '../utils/time.js';
import {
  STATUS,
  computeWeatherSummary,
  emptySummary,
  getEventWindow,
} from './weatherRules.js';

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const HORIZON_DAYS = 16; // Open-Meteo max with forecast_days
const CACHE_TTL_MS = 30 * 60 * 1000; // reuse a forecast for 30 minutes
const MAX_STALE_MS = 6 * 60 * 60 * 1000; // stale fallback allowed for 6 hours
const TIMEOUT_MS = 8000;

const cache = new Map(); // key -> { hourly, fetchedAt }

export function clearWeatherCache() {
  cache.clear();
}

function cacheKey(c) {
  return `${c.latitude.toFixed(2)},${c.longitude.toFixed(2)}`;
}

async function fetchHourly(coords, fetchImpl) {
  const url =
    `${BASE_URL}?latitude=${coords.latitude}&longitude=${coords.longitude}` +
    `&hourly=precipitation_probability,apparent_temperature,wind_speed_10m,weather_code` +
    `&forecast_days=${HORIZON_DAYS}&timezone=GMT`;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => controller && controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetchImpl(url, controller ? { signal: controller.signal } : undefined);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json?.hourly?.time) throw new Error('Unexpected response');
    return json.hourly;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * event = {
 *   startsAt: ISO string (with offset or Z), endsAt: ISO string,
 *   timezone: 'Asia/Colombo',          // venue timezone (display only)
 *   setting: 'outdoor' | 'indoor',
 *   coordinates: { latitude, longitude }
 * }
 * options = { now, fetchImpl, forceRefresh }
 */
export async function getEventWeather(event, options = {}) {
  const { now = Date.now(), fetchImpl = fetch, forceRefresh = false } = options;

  const coords = event?.coordinates;
  if (
    !coords ||
    typeof coords.latitude !== 'number' ||
    typeof coords.longitude !== 'number'
  ) {
    return emptySummary(STATUS.UNAVAILABLE, {
      title: 'Weather unavailable',
      reason: 'Venue location is missing.',
    });
  }

  const w = getEventWindow(event);
  if (!w) {
    return emptySummary(STATUS.UNAVAILABLE, {
      title: 'Weather unavailable',
      reason: 'Event time is missing or invalid.',
    });
  }

  if (w.endMs < now) {
    return emptySummary(STATUS.ENDED, {
      title: 'Event has ended',
      reason: 'Forecast advice is only shown for upcoming events.',
      scope: w.scope,
    });
  }

  // Beyond the supported window: skip the request, recheck later.
  if (w.windowStart >= now + HORIZON_DAYS * DAY_MS) {
    return emptySummary(STATUS.OUT_OF_RANGE, {
      title: 'Forecast available closer to the event',
      reason: 'This event is beyond the supported forecast window.',
      scope: w.scope,
    });
  }

  const key = cacheKey(coords);
  const cached = cache.get(key);

  if (cached && !forceRefresh && now - cached.fetchedAt < CACHE_TTL_MS) {
    return computeWeatherSummary({ event, hourly: cached.hourly, fetchedAt: cached.fetchedAt });
  }

  try {
    const hourly = await fetchHourly(coords, fetchImpl);
    cache.set(key, { hourly, fetchedAt: now });
    return computeWeatherSummary({ event, hourly, fetchedAt: now });
  } catch (e) {
    if (cached && now - cached.fetchedAt <= MAX_STALE_MS) {
      return computeWeatherSummary({
        event,
        hourly: cached.hourly,
        fetchedAt: cached.fetchedAt,
        stale: true,
      });
    }
    return emptySummary(STATUS.UNAVAILABLE, {
      title: 'Weather unavailable',
      reason: 'Could not load the forecast. Please try again later.',
      scope: w.scope,
    });
  }
}

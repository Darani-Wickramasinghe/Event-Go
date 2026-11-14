// Fake Open-Meteo responses for demos and tests (AT-19 etc.).
// Pass buildMockFetch(...) as options.fetchImpl to getEventWeather.

import { DAY_MS, HOUR_MS, floorToHour } from '../utils/time.js';
import { getEventWindow } from './weatherRules.js';

export const MOCK_SCENARIOS = [
  'rain_high',
  'rain_possible',
  'low_rain',
  'thunder',
  'incomplete',
  'network_error',
  'http_error',
];

export function buildMockFetch(scenario, event, now = Date.now()) {
  return async () => {
    if (scenario === 'network_error') throw new Error('Network request failed');
    if (scenario === 'http_error') {
      return { ok: false, status: 500, json: async () => ({}) };
    }

    const w = getEventWindow(event);
    const dayStart = Math.floor(now / DAY_MS) * DAY_MS;
    const peakSlot = w ? floorToHour(w.windowStart) + HOUR_MS : null;

    const time = [];
    const rain = [];
    const temp = [];
    const wind = [];
    const code = [];

    for (let i = 0; i < 16 * 24; i++) {
      const t = dayStart + i * HOUR_MS;
      time.push(new Date(t).toISOString().slice(0, 16));

      const inWindow =
        w && t >= floorToHour(w.windowStart) - HOUR_MS && t <= w.windowEnd + HOUR_MS;

      let r = 20;
      let c = 1;
      let tmp = 29;
      if (inWindow) {
        const isPeak = t === peakSlot;
        if (scenario === 'rain_high') { r = isPeak ? 75 : 40; c = 61; tmp = 24; }
        if (scenario === 'rain_possible') { r = isPeak ? 45 : 20; tmp = 26; }
        if (scenario === 'low_rain') { r = 10; tmp = 33; }
        if (scenario === 'thunder') { r = isPeak ? 70 : 30; c = isPeak ? 95 : 3; tmp = 26; }
        if (scenario === 'incomplete') { r = isPeak ? null : 20; tmp = 27; }
      }
      rain.push(r);
      code.push(c);
      temp.push(tmp);
      wind.push(12);
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        hourly: {
          time,
          precipitation_probability: rain,
          apparent_temperature: temp,
          wind_speed_10m: wind,
          weather_code: code,
        },
      }),
    };
  };
}

// Pure weather rules (no network). Easy to unit test.
// Thresholds are PRODUCT RULES from the Eventora analysis / SRS (FR-08, BR-09),
// not scientific safety thresholds.

import {
  HOUR_MS,
  floorToHour,
  parseUtcHour,
  formatVenueTime,
} from '../utils/time.js';

export const WEATHER_RULES = {
  LOW_RAIN_BELOW: 30, // % : below this everywhere -> "Low rain chance"
  PREPARE_RAIN_FROM: 60, // % : at or above -> "Prepare for rain"
  WARM_APPARENT_C: 32, // proposed: suggest water for warm outdoor events
  COOL_APPARENT_C: 20, // proposed: suggest a jacket for cooler conditions
  THUNDER_CODES: [95, 96, 99],
};

export const CATEGORY = {
  LOW_RAIN: 'LOW_RAIN',
  RAIN_POSSIBLE: 'RAIN_POSSIBLE',
  PREPARE_RAIN: 'PREPARE_RAIN',
  CHECK_ORGANIZER: 'CHECK_ORGANIZER',
};

export const STATUS = {
  OK: 'ok',
  OUT_OF_RANGE: 'out_of_range',
  UNAVAILABLE: 'unavailable',
  ENDED: 'ended',
};

export function emptySummary(status, extra = {}) {
  return {
    status,
    category: null,
    title: '',
    reason: '',
    scope: 'event', // 'event' (outdoor hours) or 'arrival' (indoor: hour before start)
    peakRainPercent: null,
    peakRainAt: null, // display string in venue timezone
    thunderAt: [],
    apparentTempMin: null,
    apparentTempMax: null,
    windMaxKmh: null,
    checklist: [], // [{ key, label }]
    lastUpdated: null, // ISO string
    stale: false,
    ...extra,
  };
}

// Outdoor events use the full event hours.
// Indoor events still show arrival-time conditions (the hour before start).
export function getEventWindow(event) {
  const startMs = Date.parse(event?.startsAt);
  if (!Number.isFinite(startMs)) return null;

  let endMs = Date.parse(event?.endsAt);
  if (!Number.isFinite(endMs) || endMs <= startMs) endMs = startMs + HOUR_MS;

  const outdoor = event.setting === 'outdoor';
  return {
    startMs,
    endMs,
    scope: outdoor ? 'event' : 'arrival',
    windowStart: outdoor ? startMs : startMs - HOUR_MS,
    windowEnd: outdoor ? endMs : startMs,
  };
}

function hourSlots(from, to) {
  const slots = [];
  for (let t = floorToHour(from); t < to; t += HOUR_MS) slots.push(t);
  if (slots.length === 0) slots.push(floorToHour(from));
  return slots;
}

export function computeWeatherSummary({ event, hourly, fetchedAt, stale = false }) {
  const w = getEventWindow(event);
  if (!w) {
    return emptySummary(STATUS.UNAVAILABLE, {
      reason: 'Event time is missing or invalid.',
    });
  }

  const tz = event.timezone;
  const lastUpdated = fetchedAt ? new Date(fetchedAt).toISOString() : null;
  const fmt = (ms) => formatVenueTime(ms, tz);

  // Index forecast hours by UTC time.
  const times = hourly?.time ?? [];
  const index = new Map();
  times.forEach((t, i) => {
    const ms = parseUtcHour(t);
    if (Number.isFinite(ms)) index.set(ms, i);
  });
  const lastTime = times.length ? parseUtcHour(times[times.length - 1]) : NaN;

  const slots = hourSlots(w.windowStart, w.windowEnd);
  const rows = [];
  let missing = false;

  for (const slot of slots) {
    const i = index.get(slot);
    if (i === undefined) {
      missing = true;
      continue;
    }
    rows.push({
      slot,
      rain: hourly.precipitation_probability?.[i],
      temp: hourly.apparent_temperature?.[i],
      wind: hourly.wind_speed_10m?.[i],
      code: hourly.weather_code?.[i],
    });
  }

  if (missing) {
    if (Number.isFinite(lastTime) && slots[0] > lastTime) {
      return emptySummary(STATUS.OUT_OF_RANGE, {
        title: 'Forecast available closer to the event',
        reason: 'This event is beyond the supported forecast window.',
        scope: w.scope,
        lastUpdated,
      });
    }
    return emptySummary(STATUS.UNAVAILABLE, {
      title: 'Weather unavailable',
      reason: 'Forecast data for the event hours is incomplete.',
      scope: w.scope,
      lastUpdated,
    });
  }

  // Never build a positive summary from incomplete data.
  if (rows.some((r) => typeof r.rain !== 'number')) {
    return emptySummary(STATUS.UNAVAILABLE, {
      title: 'Weather unavailable',
      reason: 'Rain probability is missing for some event hours.',
      scope: w.scope,
      lastUpdated,
    });
  }

  // ---- aggregate ----
  let peak = rows[0];
  for (const r of rows) if (r.rain > peak.rain) peak = r;

  const thunderRows = rows.filter((r) => WEATHER_RULES.THUNDER_CODES.includes(r.code));
  const temps = rows.map((r) => r.temp).filter((v) => typeof v === 'number');
  const winds = rows.map((r) => r.wind).filter((v) => typeof v === 'number');

  const apparentTempMin = temps.length ? Math.min(...temps) : null;
  const apparentTempMax = temps.length ? Math.max(...temps) : null;
  const windMaxKmh = winds.length ? Math.max(...winds) : null;

  // ---- category (rules from the analysis) ----
  let category;
  let title;
  let reason;
  const peakAt = fmt(peak.slot);

  if (thunderRows.length > 0) {
    category = CATEGORY.CHECK_ORGANIZER;
    title = 'Check organizer updates';
    reason = `Thunderstorm possible around ${thunderRows
      .map((r) => fmt(r.slot))
      .join(', ')}. This is forecast guidance, not an official emergency alert.`;
  } else if (peak.rain >= WEATHER_RULES.PREPARE_RAIN_FROM) {
    category = CATEGORY.PREPARE_RAIN;
    title = 'Prepare for rain';
    reason = `Peak hourly rain chance is ${peak.rain}% around ${peakAt}.`;
  } else if (peak.rain >= WEATHER_RULES.LOW_RAIN_BELOW) {
    category = CATEGORY.RAIN_POSSIBLE;
    title = 'Rain possible';
    reason = `Peak hourly rain chance is ${peak.rain}% around ${peakAt}. Carry rain protection.`;
  } else {
    category = CATEGORY.LOW_RAIN;
    title = 'Low rain chance';
    reason = `Hourly rain chance stays below ${WEATHER_RULES.LOW_RAIN_BELOW}% (peak ${peak.rain}%).`;
  }

  // ---- checklist ----
  const checklist = [];
  if (peak.rain >= WEATHER_RULES.LOW_RAIN_BELOW) {
    checklist.push({ key: 'rain_protection', label: 'Bring an umbrella or raincoat' });
  }
  if (w.scope === 'event') {
    if (apparentTempMax !== null && apparentTempMax >= WEATHER_RULES.WARM_APPARENT_C) {
      checklist.push({ key: 'water', label: 'Carry water and sun protection' });
    }
    if (apparentTempMin !== null && apparentTempMin <= WEATHER_RULES.COOL_APPARENT_C) {
      checklist.push({ key: 'jacket', label: 'Bring a light jacket' });
    }
  }
  if (category === CATEGORY.CHECK_ORGANIZER) {
    checklist.push({ key: 'check_updates', label: 'Check organizer updates before you go' });
  }

  // Stale data may only show cautionary advice, never reassurance.
  if (stale && category === CATEGORY.LOW_RAIN) {
    return emptySummary(STATUS.UNAVAILABLE, {
      title: 'Weather unavailable',
      reason: `Could not refresh the forecast. Last updated ${
        fetchedAt ? fmt(fetchedAt) : 'earlier'
      }.`,
      scope: w.scope,
      lastUpdated,
      stale: true,
    });
  }

  return emptySummary(STATUS.OK, {
    category,
    title,
    reason,
    scope: w.scope,
    peakRainPercent: peak.rain,
    peakRainAt: peakAt,
    thunderAt: thunderRows.map((r) => fmt(r.slot)),
    apparentTempMin,
    apparentTempMax,
    windMaxKmh,
    checklist,
    lastUpdated,
    stale,
  });
}

// For Member 5 (notifications): did the preparation category change materially?
// Only compares two real forecasts; unavailable data never triggers an alert.
export function hasMaterialChange(prev, next) {
  if (!prev || !next) return false;
  if (prev.status !== STATUS.OK || next.status !== STATUS.OK) return false;
  if (prev.category !== next.category) return true;
  const a = prev.checklist.map((c) => c.key).sort().join(',');
  const b = next.checklist.map((c) => c.key).sort().join(',');
  return a !== b;
}

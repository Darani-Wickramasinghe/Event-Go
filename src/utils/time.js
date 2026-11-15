// Time helpers for the weather planner.
// Open-Meteo hourly data is requested in GMT, so all comparisons are done
// in UTC milliseconds. The venue timezone is only used for DISPLAY.

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

export const floorToHour = (ms) => Math.floor(ms / HOUR_MS) * HOUR_MS;

// Open-Meteo returns "2026-11-14T11:00" (no offset) in GMT.
export function parseUtcHour(str) {
  if (typeof str !== 'string') return NaN;
  const hasOffset = /([zZ]|[+-]\d\d:\d\d)$/.test(str);
  return Date.parse(hasOffset ? str : `${str}Z`);
}

// "5:00 PM" in the venue timezone (falls back to UTC if Intl/timezone fails).
export function formatVenueTime(ms, timeZone) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone,
    }).format(new Date(ms));
  } catch (e) {
    return `${new Date(ms).toISOString().slice(11, 16)} UTC`;
  }
}

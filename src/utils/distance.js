// Straight-line (haversine) distance helpers for event cards.

const EARTH_RADIUS_KM = 6371;

const toRad = (deg) => (deg * Math.PI) / 180;

export function haversineKm(from, to) {
  if (!from || !to) return null;

  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

// Works with { coordinates: {latitude, longitude} } and with flat { latitude, longitude }.
export function eventCoordinates(event) {
  if (!event) return null;
  const c = event.coordinates;
  if (c && Number.isFinite(c.latitude) && Number.isFinite(c.longitude)) return c;
  if (Number.isFinite(event.latitude) && Number.isFinite(event.longitude)) {
    return { latitude: event.latitude, longitude: event.longitude };
  }
  return null;
}

// Card label. Clearly marked as approximate, as the analysis requires.
export function distanceLabel(origin, eventCoords) {
  const km = haversineKm(origin, eventCoords);
  if (km === null) return 'Distance unavailable';
  if (km < 1) return `${Math.round(km * 1000)} m approx.`;
  return `${km.toFixed(1)} km approx.`;
}

export function eventDistanceLabel(origin, event) {
  const c = eventCoordinates(event);
  return c ? distanceLabel(origin, c) : 'Distance unavailable';
}

// Sort helper: nearest first. Events without distance go last.
export function sortByNearest(events, origin) {
  return [...events].sort((a, b) => {
    const da = haversineKm(origin, eventCoordinates(a));
    const db = haversineKm(origin, eventCoordinates(b));
    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  });
}

// Radius filter. With no origin, returns everything (never hides events).
export function withinRadius(events, origin, radiusKm) {
  if (!origin) return events;
  return events.filter((e) => {
    const km = haversineKm(origin, eventCoordinates(e));
    return km !== null && km <= radiusKm;
  });
}
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';
const cache = new Map();
const geometryCache = new Map();

export function clearRouteCache() {
  cache.clear();
  geometryCache.clear();
}

const round3 = (n) => n.toFixed(3);

export async function getRouteEstimate(origin, destination, options = {}) {
  const { fetchImpl = fetch, timeoutMs = 8000 } = options;
  if (!origin || !destination) return { ok: false, reason: 'no_origin' };

  const key = `${round3(origin.latitude)},${round3(origin.longitude)}>${round3(
    destination.latitude
  )},${round3(destination.longitude)}`;
  if (cache.has(key)) return cache.get(key);

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => controller && controller.abort(), timeoutMs);

  try {
    const url =
      `${OSRM_URL}/${origin.longitude},${origin.latitude};` +
      `${destination.longitude},${destination.latitude}?overview=false`;
    const res = await fetchImpl(url, controller ? { signal: controller.signal } : undefined);
    if (!res.ok) return { ok: false, reason: 'http_error' };

    const json = await res.json();
    const route = json?.routes?.[0];
    if (
      json?.code !== 'Ok' ||
      !route ||
      typeof route.distance !== 'number' ||
      typeof route.duration !== 'number'
    ) {
      return { ok: false, reason: 'no_route' };
    }

    const result = {
      ok: true,
      mode: 'driving',
      distanceKm: Math.round(route.distance / 100) / 10,
      durationMin: Math.max(1, Math.round(route.duration / 60)),
    };
    cache.set(key, result);
    return result;
  } catch (e) {
    return { ok: false, reason: 'error' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches the full route geometry (array of {latitude, longitude} waypoints)
 * from OSRM using GeoJSON format. This follows actual roads, not a straight line.
 */
export async function getRouteGeometry(origin, destination, options = {}) {
  const { fetchImpl = fetch, timeoutMs = 10000 } = options;
  if (!origin || !destination) return { ok: false, reason: 'no_origin', coordinates: [] };

  const key = `geo:${round3(origin.latitude)},${round3(origin.longitude)}>${round3(
    destination.latitude
  )},${round3(destination.longitude)}`;
  if (geometryCache.has(key)) return geometryCache.get(key);

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => controller && controller.abort(), timeoutMs);

  try {
    const url =
      `${OSRM_URL}/${origin.longitude},${origin.latitude};` +
      `${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
    const res = await fetchImpl(url, controller ? { signal: controller.signal } : undefined);
    if (!res.ok) return { ok: false, reason: 'http_error', coordinates: [] };

    const json = await res.json();
    const route = json?.routes?.[0];
    if (
      json?.code !== 'Ok' ||
      !route ||
      !route.geometry ||
      !route.geometry.coordinates
    ) {
      return { ok: false, reason: 'no_route', coordinates: [] };
    }

    // OSRM GeoJSON returns [longitude, latitude]; convert to {latitude, longitude}
    const coordinates = route.geometry.coordinates.map(([lng, lat]) => ({
      latitude: lat,
      longitude: lng,
    }));

    const result = {
      ok: true,
      coordinates,
      distanceKm: Math.round(route.distance / 100) / 10,
      durationMin: Math.max(1, Math.round(route.duration / 60)),
    };
    geometryCache.set(key, result);
    return result;
  } catch (e) {
    return { ok: false, reason: 'error', coordinates: [] };
  } finally {
    clearTimeout(timer);
  }
}
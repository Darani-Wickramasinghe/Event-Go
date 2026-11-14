const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';
const cache = new Map();

export function clearRouteCache() {
  cache.clear();
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
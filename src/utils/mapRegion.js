// Pure map helpers (no React). Tested in tests/mapRegion.test.mjs.
// Note: longitude wrap-around at +/-180 is ignored (not needed for Sri Lanka).

import { eventCoordinates, haversineKm } from './distance.js';

// Kelaniya, used when there is no location and no manual area yet.
export const DEFAULT_REGION = {
  latitude: 6.9553,
  longitude: 79.922,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export function regionAround(coords, latitudeDelta = 0.05, longitudeDelta = 0.05) {
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    latitudeDelta,
    longitudeDelta,
  };
}

// Events whose coordinates fall inside the visible map rectangle.
// Events without coordinates are never shown on a map.
export function eventsInRegion(events, region) {
  if (!region) return events;
  const halfLat = region.latitudeDelta / 2;
  const halfLng = region.longitudeDelta / 2;
  return events.filter((e) => {
    const c = eventCoordinates(e);
    if (!c) return false;
    return (
      Math.abs(c.latitude - region.latitude) <= halfLat &&
      Math.abs(c.longitude - region.longitude) <= halfLng
    );
  });
}

// "Meaningful movement": true when `to` is at least thresholdM metres from `from`.
export function movedEnough(from, to, thresholdM = 200) {
  if (!from || !to) return true;
  return haversineKm(from, to) * 1000 >= thresholdM;
}

// Has the user panned or zoomed away from the area the results are based on?
// Used to decide when to show "Search this area".
export function regionsDiffer(a, b, centerThresholdM = 150, zoomRatio = 0.2) {
  if (!a || !b) return false;
  if (movedEnough(a, b, centerThresholdM)) return true;
  const latRatio = Math.abs(a.latitudeDelta - b.latitudeDelta) / b.latitudeDelta;
  const lngRatio = Math.abs(a.longitudeDelta - b.longitudeDelta) / b.longitudeDelta;
  return latRatio > zoomRatio || lngRatio > zoomRatio;
}
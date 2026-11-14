// Pure helpers for external navigation and route text.
// No API key is needed: we open the Google Maps app/site with a universal link.

export const TRAVEL_MODES = ['driving', 'walking', 'transit', 'bicycling'];

// The origin is added ONLY when the user picked an area manually.
// With GPS we leave it out so the navigation app uses the live device location.
// We never use the map centre as an origin (SRS section 05).
export function buildDirectionsUrl({ origin, destination, mode = 'driving' }) {
  const travelmode = TRAVEL_MODES.includes(mode) ? mode : 'driving';
  const params = [
    'api=1',
    `destination=${destination.latitude},${destination.longitude}`,
    `travelmode=${travelmode}`,
  ];
  if (origin && origin.source === 'manual') {
    params.push(`origin=${origin.latitude},${origin.longitude}`);
  }
  return `https://www.google.com/maps/dir/?${params.join('&')}`;
}

// "5.2 km · 14 min by car (approx.)", or null when there is no real estimate.
export function formatRoute(estimate) {
  if (!estimate || !estimate.ok) return null;
  const mins = estimate.durationMin;
  const time = mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`;
  return `${estimate.distanceKm.toFixed(1)} km \u00b7 ${time} by car (approx.)`;
}
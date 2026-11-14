const searchUrl = process.env.EXPO_PUBLIC_VENUE_SEARCH_URL || 'https://photon.komoot.io/api/';

export function isMapPoint(point) {
  return !!point && Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90
    && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180;
}

export async function searchVenues(query, signal) {
  const params = new URLSearchParams({ q: query, limit: '6', bbox: '79.5,5.8,82,10' });
  const response = await fetch(`${searchUrl}?${params}`, { signal });
  if (!response.ok) throw new Error('Venue search unavailable');
  const { features } = await response.json();
  return features.flatMap(({ geometry, properties }) => {
    if (geometry?.type !== 'Point' || !properties?.name) return [];
    const [longitude, latitude] = geometry.coordinates;
    if (!isMapPoint({ latitude, longitude })) return [];
    const city = properties.city || properties.town || properties.village || properties.locality || '';
    const address = [...new Set([properties.street, city, properties.district, properties.state].filter(Boolean))]
      .filter((part) => part !== properties.name).join(', ');
    return [{ venue: properties.name, city, address, latitude, longitude }];
  });
}

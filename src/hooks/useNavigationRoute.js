import { useEffect, useRef, useState } from 'react';
import { getRouteGeometry } from '../services/routeService';
import { movedEnough } from '../utils/mapRegion';

/**
 * Fetches actual road-following route geometry between origin and destination.
 * Re-fetches only when the origin moves at least `refetchDistanceM` metres.
 *
 * Returns { loading, error, route }
 *   route: { coordinates: [{latitude, longitude}...], distanceKm, durationMin } | null
 */
export function useNavigationRoute(origin, destination, { refetchDistanceM = 300 } = {}) {
  const [state, setState] = useState({ loading: false, error: null, route: null });
  const stableOriginRef = useRef(origin);

  // Only re-fetch after meaningful movement
  useEffect(() => {
    if (movedEnough(stableOriginRef.current, origin, refetchDistanceM)) {
      stableOriginRef.current = origin;
    }
  }, [origin, refetchDistanceM]);

  const stableOrigin = stableOriginRef.current;
  const oLat = stableOrigin?.latitude;
  const oLng = stableOrigin?.longitude;
  const dLat = destination?.latitude;
  const dLng = destination?.longitude;

  useEffect(() => {
    let cancelled = false;

    if (oLat == null || oLng == null || dLat == null || dLng == null) {
      setState({ loading: false, error: null, route: null });
      return undefined;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    getRouteGeometry(
      { latitude: oLat, longitude: oLng },
      { latitude: dLat, longitude: dLng }
    ).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setState({
          loading: false,
          error: null,
          route: {
            coordinates: result.coordinates,
            distanceKm: result.distanceKm,
            durationMin: result.durationMin,
          },
        });
      } else {
        setState({
          loading: false,
          error: result.reason || 'Route unavailable',
          route: null,
        });
      }
    });

    return () => { cancelled = true; };
  }, [oLat, oLng, dLat, dLng]);

  return state;
}

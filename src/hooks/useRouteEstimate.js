import { useEffect, useState } from 'react';
import { getRouteEstimate } from '../services/routeService';
import { movedEnough } from '../utils/mapRegion';


export function useRouteEstimate(origin, destination) {
  const [state, setState] = useState({ loading: false, estimate: null });
  const [stableOrigin, setStableOrigin] = useState(origin);

  // Recalculate only after meaningful movement (300 m).
  useEffect(() => {
    if (movedEnough(stableOrigin, origin, 300) || stableOrigin?.source !== origin?.source) {
      setStableOrigin(origin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin]);

  const dLat = destination?.latitude;
  const dLng = destination?.longitude;

  useEffect(() => {
    let cancelled = false;
    if (!stableOrigin || dLat == null || dLng == null) {
      setState({ loading: false, estimate: null });
      return undefined;
    }
    setState((s) => ({ ...s, loading: true }));
    getRouteEstimate(stableOrigin, { latitude: dLat, longitude: dLng }).then((estimate) => {
      if (!cancelled) setState({ loading: false, estimate });
    });
    return () => {
      cancelled = true;
    };
  }, [stableOrigin, dLat, dLng]);

  return state;
}
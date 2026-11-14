import { useCallback, useEffect, useState } from 'react';
import { getEventWeather } from '../services/weatherService.js';

// Usage: const { summary, loading, reload } = useEventWeather(event);
// `summary` is always a WeatherSummary (see weatherRules.emptySummary).
export function useEventWeather(event, options = {}) {
  const { fetchImpl, forceRefresh = false, enabled = true } = options;
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const lat = event?.coordinates?.latitude;
  const lon = event?.coordinates?.longitude;

  useEffect(() => {
    let cancelled = false;
    if (!enabled) {
      setSummary(null);
      setLoading(false);
      return undefined;
    }
    setLoading(true);

    getEventWeather(event, {
      fetchImpl: fetchImpl || fetch,
      forceRefresh: forceRefresh || tick > 0,
    }).then((result) => {
      if (!cancelled) {
        setSummary(result);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id, event?.startsAt, event?.endsAt, event?.setting, lat, lon, fetchImpl, forceRefresh, enabled, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  return { summary, loading, reload };
}
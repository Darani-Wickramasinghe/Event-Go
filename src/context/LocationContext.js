import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as Location from 'expo-location';

export const LOCATION_STATUS = {
  LOADING: 'loading',
  READY: 'ready', // GPS working
  DENIED: 'denied', // permission refused
  UNAVAILABLE: 'unavailable', // GPS off or failed
};

const WEAK_SIGNAL_ACCURACY_M = 100;

const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  const [status, setStatus] = useState(LOCATION_STATUS.LOADING);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [manualOrigin, setManualOrigin] = useState(null); // {name, latitude, longitude}
  const [weakSignal, setWeakSignal] = useState(false);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const subscription = useRef(null);

  const stopWatching = useCallback(() => {
    if (subscription.current) {
      subscription.current.remove();
      subscription.current = null;
    }
  }, []);

  const handlePosition = useCallback((loc) => {
    setGpsCoords({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
      timestamp: loc.timestamp,
    });
    setWeakSignal(
      loc.coords.accuracy != null &&
        loc.coords.accuracy > WEAK_SIGNAL_ACCURACY_M
    );
    setStatus(LOCATION_STATUS.READY);
  }, []);

  const startWatching = useCallback(async () => {
    stopWatching();
    try {
      // Quick first fix from cache so the UI is not empty.
      const last = await Location.getLastKnownPositionAsync();
      if (last) handlePosition(last);

      subscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 25, // metres: "meaningful movement"
          timeInterval: 5000,
        },
        handlePosition
      );
    } catch (e) {
      setStatus(LOCATION_STATUS.UNAVAILABLE);
    }
  }, [handlePosition, stopWatching]);

  // Asks for permission (shows the system dialog if allowed) then starts GPS.
  const requestAndStart = useCallback(async () => {
    setStatus(LOCATION_STATUS.LOADING);
    try {
      const { status: perm, canAskAgain: again } =
        await Location.requestForegroundPermissionsAsync();
      setCanAskAgain(again);

      if (perm !== 'granted') {
        setStatus(LOCATION_STATUS.DENIED);
        return;
      }

      const servicesOn = await Location.hasServicesEnabledAsync();
      if (!servicesOn) {
        setStatus(LOCATION_STATUS.UNAVAILABLE);
        return;
      }

      await startWatching();
    } catch (e) {
      setStatus(LOCATION_STATUS.UNAVAILABLE);
    }
  }, [startWatching]);

  useEffect(() => {
    requestAndStart();
    return stopWatching;
  }, [requestAndStart, stopWatching]);

  const chooseManualCity = useCallback((city) => setManualOrigin(city), []);
  const useMyLocation = useCallback(() => {
    setManualOrigin(null);
    if (status !== LOCATION_STATUS.READY) requestAndStart();
  }, [status, requestAndStart]);

  // The single origin the whole app uses for distance, nearby and weather.
  // Manual selection wins; otherwise GPS; otherwise null (distance unavailable).
  const origin = useMemo(() => {
    if (manualOrigin) {
      return {
        latitude: manualOrigin.latitude,
        longitude: manualOrigin.longitude,
        source: 'manual',
        name: manualOrigin.name,
      };
    }
    if (gpsCoords) {
      return {
        latitude: gpsCoords.latitude,
        longitude: gpsCoords.longitude,
        source: 'gps',
        name: 'My location',
      };
    }
    return null;
  }, [manualOrigin, gpsCoords]);

  const value = useMemo(
    () => ({
      origin,
      gpsCoords,
      status,
      weakSignal,
      canAskAgain,
      requestAndStart,
      chooseManualCity,
      useMyLocation,
    }),
    [
      origin,
      gpsCoords,
      status,
      weakSignal,
      canAskAgain,
      requestAndStart,
      chooseManualCity,
      useMyLocation,
    ]
  );

  return (
    <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used inside <LocationProvider>');
  return ctx;
}

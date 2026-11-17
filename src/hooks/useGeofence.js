// Checks whether the current GPS position is inside a chosen distance from the venue.
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { haversineKm } from '../utils/distance';

/**
 * Monitors the user's current position against a destination and triggers
 * a notification when entering the configurable proximity radius.
 *
 * @param {object|null} userLocation   - { latitude, longitude } current GPS
 * @param {object|null} destination    - { latitude, longitude } event venue
 * @param {object}      options
 * @param {number}      options.radiusKm - proximity radius in km (default 0.5 = 500 m)
 * @param {string}      options.eventTitle - event name for the notification
 *
 * Returns { isNearDestination, distanceKm, radiusKm }
 */
export function useGeofence(userLocation, destination, options = {}) {
  const { radiusKm = 0.5, eventTitle = 'your destination' } = options;
  const [isNear, setIsNear] = useState(false);
  const alertedRef = useRef(false);

  const distanceKm = haversineKm(userLocation, destination);

  useEffect(() => {
    if (distanceKm === null) {
      setIsNear(false);
      return;
    }

    const inside = distanceKm <= radiusKm;
    setIsNear(inside);

    // Alert once on entry
    if (inside && !alertedRef.current) {
      alertedRef.current = true;
      if (Platform.OS === 'web') {
        // eslint-disable-next-line no-alert
        window.alert(`You are near ${eventTitle}!`);
      } else {
        Alert.alert(
          'Destination Nearby',
          `You are near ${eventTitle}!`,
          [{ text: 'OK', style: 'default' }],
          { cancelable: true }
        );
      }
    }

    // Reset alert flag when the user leaves the radius so it can fire again
    if (!inside) {
      alertedRef.current = false;
    }
  }, [distanceKm, radiusKm, eventTitle]);

  // Reset when destination changes
  useEffect(() => {
    alertedRef.current = false;
    setIsNear(false);
  }, [destination?.latitude, destination?.longitude]);

  return {
    isNearDestination: isNear,
    distanceKm,
    radiusKm,
  };
}

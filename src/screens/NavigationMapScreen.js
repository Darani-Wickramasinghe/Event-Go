// Tracks the current position and draws the driving route and venue radius on mobile.
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Circle, Marker, Polyline } from 'react-native-maps';
import { Copy } from '../components/FlowUI';
import { useGeofence } from '../hooks/useGeofence';
import { useNavigationRoute } from '../hooks/useNavigationRoute';
import { colors, headingFont } from '../theme';

const DEFAULT_RADIUS_KM = 0.5; // 500 metres
const RADIUS_OPTIONS_KM = [0.2, 0.5, 1.0, 2.0];

export default function NavigationMapScreen({ event, onBack }) {
  const map = useRef(null);
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | denied | unavailable
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const subscription = useRef(null);
  const active = useRef(true);

  const destination = event?.latitude != null && event?.longitude != null
    ? { latitude: event.latitude, longitude: event.longitude }
    : null;

  // ── GPS setup ──
  useEffect(() => {
    active.current = true;

    (async () => {
      try {
        const { status: perm } = await Location.requestForegroundPermissionsAsync();
        if (perm !== 'granted') {
          if (active.current) setStatus('denied');
          return;
        }

        const servicesOn = await Location.hasServicesEnabledAsync();
        if (!servicesOn) {
          if (active.current) setStatus('unavailable');
          return;
        }

        // Quick first fix
        try {
          const last = await Location.getLastKnownPositionAsync();
          if (last && active.current) {
            setLocation({ latitude: last.coords.latitude, longitude: last.coords.longitude });
            setStatus('ready');
          }
        } catch { /* ignore */ }

        // Live updates
        const watch = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 3000 },
          ({ coords }) => {
            if (active.current) {
              setLocation({ latitude: coords.latitude, longitude: coords.longitude });
              setStatus('ready');
            }
          }
        );
        if (active.current) subscription.current = watch;
        else watch.remove();
      } catch {
        if (active.current) setStatus('unavailable');
      }
    })();

    return () => {
      active.current = false;
      subscription.current?.remove();
    };
  }, []);

  // ── Route ──
  // Fetch road geometry using the current GPS position and event destination.
  const { loading: routeLoading, error: routeError, route } = useNavigationRoute(
    location,
    destination
  );

  // ── Geofence ──
  // Compare the user's current position with the selected radius around the venue.
  const { isNearDestination, distanceKm } = useGeofence(location, destination, {
    radiusKm,
    eventTitle: event?.title || 'your destination',
  });

  // ── Fit map to route ──
  useEffect(() => {
    if (route?.coordinates?.length > 1 && map.current) {
      map.current.fitToCoordinates(route.coordinates, {
        edgePadding: { top: 80, right: 40, bottom: 200, left: 40 },
        animated: true,
      });
    }
  }, [route]);

  // ── Fit to both markers when no route yet ──
  useEffect(() => {
    if (!route && location && destination && map.current) {
      map.current.fitToCoordinates([location, destination], {
        edgePadding: { top: 80, right: 40, bottom: 200, left: 40 },
        animated: true,
      });
    }
  }, [location, destination, route]);

  // ── Recenter button ──
  // Move the map back to the user's current position.
  function recenter() {
    if (!map.current) return;
    if (route?.coordinates?.length > 1) {
      map.current.fitToCoordinates(route.coordinates, {
        edgePadding: { top: 80, right: 40, bottom: 200, left: 40 },
        animated: true,
      });
    } else if (location) {
      map.current.animateToRegion({
        ...location,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
  }

  // ── Duration label ──
  const routeLabel = route
    ? `${route.distanceKm.toFixed(1)} km · ${
        route.durationMin >= 60
          ? `${Math.floor(route.durationMin / 60)} h ${route.durationMin % 60} min`
          : `${route.durationMin} min`
      } by car`
    : null;

  // ── Status messages ──
  if (status === 'denied') {
    return (
      <View style={styles.screen}>
        <Header title={event?.title || 'Navigation'} onBack={onBack} />
        <View style={styles.centered}>
          <Ionicons name="location-outline" size={48} color={colors.muted} />
          <Copy>Location access is required for navigation. Please enable it in your device settings.</Copy>
        </View>
      </View>
    );
  }

  if (status === 'unavailable') {
    return (
      <View style={styles.screen}>
        <Header title={event?.title || 'Navigation'} onBack={onBack} />
        <View style={styles.centered}>
          <Ionicons name="warning-outline" size={48} color={colors.muted} />
          <Copy>Location services are unavailable. Please enable GPS on your device.</Copy>
        </View>
      </View>
    );
  }

  if (!destination) {
    return (
      <View style={styles.screen}>
        <Header title={event?.title || 'Navigation'} onBack={onBack} />
        <View style={styles.centered}>
          <Copy>This event does not have map coordinates.</Copy>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Header title={event?.title || 'Navigation'} onBack={onBack} />

      <View style={styles.mapContainer}>
        {(status === 'loading' || !location) ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.purple} />
            <Text style={styles.loadingText}>Acquiring GPS location…</Text>
          </View>
        ) : (
          <MapView
            ref={map}
            style={styles.map}
            initialRegion={{
              latitude: (location.latitude + destination.latitude) / 2,
              longitude: (location.longitude + destination.longitude) / 2,
              latitudeDelta: Math.abs(location.latitude - destination.latitude) * 1.5 + 0.01,
              longitudeDelta: Math.abs(location.longitude - destination.longitude) * 1.5 + 0.01,
            }}
            showsCompass
            showsScale
          >
            {/* ── Geofence circle ── */}
            <Circle
              center={destination}
              radius={radiusKm * 1000}
              fillColor="rgba(220, 38, 38, 0.15)"
              strokeColor="rgba(220, 38, 38, 0.7)"
              strokeWidth={2}
            />

            {/* ── Route polyline (actual road route) ── */}
            {route?.coordinates?.length > 1 && (
              <Polyline
                coordinates={route.coordinates}
                strokeColor="#4285F4"
                strokeWidth={5}
                lineDashPattern={null}
                lineCap="round"
                lineJoin="round"
              />
            )}

            {/* ── Destination marker ── */}
            <Marker
              coordinate={destination}
              title={event?.venue || 'Destination'}
              description={event?.city ? `${event.venue}, ${event.city}` : undefined}
              pinColor="#DC2626"
            />

            {/* ── User location marker ── */}
            <Marker
              coordinate={location}
              title="You are here"
              pinColor="#4285F4"
            />
          </MapView>
        )}

        {/* ── Recenter button ── */}
        {location && (
          <Pressable
            style={styles.recenterButton}
            onPress={recenter}
            accessibilityRole="button"
            accessibilityLabel="Recenter map"
          >
            <Ionicons name="locate" size={22} color={colors.purpleDark} />
          </Pressable>
        )}
      </View>

      {/* ── Info panel ── */}
      <View style={styles.infoPanel}>
        {/* Proximity alert banner */}
        {isNearDestination && (
          <View style={styles.proximityBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.proximityText}>You are near your destination!</Text>
          </View>
        )}

        {/* Route info */}
        {routeLoading && (
          <View style={styles.infoRow}>
            <ActivityIndicator size="small" color={colors.purple} />
            <Text style={styles.infoText}>Calculating route…</Text>
          </View>
        )}
        {routeError && !routeLoading && (
          <View style={styles.infoRow}>
            <Ionicons name="alert-circle-outline" size={18} color="#B42332" />
            <Text style={[styles.infoText, { color: '#B42332' }]}>
              Route unavailable. Check your connection.
            </Text>
          </View>
        )}
        {routeLabel && !routeLoading && (
          <View style={styles.infoRow}>
            <Ionicons name="car-outline" size={18} color={colors.ink} />
            <Text style={styles.routeText}>{routeLabel}</Text>
          </View>
        )}

        {/* Distance to destination */}
        {distanceKm !== null && (
          <View style={styles.infoRow}>
            <Ionicons name="navigate-outline" size={18} color={colors.purpleDark} />
            <Text style={styles.infoText}>
              {distanceKm < 1
                ? `${Math.round(distanceKm * 1000)} m away`
                : `${distanceKm.toFixed(1)} km away`}
            </Text>
          </View>
        )}

        {/* Radius selector */}
        <View style={styles.radiusRow}>
          <Text style={styles.radiusLabel}>Proximity radius:</Text>
          <View style={styles.radiusOptions}>
            {RADIUS_OPTIONS_KM.map((r) => (
              <Pressable
                key={r}
                style={[styles.radiusChip, radiusKm === r && styles.radiusChipActive]}
                onPress={() => setRadiusKm(r)}
                accessibilityRole="button"
                accessibilityLabel={`${r * 1000} metres radius`}
                accessibilityState={{ selected: radiusKm === r }}
              >
                <Text
                  style={[styles.radiusChipText, radiusKm === r && styles.radiusChipTextActive]}
                >
                  {r >= 1 ? `${r} km` : `${r * 1000} m`}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function Header({ title, onBack }) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={onBack}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={24} color={colors.ink} />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  backButton: {
    width: 44,
    height: 44,
    marginLeft: -10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    color: colors.ink,
    fontFamily: headingFont,
    fontSize: 20,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#EFEDFF',
  },
  map: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    gap: 12,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 15,
    marginTop: 8,
  },
  recenterButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
      android: { elevation: 4 },
      default: {},
    }),
  },
  infoPanel: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderColor: colors.line,
    gap: 10,
  },
  proximityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#16A34A',
  },
  proximityText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    color: colors.muted,
    fontSize: 14,
    flex: 1,
  },
  routeText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  radiusLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  radiusOptions: {
    flexDirection: 'row',
    gap: 6,
  },
  radiusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  radiusChipActive: {
    borderColor: colors.action,
    backgroundColor: colors.lavender,
  },
  radiusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  radiusChipTextActive: {
    color: colors.purpleDark,
  },
});

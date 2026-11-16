import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Circle, Marker, Polyline } from 'react-native-maps';
import { Copy } from '../components/FlowUI';
import { useGeofence } from '../hooks/useGeofence';
import { useNavigationRoute } from '../hooks/useNavigationRoute';
import { colors, headingFont } from '../theme';

// ── Configurable defaults ──────────────────────────────────────────────────
const DEFAULT_RADIUS_KM = 0.5;
const RADIUS_OPTIONS_KM = [0.2, 0.5, 1.0, 2.0];
const ROUTE_COLOR = '#4285F4';
const GEOFENCE_FILL = 'rgba(220, 38, 38, 0.12)';
const GEOFENCE_STROKE = 'rgba(220, 38, 38, 0.75)';

// ── Helpers ────────────────────────────────────────────────────────────────
function midpoint(a, b) {
  return {
    latitude: (a.latitude + b.latitude) / 2,
    longitude: (a.longitude + b.longitude) / 2,
  };
}

function spanDelta(a, b, padding = 1.6) {
  return {
    latitudeDelta: Math.max(Math.abs(a.latitude - b.latitude) * padding, 0.01),
    longitudeDelta: Math.max(Math.abs(a.longitude - b.longitude) * padding, 0.01),
  };
}

// ── Main screen ────────────────────────────────────────────────────────────
export default function NavigationMapScreen({ event, onBack }) {
  const map = useRef(null);
  const [location, setLocation] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('loading'); // loading | ready | denied | unavailable
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const subscription = useRef(null);
  const active = useRef(true);

  const destination =
    event?.latitude != null && event?.longitude != null
      ? { latitude: Number(event.latitude), longitude: Number(event.longitude) }
      : null;

  // ── GPS permission + live tracking ──────────────────────────────────────
  useEffect(() => {
    active.current = true;

    (async () => {
      try {
        const { status: perm } = await Location.requestForegroundPermissionsAsync();
        if (perm !== 'granted') {
          if (active.current) setGpsStatus('denied');
          return;
        }

        const servicesOn = await Location.hasServicesEnabledAsync();
        if (!servicesOn) {
          if (active.current) setGpsStatus('unavailable');
          return;
        }

        // Quick first fix from cache
        try {
          const last = await Location.getLastKnownPositionAsync();
          if (last && active.current) {
            setLocation({ latitude: last.coords.latitude, longitude: last.coords.longitude });
            setGpsStatus('ready');
          }
        } catch { /* ignore — live watch below will provide first fix */ }

        // Live GPS updates (high accuracy, 10 m threshold)
        const watch = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 3000 },
          ({ coords }) => {
            if (active.current) {
              setLocation({ latitude: coords.latitude, longitude: coords.longitude });
              setGpsStatus('ready');
            }
          }
        );
        if (active.current) subscription.current = watch;
        else watch.remove();
      } catch {
        if (active.current) setGpsStatus('unavailable');
      }
    })();

    return () => {
      active.current = false;
      subscription.current?.remove();
    };
  }, []);

  // ── Road route via OSRM ─────────────────────────────────────────────────
  const { loading: routeLoading, error: routeError, route } = useNavigationRoute(
    location,
    destination
  );

  // ── Geofence detection ──────────────────────────────────────────────────
  const { isNearDestination, distanceKm } = useGeofence(location, destination, {
    radiusKm,
    eventTitle: event?.title || 'your destination',
  });

  // ── Auto-fit map to full route ──────────────────────────────────────────
  useEffect(() => {
    if (!map.current) return;
    if (route?.coordinates?.length > 1) {
      map.current.fitToCoordinates(route.coordinates, {
        edgePadding: { top: 90, right: 50, bottom: 220, left: 50 },
        animated: true,
      });
    } else if (location && destination) {
      map.current.fitToCoordinates([location, destination], {
        edgePadding: { top: 90, right: 50, bottom: 220, left: 50 },
        animated: true,
      });
    }
  }, [route, location, destination]);

  // ── Recenter / fit button ───────────────────────────────────────────────
  function recenter() {
    if (!map.current) return;
    if (route?.coordinates?.length > 1) {
      map.current.fitToCoordinates(route.coordinates, {
        edgePadding: { top: 90, right: 50, bottom: 220, left: 50 },
        animated: true,
      });
    } else if (location) {
      map.current.animateToRegion({ ...location, latitudeDelta: 0.015, longitudeDelta: 0.015 });
    }
  }

  // ── Route summary label ─────────────────────────────────────────────────
  const routeSummary = route
    ? `${route.distanceKm.toFixed(1)} km · ${
        route.durationMin >= 60
          ? `${Math.floor(route.durationMin / 60)} h ${route.durationMin % 60} min`
          : `${route.durationMin} min`
      } by car`
    : null;

  // ── Error / empty states ────────────────────────────────────────────────
  if (gpsStatus === 'denied') {
    return (
      <View style={styles.screen}>
        <NavHeader title={event?.title ?? 'Navigation'} onBack={onBack} />
        <View style={styles.centered}>
          <Ionicons name="location-outline" size={48} color={colors.muted} />
          <Text style={styles.stateTitle}>Location access required</Text>
          <Copy>Please enable location permission in your device settings to use navigation.</Copy>
        </View>
      </View>
    );
  }

  if (gpsStatus === 'unavailable') {
    return (
      <View style={styles.screen}>
        <NavHeader title={event?.title ?? 'Navigation'} onBack={onBack} />
        <View style={styles.centered}>
          <Ionicons name="warning-outline" size={48} color={colors.muted} />
          <Text style={styles.stateTitle}>GPS unavailable</Text>
          <Copy>Please enable location services on your device.</Copy>
        </View>
      </View>
    );
  }

  if (!destination) {
    return (
      <View style={styles.screen}>
        <NavHeader title={event?.title ?? 'Navigation'} onBack={onBack} />
        <View style={styles.centered}>
          <Ionicons name="map-outline" size={48} color={colors.muted} />
          <Text style={styles.stateTitle}>No map coordinates</Text>
          <Copy>This event does not have a pinned location yet.</Copy>
        </View>
      </View>
    );
  }

  // ── Map region (while GPS is loading) ──────────────────────────────────
  const initialRegion = location
    ? { ...midpoint(location, destination), ...spanDelta(location, destination) }
    : { ...destination, latitudeDelta: 0.05, longitudeDelta: 0.05 };

  return (
    <View style={styles.screen}>
      <NavHeader title={event?.title ?? 'Navigation'} onBack={onBack} />

      {/* ── Map area ── */}
      <View style={styles.mapContainer}>
        {gpsStatus === 'loading' && !location ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.action} />
            <Text style={styles.loadingText}>Acquiring GPS location…</Text>
          </View>
        ) : (
          <MapView
            ref={map}
            style={styles.map}
            initialRegion={initialRegion}
            showsCompass
            showsScale
            showsUserLocation={false}  // we render our own marker for full control
          >
            {/* ── Geofence: red shaded circle around destination ── */}
            <Circle
              center={destination}
              radius={radiusKm * 1000}
              fillColor={GEOFENCE_FILL}
              strokeColor={GEOFENCE_STROKE}
              strokeWidth={2.5}
              zIndex={1}
            />

            {/* ── Road route polyline (actual streets, not straight line) ── */}
            {route?.coordinates?.length > 1 && (
              <>
                {/* White border for visibility on light + dark tiles */}
                <Polyline
                  coordinates={route.coordinates}
                  strokeColor="rgba(255,255,255,0.7)"
                  strokeWidth={9}
                  lineCap="round"
                  lineJoin="round"
                  zIndex={2}
                />
                {/* Blue route line */}
                <Polyline
                  coordinates={route.coordinates}
                  strokeColor={ROUTE_COLOR}
                  strokeWidth={5}
                  lineDashPattern={null}
                  lineCap="round"
                  lineJoin="round"
                  zIndex={3}
                />
              </>
            )}

            {/* ── Destination marker (red pin) ── */}
            <Marker
              coordinate={destination}
              title={event?.venue ?? 'Destination'}
              description={event?.city ? `${event.venue}, ${event.city}` : undefined}
              pinColor="#DC2626"
              zIndex={5}
            />

            {/* ── User location marker (blue pin) ── */}
            {location && (
              <Marker
                coordinate={location}
                title="You are here"
                pinColor={ROUTE_COLOR}
                zIndex={5}
              />
            )}
          </MapView>
        )}

        {/* ── Recenter / fit button ── */}
        {location && (
          <Pressable
            style={styles.recenterBtn}
            onPress={recenter}
            accessibilityRole="button"
            accessibilityLabel="Fit route on screen"
          >
            <Ionicons name="locate" size={22} color={colors.purpleDark} />
          </Pressable>
        )}
      </View>

      {/* ── Info panel ── */}
      <ScrollView
        style={styles.panelScroll}
        contentContainerStyle={styles.panel}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Proximity / geofence alert */}
        {isNearDestination && (
          <View style={styles.proximityBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.proximityText}>You are near your destination!</Text>
          </View>
        )}

        {/* Route status */}
        {routeLoading && (
          <View style={styles.infoRow}>
            <ActivityIndicator size="small" color={colors.action} />
            <Text style={styles.infoText}>Calculating road route…</Text>
          </View>
        )}
        {routeError && !routeLoading && (
          <View style={styles.infoRow}>
            <Ionicons name="alert-circle-outline" size={18} color="#B42332" />
            <Text style={[styles.infoText, styles.errorText]}>
              Road route unavailable — check your connection.
            </Text>
          </View>
        )}
        {routeSummary && !routeLoading && (
          <View style={styles.infoRow}>
            <Ionicons name="car-outline" size={18} color={colors.ink} />
            <Text style={styles.routeText}>{routeSummary}</Text>
          </View>
        )}

        {/* Live distance readout */}
        {distanceKm !== null && (
          <View style={styles.infoRow}>
            <Ionicons name="navigate-outline" size={18} color={colors.purpleDark} />
            <Text style={styles.infoText}>
              {distanceKm < 1
                ? `${Math.round(distanceKm * 1000)} m to destination`
                : `${distanceKm.toFixed(2)} km to destination`}
            </Text>
          </View>
        )}

        {/* Radius selector */}
        <View style={styles.radiusRow}>
          <Text style={styles.radiusLabel}>Proximity alert radius:</Text>
          <View style={styles.radiusChips}>
            {RADIUS_OPTIONS_KM.map((r) => (
              <Pressable
                key={r}
                style={[styles.chip, radiusKm === r && styles.chipActive]}
                onPress={() => setRadiusKm(r)}
                accessibilityRole="button"
                accessibilityLabel={`Set radius to ${r >= 1 ? `${r} km` : `${r * 1000} m`}`}
                accessibilityState={{ selected: radiusKm === r }}
              >
                <Text style={[styles.chipText, radiusKm === r && styles.chipTextActive]}>
                  {r >= 1 ? `${r} km` : `${r * 1000} m`}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <LegendItem color={ROUTE_COLOR} label="Road route" />
          <LegendItem color="#DC2626" label={`Proximity zone (${radiusKm >= 1 ? `${radiusKm} km` : `${radiusKm * 1000} m`})`} />
        </View>
      </ScrollView>
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────
function NavHeader({ title, onBack }) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack}
        style={styles.backBtn}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={24} color={colors.ink} />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={styles.headerIcon}>
        <Ionicons name="navigate" size={20} color={colors.purpleDark} />
      </View>
    </View>
  );
}

function LegendItem({ color, label }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  backBtn: {
    width: 44,
    height: 44,
    marginLeft: -8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    color: colors.ink,
    fontFamily: headingFont,
    fontSize: 19,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: 32,
    gap: 14,
  },
  stateTitle: {
    color: colors.ink,
    fontFamily: headingFont,
    fontSize: 18,
    textAlign: 'center',
  },
  loadingText: {
    color: colors.muted,
    fontSize: 15,
    marginTop: 6,
  },
  recenterBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
      android: { elevation: 5 },
      default: {},
    }),
  },
  panelScroll: {
    maxHeight: 240,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  panel: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 10,
  },
  proximityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#16A34A',
  },
  proximityText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
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
  errorText: {
    color: '#B42332',
  },
  routeText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  radiusRow: {
    gap: 8,
  },
  radiusLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  radiusChips: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  chipActive: {
    borderColor: colors.action,
    backgroundColor: colors.lavender,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  chipTextActive: {
    color: colors.purpleDark,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
});

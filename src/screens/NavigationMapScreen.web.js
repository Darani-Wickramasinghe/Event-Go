import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Copy } from '../components/FlowUI';
import { tileAttribution, tileUrl } from '../components/mapTiles';
import { isMapPoint } from '../data/venueSearch';
import { colors, headingFont } from '../theme';

// ── Configurable defaults ──────────────────────────────────────────────────
const DEFAULT_RADIUS_KM = 0.5;
const RADIUS_OPTIONS_KM = [0.2, 0.5, 1.0, 2.0];
const ROUTE_COLOR = '#4285F4';
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

// ── Haversine distance (km) ────────────────────────────────────────────────
function haversineKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const sin2 =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(sin2));
}

// ── Build Leaflet HTML for the WebView ────────────────────────────────────
function buildMapHtml({ destination, tileUrlStr, tileAttr }) {
  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
  <style>
    html,body,#map { height:100%; margin:0; background:#EFEDFF; }
    .user-dot {
      width:16px; height:16px; border-radius:50%;
      background:${ROUTE_COLOR}; border:3px solid #fff;
      box-shadow:0 1px 6px rgba(0,0,0,0.4);
    }
    .dest-dot {
      width:18px; height:18px; border-radius:50%;
      background:#DC2626; border:3px solid #fff;
      box-shadow:0 1px 6px rgba(0,0,0,0.4);
    }
  </style>
</head>
<body>
<div id="map" aria-label="Navigation map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<script>
(function() {
  const send = (msg) => window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(msg));

  if (typeof L === 'undefined') { send({ type: 'error' }); return; }

  const DEST = ${JSON.stringify([destination.latitude, destination.longitude])};
  const TILE_URL = ${JSON.stringify(tileUrlStr)};
  const TILE_ATTR = ${JSON.stringify(tileAttr)};
  const ROUTE_COLOR = '${ROUTE_COLOR}';

  const map = L.map('map', { zoomControl: true }).setView(DEST, 14);
  L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);

  // ── Destination marker ──
  const destIcon = L.divIcon({ className: '', iconSize: [18,18], iconAnchor: [9,9],
    html: '<div class="dest-dot"></div>' });
  const destMarker = L.marker(DEST, { icon: destIcon, title: 'Destination', zIndexOffset: 100 }).addTo(map);
  destMarker.bindPopup('<b>Destination</b>');

  // ── Geofence circle ──
  let geofenceCircle = L.circle(DEST, {
    radius: ${DEFAULT_RADIUS_KM * 1000},
    color: 'rgba(220,38,38,0.8)',
    weight: 2.5,
    fillColor: 'rgba(220,38,38,0.12)',
    fillOpacity: 1,
    interactive: false,
  }).addTo(map);

  // ── Route polyline ──
  let routeLayer = null;
  let routeBorder = null;

  function clearRoute() {
    if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
    if (routeBorder) { map.removeLayer(routeBorder); routeBorder = null; }
  }

  function drawRoute(coords) {
    clearRoute();
    if (!coords || coords.length < 2) return;
    // White border for visibility
    routeBorder = L.polyline(coords, { color: 'rgba(255,255,255,0.75)', weight: 9,
      lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(map);
    // Blue route
    routeLayer = L.polyline(coords, { color: ROUTE_COLOR, weight: 5,
      lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(map);
  }

  async function fetchRoute(userLat, userLng) {
    try {
      const url = '${OSRM_BASE}/' + userLng + ',' + userLat + ';' + DEST[1] + ',' + DEST[0]
        + '?overview=full&geometries=geojson';
      const res = await fetch(url);
      if (!res.ok) { send({ type: 'routeError' }); return; }
      const json = await res.json();
      const route = json.routes && json.routes[0];
      if (!route || !route.geometry) { send({ type: 'routeError' }); return; }
      const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      drawRoute(coords);
      // Fit map to full route
      const allPoints = [...coords, DEST];
      map.fitBounds(L.latLngBounds(allPoints), { padding: [50, 50] });
      send({
        type: 'routeReady',
        distanceKm: Math.round(route.distance / 100) / 10,
        durationMin: Math.max(1, Math.round(route.duration / 60)),
      });
    } catch {
      send({ type: 'routeError' });
    }
  }

  // ── User location marker ──
  let userMarker = null;

  window.updateUserLocation = function(lat, lng) {
    const pos = [lat, lng];
    const userIcon = L.divIcon({ className: '', iconSize: [16,16], iconAnchor: [8,8],
      html: '<div class="user-dot"></div>' });
    if (!userMarker) {
      userMarker = L.marker(pos, { icon: userIcon, title: 'You', zIndexOffset: 200 }).addTo(map);
      userMarker.bindPopup('<b>You are here</b>');
      // Fit to both markers initially
      map.fitBounds(L.latLngBounds([pos, DEST]), { padding: [60, 60] });
      fetchRoute(lat, lng);
      send({ type: 'ready' });
    } else {
      userMarker.setLatLng(pos);
    }
  };

  window.updateGeofenceRadius = function(radiusMetres) {
    geofenceCircle.setRadius(radiusMetres);
  };

  window.recenter = function() {
    if (routeLayer) {
      map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });
    } else if (userMarker) {
      map.fitBounds(L.latLngBounds([userMarker.getLatLng(), DEST]), { padding: [60, 60] });
    }
  };

  send({ type: 'mapReady' });
})();
</script>
</body>
</html>`;
}

// ── Main web NavigationMapScreen ──────────────────────────────────────────
export default function NavigationMapScreen({ event, onBack }) {
  const webView = useRef(null);
  const [webReady, setWebReady] = useState(false);
  const [webFailed, setWebFailed] = useState(false);
  const [routeStatus, setRouteStatus] = useState('idle'); // idle | loading | ready | error
  const [routeInfo, setRouteInfo] = useState(null);   // { distanceKm, durationMin }
  const [userLocation, setUserLocation] = useState(null);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [isNear, setIsNear] = useState(false);
  const alertedRef = useRef(false);

  const destination =
    event?.latitude != null && event?.longitude != null
      ? { latitude: Number(event.latitude), longitude: Number(event.longitude) }
      : null;

  // ── Inject user location into WebView when it's ready ───────────────────
  useEffect(() => {
    if (!webReady || !userLocation) return;
    webView.current?.injectJavaScript(
      `window.updateUserLocation(${userLocation.latitude}, ${userLocation.longitude}); true;`
    );
  }, [webReady, userLocation]);

  // ── Inject radius updates ───────────────────────────────────────────────
  useEffect(() => {
    if (!webReady) return;
    webView.current?.injectJavaScript(
      `window.updateGeofenceRadius(${radiusKm * 1000}); true;`
    );
  }, [webReady, radiusKm]);

  // ── Geofence check on each location update ──────────────────────────────
  useEffect(() => {
    if (!userLocation || !destination) {
      setIsNear(false);
      return;
    }
    const dist = haversineKm(userLocation, destination);
    const inside = dist !== null && dist <= radiusKm;
    setIsNear(inside);

    if (inside && !alertedRef.current) {
      alertedRef.current = true;
      // Web-safe alert
      window.alert?.(`You are near ${event?.title ?? 'your destination'}!`);
    }
    if (!inside) alertedRef.current = false;
  }, [userLocation, destination, radiusKm, event?.title]);

  // ── Simulate GPS via browser Geolocation API ────────────────────────────
  // (On web, expo-location won't work — we use browser's geolocation API injected in HTML,
  //  or we simulate via a watchId. Here we use navigator.geolocation if available.)
  useEffect(() => {
    if (!navigator?.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setRouteStatus((s) => s === 'idle' ? 'loading' : s);
      },
      () => { /* GPS unavailable on web — route will not show */ },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // ── Distance label ──────────────────────────────────────────────────────
  const distanceKm = userLocation && destination ? haversineKm(userLocation, destination) : null;

  // ── WebView message handler ──────────────────────────────────────────────
  function handleMessage({ nativeEvent }) {
    let msg;
    try { msg = JSON.parse(nativeEvent.data); } catch { return; }
    if (msg.type === 'mapReady') { /* Leaflet init complete */ }
    if (msg.type === 'ready') { setWebReady(true); setRouteStatus('loading'); }
    if (msg.type === 'routeReady') {
      setRouteStatus('ready');
      setRouteInfo({ distanceKm: msg.distanceKm, durationMin: msg.durationMin });
    }
    if (msg.type === 'routeError') setRouteStatus('error');
    if (msg.type === 'error') setWebFailed(true);
  }

  // ── Map source (built once) ─────────────────────────────────────────────
  const mapSource = useRef(null);
  if (!mapSource.current && destination) {
    mapSource.current = {
      html: buildMapHtml({ destination, tileUrlStr: tileUrl, tileAttr: tileAttribution }),
      baseUrl: 'https://eventora.local/',
    };
  }

  // ── Route summary ───────────────────────────────────────────────────────
  const routeSummary = routeInfo
    ? `${routeInfo.distanceKm.toFixed(1)} km · ${
        routeInfo.durationMin >= 60
          ? `${Math.floor(routeInfo.durationMin / 60)} h ${routeInfo.durationMin % 60} min`
          : `${routeInfo.durationMin} min`
      } by car`
    : null;

  // ── No coordinates fallback ─────────────────────────────────────────────
  if (!isMapPoint(event)) {
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

  return (
    <View style={styles.screen}>
      <NavHeader title={event?.title ?? 'Navigation'} onBack={onBack} />

      {/* ── Map WebView ── */}
      <View style={styles.mapContainer}>
        {webFailed ? (
          <View style={styles.centered}>
            <Ionicons name="warning-outline" size={40} color={colors.muted} />
            <Copy>Map unavailable. Check your connection.</Copy>
          </View>
        ) : (
          <WebView
            ref={webView}
            source={mapSource.current}
            style={styles.map}
            scrollEnabled={false}
            userAgent="Eventora/1.0 (https://github.com/Darani-Wickramasinghe/Event-Go)"
            onShouldStartLoadWithRequest={({ url }) =>
              url === 'about:blank' || url.startsWith('https://eventora.local') ||
              url.startsWith('https://unpkg.com') || url.startsWith('https://tile.openstreetmap')
              || url.startsWith('https://router.project-osrm')
            }
            onError={() => setWebFailed(true)}
            onMessage={handleMessage}
          />
        )}

        {/* Recenter button */}
        {webReady && !webFailed && (
          <Pressable
            style={styles.recenterBtn}
            onPress={() => webView.current?.injectJavaScript('window.recenter(); true;')}
            accessibilityRole="button"
            accessibilityLabel="Fit route on screen"
          >
            <Ionicons name="locate" size={22} color={colors.purpleDark} />
          </Pressable>
        )}
      </View>

      {/* ── Info panel ── */}
      <View style={styles.panel}>
        {/* Proximity alert */}
        {isNear && (
          <View style={styles.proximityBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.proximityText}>You are near your destination!</Text>
          </View>
        )}

        {/* Route status */}
        {routeStatus === 'loading' && (
          <View style={styles.infoRow}>
            <ActivityIndicator size="small" color={colors.action} />
            <Text style={styles.infoText}>Calculating road route…</Text>
          </View>
        )}
        {routeStatus === 'error' && (
          <View style={styles.infoRow}>
            <Ionicons name="alert-circle-outline" size={18} color="#B42332" />
            <Text style={[styles.infoText, { color: '#B42332' }]}>Route unavailable — check connection.</Text>
          </View>
        )}
        {routeSummary && routeStatus === 'ready' && (
          <View style={styles.infoRow}>
            <Ionicons name="car-outline" size={18} color={colors.ink} />
            <Text style={styles.routeText}>{routeSummary}</Text>
          </View>
        )}
        {!userLocation && (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color={colors.muted} />
            <Text style={styles.infoText}>Allow location access to see route.</Text>
          </View>
        )}

        {/* Distance */}
        {distanceKm !== null && (
          <View style={styles.infoRow}>
            <Ionicons name="navigate-outline" size={18} color={colors.purpleDark} />
            <Text style={styles.infoText}>
              {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(2)} km`} to destination
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
                accessibilityLabel={`${r >= 1 ? `${r} km` : `${r * 1000} m`} radius`}
                accessibilityState={{ selected: radiusKm === r }}
              >
                <Text style={[styles.chipText, radiusKm === r && styles.chipTextActive]}>
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

function NavHeader({ title, onBack }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
        <Ionicons name="arrow-back" size={24} color={colors.ink} />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={styles.headerIcon}>
        <Ionicons name="navigate" size={20} color={colors.purpleDark} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderColor: colors.line, backgroundColor: colors.white,
  },
  backBtn: { width: 44, height: 44, marginLeft: -8, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, color: colors.ink, fontFamily: headingFont, fontSize: 19 },
  headerIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.lavender, alignItems: 'center', justifyContent: 'center',
  },
  mapContainer: { flex: 1, backgroundColor: '#EFEDFF' },
  map: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 14 },
  stateTitle: { color: colors.ink, fontFamily: headingFont, fontSize: 18, textAlign: 'center' },
  recenterBtn: {
    position: 'absolute', bottom: 16, right: 16,
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
  },
  panel: {
    paddingHorizontal: 18, paddingVertical: 14,
    backgroundColor: colors.white, borderTopWidth: 1, borderColor: colors.line, gap: 10,
  },
  proximityBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 10, backgroundColor: '#16A34A',
  },
  proximityText: { color: '#fff', fontSize: 14, fontWeight: '700', flex: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { color: colors.muted, fontSize: 14, flex: 1 },
  routeText: { color: colors.ink, fontSize: 15, fontWeight: '700', flex: 1 },
  radiusRow: { gap: 8 },
  radiusLabel: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  radiusChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 13, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white,
  },
  chipActive: { borderColor: colors.action, backgroundColor: colors.lavender },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  chipTextActive: { color: colors.purpleDark },
});

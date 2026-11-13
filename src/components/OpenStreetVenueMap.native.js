import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Copy } from './FlowUI';
import { tileAttribution, tileUrl } from './mapTiles';

function mapHtml(center) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
    <style>html,body,#map{height:100%;margin:0;background:#EFEDFF}</style></head>
    <body><div id="map" aria-label="Choose venue on map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
    <script>
      const send = (message) => window.ReactNativeWebView.postMessage(JSON.stringify(message));
      if (typeof L === 'undefined') {
        send({ type: 'error' });
      } else {
        const map = L.map('map').setView(${JSON.stringify([center.latitude, center.longitude])}, 15);
        L.tileLayer(${JSON.stringify(tileUrl).replace(/</g, '\\u003c')}, {
          attribution: ${JSON.stringify(tileAttribution)}, maxZoom: 19
        }).addTo(map);
        let marker;
        window.setVenuePin = (point) => {
          if (marker) marker.remove();
          if (point) marker = L.circleMarker(point, {
            radius: 8, color: '#fff', weight: 3, fillColor: '#5145E5', fillOpacity: 1, interactive: false
          }).addTo(map);
        };
        window.centerVenueMap = (point) => map.setView(point, 15);
        map.on('click', ({ latlng }) => send({ type: 'pick', latitude: latlng.lat, longitude: latlng.lng }));
        send({ type: 'ready' });
      }
    </script></body></html>`;
}

export default function OpenStreetVenueMap({ center, pin, onPick }) {
  const webView = useRef(null);
  const [source] = useState(() => ({ html: mapHtml(center), baseUrl: 'https://eventora.local/' }));
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (ready) webView.current?.injectJavaScript(`window.centerVenueMap(${JSON.stringify([center.latitude, center.longitude])}); true;`);
  }, [ready, center]);

  useEffect(() => {
    if (ready) webView.current?.injectJavaScript(`window.setVenuePin(${JSON.stringify(pin ? [pin.latitude, pin.longitude] : null)}); true;`);
  }, [ready, pin]);

  return (
    <View style={styles.frame}>
      {failed ? <View style={styles.error}><Copy>Map unavailable. You can still choose a search result.</Copy></View> : (
        <WebView ref={webView} source={source} style={styles.map} scrollEnabled={false}
          userAgent="Eventora/1.0 (https://github.com/Darani-Wickramasinghe/Event-Go)"
          onShouldStartLoadWithRequest={({ url }) => url === 'about:blank' || url === 'https://eventora.local/'}
          onError={() => setFailed(true)} onMessage={({ nativeEvent }) => {
            let message;
            try { message = JSON.parse(nativeEvent.data); } catch { return; }
            if (message.type === 'ready') setReady(true);
            if (message.type === 'error') setFailed(true);
            if (message.type === 'pick') onPick({ latitude: message.latitude, longitude: message.longitude });
          }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 310, borderRadius: 16, overflow: 'hidden', backgroundColor: '#EFEDFF' },
  map: { flex: 1, backgroundColor: '#EFEDFF' },
  error: { flex: 1, justifyContent: 'center', padding: 18 },
});

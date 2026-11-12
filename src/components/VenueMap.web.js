import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

export default function VenueMap({ events, center, location, follow, onPan, onBounds, onOpen }) {
  const container = useRef(null);
  const map = useRef(null);
  const pins = useRef(null);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    const instance = L.map(container.current, { scrollWheelZoom: false }).setView([center.latitude, center.longitude], 11);
    L.tileLayer(process.env.EXPO_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(instance);
    const publishBounds = () => {
      const bounds = instance.getBounds();
      onBounds({ south: bounds.getSouth(), north: bounds.getNorth(), west: bounds.getWest(), east: bounds.getEast() });
    };
    instance.on('moveend', publishBounds);
    instance.on('dragstart boxzoomstart', onPan);
    pins.current = L.layerGroup().addTo(instance);
    map.current = instance;
    publishBounds();
    return () => instance.remove();
  }, []);

  useEffect(() => {
    map.current.setView([center.latitude, center.longitude], 11);
  }, [center]);

  useEffect(() => {
    if (follow && location) map.current.setView([location.latitude, location.longitude]);
  }, [follow, location]);

  useEffect(() => {
    pins.current.clearLayers();
    for (const event of events) {
      const icon = L.divIcon({
        className: '', iconSize: [30, 30], iconAnchor: [15, 15],
        html: '<span style="display:block;width:26px;height:26px;border-radius:50%;background:#5145E5;border:2px solid white;box-shadow:0 1px 5px #3336"></span>',
      });
      const marker = L.marker([event.latitude, event.longitude], { icon, title: event.title, alt: event.title });
      marker.addTo(pins.current).on('click', () => onOpenRef.current(event));
      marker.getElement()?.setAttribute('aria-label', event.title);
    }
    if (location) L.circleMarker([location.latitude, location.longitude], { radius: 8, color: '#007BBA', fillOpacity: 0.9 }).addTo(pins.current);
  }, [events, location]);

  return <div ref={container} role="region" aria-label="Map of event venues" style={{ height: 310, borderRadius: 16, background: '#EFEDFF' }} />;
}

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import { tileAttribution, tileUrl } from './mapTiles';

export default function VenueMap({ events = [], center, location, follow, onPan, onBounds, onOpen, onPick, pin }) {
  const container = useRef(null);
  const map = useRef(null);
  const pins = useRef(null);
  const onOpenRef = useRef(onOpen);
  const onPickRef = useRef(onPick);
  onOpenRef.current = onOpen;
  onPickRef.current = onPick;
  const zoom = onPick ? 15 : 11;

  useEffect(() => {
    const instance = L.map(container.current, { scrollWheelZoom: false }).setView([center.latitude, center.longitude], zoom);
    L.tileLayer(tileUrl, {
      attribution: tileAttribution,
      maxZoom: 19,
    }).addTo(instance);
    const publishBounds = () => {
      const bounds = instance.getBounds();
      onBounds?.({ south: bounds.getSouth(), north: bounds.getNorth(), west: bounds.getWest(), east: bounds.getEast() });
    };
    instance.on('moveend', publishBounds);
    if (onPan) instance.on('dragstart boxzoomstart', onPan);
    instance.on('click', ({ latlng }) => onPickRef.current?.({ latitude: latlng.lat, longitude: latlng.lng }));
    pins.current = L.layerGroup().addTo(instance);
    map.current = instance;
    publishBounds();
    return () => instance.remove();
  }, []);

  useEffect(() => {
    map.current.setView([center.latitude, center.longitude], zoom);
  }, [center, zoom]);

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
    if (pin) L.circleMarker([pin.latitude, pin.longitude], { radius: 8, color: '#FFFFFF', weight: 3, fillColor: '#5145E5', fillOpacity: 1, interactive: false }).addTo(pins.current);
  }, [events, location, pin]);

  return <div ref={container} role="region" aria-label={onPick ? 'Choose venue on map' : 'Map of event venues'} style={{ height: 310, borderRadius: 16, background: '#EFEDFF' }} />;
}

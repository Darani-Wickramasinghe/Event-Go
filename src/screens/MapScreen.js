import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Action, Copy, Field, Page } from '../components/FlowUI';
import VenueMap from '../components/VenueMap';

const defaultCenter = { latitude: 6.97, longitude: 79.92 };

export default function MapScreen({ events, renderEvent, onOpen, city: homeCity }) {
  const [query, setQuery] = useState(homeCity);
  const [city, setCity] = useState(homeCity);
  const [center, setCenter] = useState(() => {
    const match = events.find((event) => event.city.toLowerCase() === homeCity.toLowerCase() && Number.isFinite(event.latitude));
    return match ? { latitude: match.latitude, longitude: match.longitude } : defaultCenter;
  });
  const [location, setLocation] = useState(null);
  const [follow, setFollow] = useState(false);
  const [bounds, setBounds] = useState(null);
  const [area, setArea] = useState(null);
  const [message, setMessage] = useState('');
  const [locating, setLocating] = useState(false);
  const subscription = useRef(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; subscription.current?.remove(); };
  }, []);

  const pins = useMemo(() => events.filter((event) => Number.isFinite(event.latitude) && Number.isFinite(event.longitude)), [events]);
  const matches = events.filter((event) => area
    ? event.latitude >= area.south && event.latitude <= area.north && event.longitude >= area.west && event.longitude <= area.east && Number.isFinite(event.latitude)
    : event.city.toLowerCase().includes(city.toLowerCase()));

  function searchCity() {
    const next = query.trim();
    const match = pins.find((event) => event.city.toLowerCase().includes(next.toLowerCase()));
    setCity(next);
    setArea(null);
    setFollow(false);
    if (match) setCenter({ latitude: match.latitude, longitude: match.longitude });
  }

  async function locate() {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        if (active.current) setMessage('Location access is off. Search for a city to explore manually.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (!active.current) return;
      setLocation(position.coords);
      setFollow(true);
      setMessage('');
      if (!subscription.current) {
        const watch = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, distanceInterval: 100 }, ({ coords }) => {
          if (active.current) setLocation(coords);
        });
        if (active.current) subscription.current = watch;
        else watch.remove();
      }
    } catch {
      if (active.current) setMessage('Your location could not be found. You can still search by city.');
    } finally {
      if (active.current) setLocating(false);
    }
  }

  return (
    <Page title="Map">
      <Field label="Search city" value={query} onChangeText={setQuery} onSubmitEditing={searchCity} returnKeyType="search" placeholder="Any city" />
      <Action label="Find city" secondary onPress={searchCity} />
      <VenueMap events={pins} center={center} location={location} follow={follow} onPan={() => setFollow(false)} onBounds={setBounds} onOpen={onOpen} />
      <Action label="Search this area" onPress={() => setArea(bounds)} disabled={!bounds} />
      <Action label={locating ? 'Finding location…' : follow ? 'Following my location' : location ? 'Back to my location' : 'Use my location'} secondary onPress={locate} disabled={locating || follow} />
      {!!message && <Copy alert>{message}</Copy>}
      <Copy>{area ? 'Events in this map area' : city ? `Events matching ${city}` : 'All venues'} · {matches.length}</Copy>
      {matches.length === 0 && <Copy>No events found here. Try another city or move the map.</Copy>}
      {matches.map((event) => renderEvent(event, true))}
    </Page>
  );
}

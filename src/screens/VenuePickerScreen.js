import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Action, Copy, Field, Page, Panel } from '../components/FlowUI';
import VenueMap from '../components/VenueMap';
import { isMapPoint, searchVenues } from '../data/venueSearch';
import { colors } from '../theme';

const defaultCenter = { latitude: 6.9271, longitude: 79.8612 };

export default function VenuePickerScreen({ venue, city, point, knownVenues, onBack, onSelect }) {
  const [query, setQuery] = useState([venue, city].filter(Boolean).join(', '));
  const [matches, setMatches] = useState([]);
  const [center, setCenter] = useState(point ?? defaultCenter);
  const [pin, setPin] = useState(point);
  const [name, setName] = useState(venue);
  const [locality, setLocality] = useState(city);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const request = useRef(null);
  useEffect(() => () => {
    const pending = request.current;
    request.current = null;
    pending?.abort();
  }, []);

  async function search() {
    if (request.current || !query.trim()) return;
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 8000);
    const words = query.trim().toLowerCase().split(/[\s,]+/).filter(Boolean);
    const local = knownVenues.filter(({ venue, city }) => words.every((word) => `${venue} ${city}`.toLowerCase().includes(word)));
    setSearching(true);
    setMatches(local);
    setMessage('');
    try {
      const results = await searchVenues(query.trim(), controller.signal);
      if (request.current !== controller) return;
      setMatches(results.length ? results : local);
      if (!results.length && !local.length) setMessage('No places found. Try adding the city, or tap the map to place a pin.');
    } catch {
      if (request.current === controller) {
        setMatches(local);
        setMessage(local.length ? 'Showing venues already in Eventora.' : 'Search is unavailable. You can still tap the map to place a pin.');
      }
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) {
        request.current = null;
        setSearching(false);
      }
    }
  }

  function pickResult(result) {
    request.current?.abort();
    request.current = null;
    setSearching(false);
    setMessage('');
    setPin(result);
    setCenter(result);
    setName(result.venue);
    if (result.city) setLocality(result.city);
    setMatches([]);
  }

  return (
    <Page title="Choose venue" onBack={onBack}>
      <Field label="Search venue or address" value={query} onChangeText={setQuery} editable={!searching}
        returnKeyType="search" onSubmitEditing={search} placeholder="e.g. Viharamahadevi Park" />
      <Action label={searching ? 'Searching…' : 'Search places'} icon="search-outline" secondary disabled={searching || !query.trim()} onPress={search} />
      {!!message && <Copy>{message}</Copy>}
      {matches.map((result, index) => (
        <Pressable key={`${result.venue}-${result.latitude}-${result.longitude}-${index}`} accessibilityRole="button"
          accessibilityLabel={`Select ${result.venue}`} onPress={() => pickResult(result)} style={styles.result}>
          <Text style={styles.resultTitle}>{result.venue}</Text>
          {!!(result.address || result.city) && <Copy>{result.address || result.city}</Copy>}
        </Pressable>
      ))}
      <Copy>Tap the map to place or adjust the pin.</Copy>
      <VenueMap center={center} pin={pin} onPick={(next) => { if (isMapPoint(next)) setPin(next); }} />
      <Panel title={pin ? 'Pin selected' : 'Venue details'}>
        <Field label="Venue name" value={name} onChangeText={setName} maxLength={100} />
        <Field label="City" value={locality} onChangeText={setLocality} maxLength={100} />
      </Panel>
      <Action label="Use this location" icon="checkmark" disabled={!pin || !name.trim() || !locality.trim()} onPress={() => onSelect({
        venue: name.trim(), city: locality.trim(), latitude: String(pin.latitude), longitude: String(pin.longitude),
      })} />
      <Text style={styles.credit}>Place search by Photon · © OpenStreetMap contributors</Text>
    </Page>
  );
}

const styles = StyleSheet.create({
  result: { minHeight: 48, paddingVertical: 9, gap: 3, borderBottomWidth: 1, borderColor: colors.line },
  resultTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  credit: { color: colors.muted, fontSize: 12 },
});

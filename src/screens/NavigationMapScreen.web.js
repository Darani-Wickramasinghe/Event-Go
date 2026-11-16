import { useState } from 'react';
import { Action, Copy, EmptyState, Page, Panel } from '../components/FlowUI';
import VenueMap from '../components/VenueMap';
import { isMapPoint } from '../data/venueSearch';
import { openDirections } from '../services/openDirections';

export default function NavigationMapScreen({ event, onBack }) {
  const [error, setError] = useState('');

  async function navigate() {
    setError('');
    const result = await openDirections({ destination: event });
    if (!result.ok) setError('Directions could not be opened. Try searching for the venue in your map app.');
  }

  return (
    <Page title="Navigate to venue" onBack={onBack}>
      {isMapPoint(event) ? (
        <>
          <Panel title={event.title}>
            <Copy>{[event.venue, event.city].filter(Boolean).join(', ')}</Copy>
            <VenueMap center={event} pin={event} />
            <Action label="Open directions in Google Maps" icon="navigate-outline" onPress={navigate} />
          </Panel>
          {!!error && <Copy alert>{error}</Copy>}
        </>
      ) : <EmptyState icon="location-outline" title="Venue location unavailable"
        description="This event has no map coordinates." />}
    </Page>
  );
}

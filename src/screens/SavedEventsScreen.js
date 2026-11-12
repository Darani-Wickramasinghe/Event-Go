import { useState } from 'react';
import { Action, Choices, Copy, Field, Page, Panel } from '../components/FlowUI';
import { filterEvents, defaultFilters } from '../data/eventFilters';

export default function SavedEventsScreen({ events, renderEvent, onBack, onBrowse }) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('Recently saved');
  const matches = filterEvents(events, search, 'All', defaultFilters);
  if (sort === 'Event date') matches.sort((first, second) => first.startDate.localeCompare(second.startDate) || first.startTime.localeCompare(second.startTime));

  return (
    <Page title="Saved Events" onBack={onBack}>
      {events.length === 0 ? (
        <Panel title="No saved events yet">
          <Copy>Bookmark an event to find it here later.</Copy>
          <Action label="Browse events" onPress={onBrowse} />
        </Panel>
      ) : (
        <>
          <Field label="Search saved events" value={search} onChangeText={setSearch} placeholder="Event, city or venue" />
          <Choices label="Sort by" options={['Recently saved', 'Event date']} selected={[sort]} onSelect={setSort} />
          <Copy>{matches.length} {matches.length === 1 ? 'saved event' : 'saved events'}</Copy>
          {matches.map((event) => renderEvent(event, true))}
          {matches.length === 0 && <Copy>No saved events match your search.</Copy>}
        </>
      )}
    </Page>
  );
}

// Summarizes events and reservations for the organizer dashboard.
import { eventTime } from './reservations.js';
import { organizerEventCounts, publicEventStatuses } from './organizerEvents.js';

export function buildOrganizerOverview(events, bookings, now = Date.now()) {
  const counts = organizerEventCounts(events, bookings);
  const listed = events.filter((event) => publicEventStatuses.includes(event.status) && eventTime(event, event.endTime) > now);
  const drafts = events.filter((event) => event.status === 'Draft');
  const upcoming = listed.filter((event) => eventTime(event) > now)
    .sort((first, second) => eventTime(first) - eventTime(second));
  const totals = { published: listed.length, drafts: drafts.length, registrations: 0, checkedIn: 0 };
  for (const eventCounts of counts.values()) {
    totals.registrations += eventCounts.registrations;
    totals.checkedIn += eventCounts.checkedIn;
  }

  return {
    totals,
    counts,
    upcoming,
    shareableEvent: upcoming[0] ?? listed[0],
    nearCapacity: upcoming.filter((event) => event.capacity > 0 && counts.get(event.id).places / event.capacity >= 0.9),
    expiredDrafts: drafts.filter((event) => eventTime(event, event.endTime) <= now).length,
  };
}

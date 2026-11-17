// Filters and sorts organizer events and calculates their booking totals.
import { eventTime } from './reservations.js';

export const publicEventStatuses = ['Published', 'Rescheduled', 'Closed'];
export const organizerEventFilters = ['All', 'Published', 'Drafts', 'Completed', 'Cancelled', 'Archived'];
export const organizerEventSorts = ['Upcoming first', 'Event name'];

export function organizerEventStatus(event, now = Date.now()) {
  return publicEventStatuses.includes(event.status) && eventTime(event, event.endTime) <= now
    ? 'Completed'
    : event.status;
}

export function canCheckInOrganizerEvent(event, now = Date.now()) {
  return publicEventStatuses.includes(organizerEventStatus(event, now));
}

export function matchesOrganizerEventFilter(event, filter, now) {
  if (filter === 'All') return true;
  if (filter === 'Published') return publicEventStatuses.includes(event.status);
  if (filter === 'Drafts') return event.status === 'Draft';
  return organizerEventStatus(event, now) === filter;
}

export function organizerEventResults(events, { filter, query, sort }, now = Date.now()) {
  const term = query.trim().toLowerCase();
  const results = events.filter((event) => matchesOrganizerEventFilter(event, filter, now)
    && event.title.toLowerCase().includes(term));
  if (sort === 'Event name') return results.sort((first, second) => first.title.localeCompare(second.title, 'en-LK'));

  const schedule = results.map((event) => ({ event, start: eventTime(event) }));
  return schedule.sort((first, second) => {
    if (!Number.isFinite(first.start)) return Number.isFinite(second.start) ? 1 : 0;
    if (!Number.isFinite(second.start)) return -1;
    if (first.start >= now && second.start >= now) return first.start - second.start;
    return second.start - first.start;
  }).map(({ event }) => event);
}

export function organizerEventCounts(events, bookings) {
  const counts = new Map(events.map(({ id }) => [id, { registrations: 0, places: 0, checkedIn: 0 }]));
  for (const booking of bookings) {
    const eventCounts = counts.get(booking.eventId);
    if (!eventCounts || booking.status !== 'Confirmed') continue;
    eventCounts.registrations += 1;
    eventCounts.places += booking.tickets.length;
    eventCounts.checkedIn += booking.tickets.filter((ticket) => !!ticket.checkedInAt).length;
  }
  return counts;
}

export function registrationLabel(count) {
  return `${count} ${count === 1 ? 'registration' : 'registrations'}`;
}

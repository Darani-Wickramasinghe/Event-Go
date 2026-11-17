// Builds the event change notices and reminders used by the Member 5 demo.
import { BOOKING_STATUS, EVENT_STATUS, NOTICE_TYPE } from './contract.js';

const HOUR = 60 * 60 * 1000;

function overlaps(first, second) {
  return new Date(first.start) < new Date(second.end) && new Date(second.start) < new Date(first.end);
}

// Which kind of change happened? (null = nothing attendees must hear about)
function changeOf(before, after) {
  if (before.status !== EVENT_STATUS.CANCELLED && after.status === EVENT_STATUS.CANCELLED) {
    return { type: NOTICE_TYPE.EVENT_CANCELLED, key: 'cancelled', text: `${after.title} has been cancelled.` };
  }
  if (before.start !== after.start || before.end !== after.end) {
    return {
      type: NOTICE_TYPE.EVENT_RESCHEDULED,
      key: after.start,
      text: `${after.title} has a new time: ${new Date(after.start).toUTCString()}.`,
    };
  }
  if (before.venue !== after.venue) {
    return { type: NOTICE_TYPE.VENUE_CHANGED, key: after.venue, text: `${after.title} moved to ${after.venue}.` };
  }
  return null;
}

// One notification per confirmed booking. Running it twice adds nothing new.
export function buildEventChangeNotices({ before, after, bookings, existing = [], now = new Date() }) {
  const change = changeOf(before, after);
  if (!change) return [];
  const known = new Set(existing.map((item) => item.id));

  return bookings
    .filter((item) => item.eventId === after.id && item.status === BOOKING_STATUS.CONFIRMED)
    .map((item) => ({
      id: `${change.type}-${item.id}-${change.key}`,
      userId: item.userId,
      bookingId: item.id,
      eventId: after.id,
      type: change.type,
      message: change.text,
      read: false,
      createdAt: now.toISOString(),
    }))
    .filter((item) => !known.has(item.id));
}

// Reminders: due when we are inside the chosen window before the event starts.
// IDs start with "reminder-" because App.js already uses that prefix.
export function buildReminders({ events, bookings, prefs, existing = [], now = new Date() }) {
  if (!prefs?.reminderHours) return [];
  const known = new Set(existing.map((item) => item.id));
  const out = [];

  for (const booking of bookings) {
    if (booking.status !== BOOKING_STATUS.CONFIRMED) continue;
    const event = events.find((item) => item.id === booking.eventId);
    if (!event || event.status === EVENT_STATUS.CANCELLED) continue;
    const start = new Date(event.start).getTime();
    const opensAt = start - prefs.reminderHours * HOUR;
    if (now.getTime() < opensAt || now.getTime() >= start) continue;

    const id = `reminder-${booking.id}-${prefs.reminderHours}`;
    if (known.has(id)) continue;
    out.push({
      id,
      userId: booking.userId,
      bookingId: booking.id,
      eventId: event.id,
      type: NOTICE_TYPE.REMINDER,
      message: `${event.title} starts soon (${new Date(event.start).toUTCString()}).`,
      read: false,
      createdAt: now.toISOString(),
    });
  }
  return out;
}

// Warn if a new event overlaps something already booked. Never cancels anything.
export function findConflicts(newEvent, bookedEvents) {
  return bookedEvents.filter((item) => item.id !== newEvent.id && overlaps(item, newEvent));
}

export function markRead(notices, ids) {
  return notices.map((item) => (ids.includes(item.id) ? { ...item, read: true } : item));
}

export function unreadCount(notices) {
  return notices.filter((item) => !item.read).length;
}

import { dateRangeError } from './eventFilters';
import { formatEventDate } from './events';
import { eventTime, reservedPlaces } from './reservations';

export function eventFromDraft(draft, id, bookings) {
  const title = draft.title.trim();
  const city = draft.city.trim();
  const venue = draft.venue.trim();
  const description = draft.description.trim();
  if (!title || !city || !venue || !description) throw new Error('Enter the title, city, venue, and description.');
  if (!draft.startDate || dateRangeError(draft.startDate, '')) throw new Error('Enter a date in YYYY-MM-DD format.');
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!timePattern.test(draft.startTime) || !timePattern.test(draft.endTime) || draft.startTime >= draft.endTime) {
    throw new Error('Enter an end time after the start time, using HH:MM on the same day.');
  }
  const capacity = draft.capacity === '' ? null : Number(draft.capacity);
  if (capacity !== null && (!Number.isSafeInteger(capacity) || capacity < 1)) throw new Error('Enter a whole capacity above zero or leave it blank.');
  if (capacity !== null && capacity < reservedPlaces({ id }, bookings)) throw new Error('Capacity cannot be lower than the number of reserved places.');
  const price = Number(draft.price);
  if (!Number.isSafeInteger(price) || price < 0) throw new Error('Enter a whole price in LKR, or 0 for free admission.');
  const latitude = draft.latitude === '' ? null : Number(draft.latitude);
  const longitude = draft.longitude === '' ? null : Number(draft.longitude);
  if ((latitude === null) !== (longitude === null)
    || (latitude !== null && (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180))) {
    throw new Error('Enter both valid coordinates, or leave both blank.');
  }
  return {
    id, title, city, venue, description, capacity, price, latitude, longitude,
    coverImage: draft.coverImage ?? null,
    eligibility: draft.eligibility?.trim() ?? '', accessibility: draft.accessibility?.trim() ?? '',
    category: draft.category, setting: draft.setting, startDate: draft.startDate, startTime: draft.startTime, endTime: draft.endTime,
    day: draft.startDate.slice(8), date: formatEventDate(draft.startDate, draft.startTime),
  };
}

export function changeEventStatus(data, event, status, reason, now = Date.now()) {
  if (status === 'Archived') reason = event.reason ?? '';
  if (status === 'Published' && eventTime(event, event.endTime) <= now) throw new Error('Set a future schedule before publishing.');
  if (['Cancelled', 'Rejected'].includes(status) && !reason.trim()) throw new Error('Enter a reason for this change.');
  const eventEdits = { ...data.eventEdits, [event.id]: { ...data.eventEdits[event.id], status, reason: reason.trim() } };
  const affected = data.bookings.some((booking) => booking.eventId === event.id && booking.status === 'Confirmed');
  const bookings = status === 'Cancelled'
    ? data.bookings.map((booking) => booking.eventId === event.id && booking.status === 'Confirmed' ? { ...booking, status: 'Cancelled' } : booking)
    : data.bookings;
  const notifications = affected && status === 'Cancelled'
    ? [{ id: `${event.id}-${now}`, eventId: event.id, title: `${event.title} was cancelled`, message: reason.trim(), read: false }, ...data.notifications]
    : data.notifications;
  return {
    ...data, bookings, eventEdits, notifications,
    audit: [`${event.title} · ${status}${reason ? ` · ${reason.trim()}` : ''}`, ...data.audit],
  };
}

import { bookingStatus, sriLankaDate } from './reservations';

export function agendaEntries(bookings, events) {
  const today = sriLankaDate();
  return bookings.flatMap((booking) => {
    const event = events.find((item) => item.id === booking.eventId);
    if (!event) return [];
    const status = bookingStatus(event, booking);
    const past = status === 'Attended' || status === 'Past registration';
    const period = status === 'Cancelled' ? 'Cancelled' : past ? 'Past' : event.startDate === today ? 'Today' : 'Upcoming';
    return [{ booking, event, status, period }];
  }).sort((first, second) => `${first.event.startDate}T${first.event.startTime}`.localeCompare(`${second.event.startDate}T${second.event.startTime}`));
}

export function shiftMonth(month, offset) {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

export function monthDays(month) {
  const start = new Date(`${month}-01T12:00:00Z`);
  const next = new Date(`${shiftMonth(month, 1)}-01T12:00:00Z`);
  const length = (next - start) / 86400000;
  return [
    ...Array(start.getUTCDay()).fill(null),
    ...Array.from({ length }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`),
  ];
}

export function formatCalendarDate(date, options) {
  return new Intl.DateTimeFormat('en-LK', { ...options, timeZone: 'UTC' })
    .format(new Date(`${date}T12:00:00Z`));
}

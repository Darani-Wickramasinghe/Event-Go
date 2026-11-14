export const bookingLimit = 4;

export function eventTime(event, time = event.startTime) {
  return new Date(`${event.startDate}T${time}:00+05:30`).getTime();
}

export function sriLankaDate(now = Date.now()) {
  return new Date(now + 330 * 60000).toISOString().slice(0, 10);
}

export function reservedPlaces(event, bookings) {
  return bookings
    .filter((booking) => booking.eventId === event.id && booking.status === 'Confirmed')
    .reduce((total, booking) => total + booking.tickets.length, 0);
}

export function remainingPlaces(event, bookings) {
  return event.capacity === null ? null : event.capacity - reservedPlaces(event, bookings);
}

export function registrationStatus(event, bookings, now = Date.now()) {
  if (event.status === 'Archived') return 'Event archived';
  if (event.status === 'Cancelled') return 'Event cancelled';
  if (event.status === 'Draft' || event.status === 'Submitted' || event.status === 'Rejected') return 'Event unavailable';
  if (eventTime(event, event.endTime) <= now) return 'Event ended';
  if (event.status === 'Closed' || (event.registrationDeadline ?? eventTime(event)) <= now) return 'Registration closed';
  if (event.registrationOpens > now) return 'Registration has not opened';
  if (remainingPlaces(event, bookings) === 0) return 'Sold out';
  return '';
}

export function makeReservation(event, bookings, names, id, codes, now = Date.now()) {
  const existing = bookings.find((item) => item.id === id);
  if (existing) return existing;
  if (event.price !== 0) throw new Error('This event only offers a paid ticket preview.');
  if (bookings.some((item) => item.eventId === event.id && item.status === 'Confirmed')) {
    throw new Error('You already have a reservation for this event.');
  }
  const unavailable = registrationStatus(event, bookings, now);
  if (unavailable) throw new Error(unavailable);
  if (names.length < 1 || names.length > bookingLimit || names.some((name) => !name.trim())) {
    throw new Error(`Enter an attendee name for each of your 1–${bookingLimit} places.`);
  }
  const remaining = remainingPlaces(event, bookings);
  if (remaining !== null && names.length > remaining) {
    throw new Error(`Only ${remaining} places remain. Choose a smaller quantity.`);
  }
  return {
    id, eventId: event.id, status: 'Confirmed', createdAt: now,
    tickets: names.map((name, index) => ({ name: name.trim(), code: codes[index], checkedInAt: null })),
  };
}

export function cancellationReason(event, booking, now = Date.now()) {
  if (booking.status !== 'Confirmed') return 'This reservation is cancelled.';
  if (booking.tickets.some((ticket) => ticket.checkedInAt)) return 'A ticket has already been checked in.';
  if ((event.cancellationDeadline ?? eventTime(event)) <= now) return 'The cancellation deadline has passed.';
  return '';
}

export function scanTicket(event, bookings, code, now = Date.now()) {
  const booking = bookings.find((item) => item.tickets.some((ticket) => ticket.code === code));
  if (!booking) throw new Error('Ticket code was not found.');
  if (booking.eventId !== event.id) throw new Error('This ticket is for another event.');
  if (booking.status === 'Cancelled' || event.status === 'Cancelled') throw new Error('This ticket was cancelled.');
  const ticket = booking.tickets.find((item) => item.code === code);
  if (ticket.checkedInAt) throw new Error('This ticket has already been used.');
  if (eventTime(event, event.endTime) <= now) throw new Error('This event has ended.');
  return { ...booking, tickets: booking.tickets.map((item) => item.code === code ? { ...item, checkedInAt: now } : item) };
}

export function bookingStatus(event, booking, now = Date.now()) {
  if (booking.status === 'Cancelled' || event.status === 'Cancelled') return 'Cancelled';
  const checkedIn = booking.tickets.some((ticket) => ticket.checkedInAt);
  if (eventTime(event, event.endTime) <= now) return checkedIn ? 'Attended' : 'Past registration';
  if (checkedIn) return 'Checked in';
  return event.status === 'Rescheduled' || event.rescheduled ? 'Rescheduled' : 'Confirmed';
}

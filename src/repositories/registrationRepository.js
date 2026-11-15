import { getDatabaseCache, mutateDatabaseState } from '../config/database.js';
import { createRegistrationEntity, MAX_BOOKING_LIMIT, REGISTRATION_STATUS } from '../models/registrationModel.js';
import { createTicketEntity } from '../models/ticketModel.js';
import { getEventById } from './eventRepository.js';

export function calculateReservedPlaces(eventId) {
  const db = getDatabaseCache();
  return (db.bookings || [])
    .filter((booking) => booking.eventId === eventId && booking.status === REGISTRATION_STATUS.CONFIRMED)
    .reduce((total, booking) => total + (booking.tickets ? booking.tickets.length : 0), 0);
}

export function calculateRemainingPlaces(event) {
  if (!event || event.capacity === null) return null; // Unlimited capacity
  const reserved = calculateReservedPlaces(event.id);
  const remaining = event.capacity - reserved;
  return Math.max(0, remaining);
}

export function getRegistrationById(registrationId) {
  const db = getDatabaseCache();
  return (db.bookings || []).find((b) => b.id === registrationId) || null;
}

export function getUserRegistrations(userId = 'demo-user') {
  const db = getDatabaseCache();
  return (db.bookings || []).filter((b) => b.userId === userId || !b.userId);
}

export function getEventRegistrations(eventId) {
  const db = getDatabaseCache();
  return (db.bookings || []).filter((b) => b.eventId === eventId);
}

export function createRegistration({ eventId, names = [], userId = 'demo-user', registrationId = null, codes = [] }) {
  const event = getEventById(eventId);
  if (!event) throw new Error(`Event ${eventId} not found.`);

  if (event.status === 'Cancelled' || event.status === 'Archived') {
    throw new Error('Registration unavailable for this event status.');
  }

  if (names.length < 1 || names.length > MAX_BOOKING_LIMIT) {
    throw new Error(`Select between 1 and ${MAX_BOOKING_LIMIT} places.`);
  }

  if (names.some((n) => !n || !n.trim())) {
    throw new Error('Enter an attendee name for each place.');
  }

  const existingRegistrations = getUserRegistrations(userId);
  const userHasConfirmedBooking = existingRegistrations.some(
    (b) => b.eventId === eventId && b.status === REGISTRATION_STATUS.CONFIRMED
  );
  if (userHasConfirmedBooking) {
    throw new Error('You already have an active reservation for this event.');
  }

  // Capacity Validation Safeguard (Atomic Concurrency Check)
  const remaining = calculateRemainingPlaces(event);
  if (remaining !== null && names.length > remaining) {
    throw new Error(`Only ${remaining} place(s) remain for this event.`);
  }

  const regId = registrationId || `reg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const tickets = names.map((name, idx) => {
    const ticketCode = (codes && codes[idx]) ? codes[idx] : `TCK-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return createTicketEntity({
      registrationId: regId,
      eventId,
      attendeeName: name.trim(),
      ticketCode,
    });
  });

  const registration = createRegistrationEntity({
    id: regId,
    userId,
    eventId,
    status: REGISTRATION_STATUS.CONFIRMED,
    createdAt: Date.now(),
    tickets,
  });

  mutateDatabaseState((db) => {
    // Re-verify capacity inside lock/mutation fn
    const currentReserved = (db.bookings || [])
      .filter((b) => b.eventId === eventId && b.status === REGISTRATION_STATUS.CONFIRMED)
      .reduce((sum, b) => sum + (b.tickets ? b.tickets.length : 0), 0);

    if (event.capacity !== null && (currentReserved + names.length > event.capacity)) {
      throw new Error('Registration failed: Event capacity exceeded during request processing.');
    }

    return {
      ...db,
      bookings: [registration, ...(db.bookings || [])],
      notifications: [
        {
          id: `confirmed-${registration.id}`,
          eventId,
          bookingId: registration.id,
          title: 'Reservation confirmed',
          message: `${event.title} · ${event.date || event.startDate}`,
          read: false,
          createdAt: Date.now(),
        },
        ...(db.notifications || []),
      ],
    };
  });

  return registration;
}

export function cancelRegistration(registrationId, reason = '') {
  let updatedBooking = null;

  mutateDatabaseState((db) => {
    const booking = (db.bookings || []).find((b) => b.id === registrationId);
    if (!booking) throw new Error(`Registration ${registrationId} not found.`);

    if (booking.status === REGISTRATION_STATUS.CANCELLED) {
      throw new Error('This registration is already cancelled.');
    }

    // Safeguard: Do not cancel if tickets already checked in
    const checkedIn = booking.tickets && booking.tickets.some((t) => t.checkedInAt);
    if (checkedIn) {
      throw new Error('Cannot cancel registration: A ticket has already been checked in.');
    }

    // Cascade cancellation status to registration and associated tickets
    updatedBooking = {
      ...booking,
      status: REGISTRATION_STATUS.CANCELLED,
      cancelledAt: Date.now(),
      tickets: booking.tickets.map((t) => ({ ...t, status: 'Cancelled' })),
    };

    const newBookings = db.bookings.map((b) => (b.id === registrationId ? updatedBooking : b));

    return {
      ...db,
      bookings: newBookings,
      notifications: [
        {
          id: `cancelled-${registrationId}`,
          eventId: booking.eventId,
          bookingId: registrationId,
          title: 'Reservation cancelled',
          message: 'Your places have been released.',
          read: false,
          createdAt: Date.now(),
        },
        ...(db.notifications || []),
      ],
    };
  });

  return updatedBooking;
}

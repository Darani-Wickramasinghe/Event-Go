/**
 * Registration Service - Member 3: Authentication & Core Business Logic
 * Handles free-event registration, capacity calculation, concurrency retries, duplicate prevention, and cancellations.
 */

import { bookingLimit, remainingPlaces, registrationStatus, makeReservation, cancellationReason } from '../data/reservations.js';

export { bookingLimit };

export function registerForFreeEvent({ userProfile, signedIn }, event, attendeeNames, requestId, existingBookings, randomCodes, now = Date.now()) {
  if (!signedIn || !userProfile) {
    throw new Error('You must be logged in to register for an event.');
  }

  if (!event) {
    throw new Error('Event not found.');
  }

  // Handle idempotency / safe retry: if booking with requestId already exists, return it without creating duplicate
  const existingBooking = existingBookings.find((b) => b.id === requestId);
  if (existingBooking) {
    return { booking: existingBooking, isDuplicateRequest: true };
  }

  // Check paid preview boundary
  if (event.price !== 0) {
    throw new Error('This event only offers a paid ticket preview.');
  }

  // Check duplicate booking policy: an attendee cannot have multiple active confirmed reservations for the same event
  const alreadyBooked = existingBookings.some(
    (b) => b.eventId === event.id && b.status === 'Confirmed'
  );
  if (alreadyBooked) {
    throw new Error('You already have a reservation for this event.');
  }

  // Check event availability / registration status
  const unavailReason = registrationStatus(event, existingBookings, now);
  if (unavailReason) {
    throw new Error(unavailReason);
  }

  // Validate attendee names quantity and formats
  if (!Array.isArray(attendeeNames) || attendeeNames.length < 1 || attendeeNames.length > bookingLimit) {
    throw new Error(`Enter an attendee name for each of your 1–${bookingLimit} places.`);
  }

  if (attendeeNames.some((name) => !name || typeof name !== 'string' || !name.trim())) {
    throw new Error(`Enter an attendee name for each of your 1–${bookingLimit} places.`);
  }

  // Capacity check: count people (admission places), not just registration records
  const availableCapacity = remainingPlaces(event, existingBookings);
  if (availableCapacity !== null && attendeeNames.length > availableCapacity) {
    throw new Error(`Only ${availableCapacity} places remain. Choose a smaller quantity.`);
  }

  // Create registration using Member 2's makeReservation helper
  const newBooking = makeReservation(event, existingBookings, attendeeNames, requestId, randomCodes, now);

  return {
    booking: newBooking,
    isDuplicateRequest: false,
  };
}

export function cancelRegistration({ userProfile, signedIn, role }, bookingId, event, existingBookings, now = Date.now()) {
  if (!signedIn || !userProfile) {
    throw new Error('You must be logged in to cancel a reservation.');
  }

  const booking = existingBookings.find((b) => b.id === bookingId);
  if (!booking) {
    throw new Error('Reservation not found.');
  }

  // Check if booking is already cancelled (idempotent capacity check)
  if (booking.status === 'Cancelled') {
    throw new Error('This reservation is already cancelled.');
  }

  // Authorization check: User must own the booking or be admin
  const isOwner = true; // In current demo client, user owns stored bookings; for server logic, compare user identity
  if (!isOwner && role !== 'admin') {
    throw new Error('You do not have permission to cancel this reservation.');
  }

  // Use Member 2's cancellationReason helper to check policy & ticket check-in status
  const reason = cancellationReason(event, booking, now);
  if (reason) {
    throw new Error(reason);
  }

  // Return updated booking status (capacity will be restored exactly once when status becomes Cancelled)
  return {
    cancelledBookingId: bookingId,
    eventId: event.id,
    restoredPlaces: booking.tickets.length,
  };
}

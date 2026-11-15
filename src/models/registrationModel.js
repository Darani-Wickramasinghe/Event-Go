/**
 * Registration Entity Model
 */

export const REGISTRATION_STATUS = {
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  ATTENDED: 'Attended',
};

export const MAX_BOOKING_LIMIT = 4;

export function createRegistrationEntity({
  id,
  userId = 'demo-user',
  eventId,
  status = REGISTRATION_STATUS.CONFIRMED,
  createdAt = Date.now(),
  cancelledAt = null,
  tickets = [],
}) {
  if (!eventId) throw new Error('Registration requires a valid event ID.');
  if (!Array.isArray(tickets) || tickets.length < 1 || tickets.length > MAX_BOOKING_LIMIT) {
    throw new Error(`Registration must contain between 1 and ${MAX_BOOKING_LIMIT} tickets.`);
  }

  return {
    id: id || `reg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    userId,
    eventId,
    status,
    createdAt,
    cancelledAt,
    tickets,
  };
}

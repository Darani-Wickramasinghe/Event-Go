import { CHECK_RESULT, EVENT_STATUS, TICKET_STATUS } from './contract.js';

// Decide what a scan means. Does NOT change anything - just answers.
export function validateTicket(tickets, token, scanningEventId) {
  const code = String(token ?? '').trim();
  const ticket = tickets.find((item) => item.token === code);

  if (!ticket) return { result: CHECK_RESULT.INVALID, ticket: null };
  if (ticket.eventId !== scanningEventId) return { result: CHECK_RESULT.WRONG_EVENT, ticket };
  if (ticket.status === TICKET_STATUS.CANCELLED) return { result: CHECK_RESULT.CANCELLED, ticket };
  if (ticket.status === TICKET_STATUS.CHECKED_IN) {
    return { result: CHECK_RESULT.ALREADY_USED, ticket, usedAt: ticket.checkedInAt };
  }
  return { result: CHECK_RESULT.ADMITTED, ticket };
}

// Scan + record. Returns a NEW tickets list (the old one is not modified).
// Only an ADMITTED scan changes anything, so a repeat scan can never count twice.
export function checkInTicket(tickets, token, scanningEventId, now = new Date()) {
  const outcome = validateTicket(tickets, token, scanningEventId);
  if (outcome.result !== CHECK_RESULT.ADMITTED) return { tickets, outcome };

  const updated = tickets.map((item) => (item.id === outcome.ticket.id
    ? { ...item, status: TICKET_STATUS.CHECKED_IN, checkedInAt: now.toISOString() }
    : item));
  return { tickets: updated, outcome: { ...outcome, ticket: updated.find((item) => item.id === outcome.ticket.id) } };
}

// The word shown in the attendee's history.
// "Attended" ONLY when a real scan exists (SRS rule BR-08).
export function attendanceLabel(ticket, event, now = new Date()) {
  if (ticket.status === TICKET_STATUS.CHECKED_IN) return 'Attended';
  if (ticket.status === TICKET_STATUS.CANCELLED) return 'Cancelled';
  if (event.status === EVENT_STATUS.CANCELLED) return 'Event cancelled';
  if (now > new Date(event.end)) return 'Past registration';
  return 'Confirmed';
}

// Organizer numbers for one event. Counts PEOPLE (tickets), not bookings.
export function attendanceSummary(tickets, eventId) {
  const mine = tickets.filter((item) => item.eventId === eventId);
  const cancelled = mine.filter((item) => item.status === TICKET_STATUS.CANCELLED).length;
  const checkedIn = mine.filter((item) => item.status === TICKET_STATUS.CHECKED_IN).length;
  const reserved = mine.length - cancelled;
  return { reserved, cancelled, checkedIn, notArrived: reserved - checkedIn };
}

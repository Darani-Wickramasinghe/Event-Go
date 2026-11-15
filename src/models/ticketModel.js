/**
 * Ticket Entity Model
 */

export function createTicketEntity({
  id,
  registrationId,
  eventId,
  attendeeName,
  ticketCode,
  checkedInAt = null,
}) {
  if (!attendeeName || !attendeeName.trim()) {
    throw new Error('Attendee name is required for ticket.');
  }
  if (!ticketCode) {
    throw new Error('Ticket code is required.');
  }

  return {
    id: id || `ticket-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    registrationId,
    eventId,
    attendeeName: attendeeName.trim(),
    ticketCode,
    checkedInAt,
  };
}

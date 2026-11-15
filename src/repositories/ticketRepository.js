import { getDatabaseCache, mutateDatabaseState } from '../config/database.js';
import { REGISTRATION_STATUS } from '../models/registrationModel.js';

export function getTicketsByRegistration(registrationId) {
  const db = getDatabaseCache();
  const booking = (db.bookings || []).find((b) => b.id === registrationId);
  return booking ? booking.tickets || [] : [];
}

export function getTicketByCode(ticketCode) {
  const db = getDatabaseCache();
  for (const booking of db.bookings || []) {
    const ticket = (booking.tickets || []).find((t) => t.ticketCode === ticketCode || t.code === ticketCode);
    if (ticket) {
      return { ...ticket, bookingId: booking.id, eventId: booking.eventId, registrationStatus: booking.status };
    }
  }
  return null;
}

export function checkInTicket(eventId, ticketCode) {
  let updatedBooking = null;
  const now = Date.now();

  mutateDatabaseState((db) => {
    const booking = (db.bookings || []).find((b) =>
      b.eventId === eventId && (b.tickets || []).some((t) => t.ticketCode === ticketCode || t.code === ticketCode)
    );

    if (!booking) throw new Error('Ticket code was not found for this event.');
    if (booking.status === REGISTRATION_STATUS.CANCELLED) {
      throw new Error('This ticket belongs to a cancelled registration.');
    }

    const ticket = booking.tickets.find((t) => t.ticketCode === ticketCode || t.code === ticketCode);
    if (ticket.checkedInAt) {
      throw new Error('This ticket has already been checked in.');
    }

    const updatedTickets = booking.tickets.map((t) =>
      (t.ticketCode === ticketCode || t.code === ticketCode) ? { ...t, checkedInAt: now } : t
    );

    updatedBooking = {
      ...booking,
      tickets: updatedTickets,
    };

    return {
      ...db,
      bookings: db.bookings.map((b) => (b.id === booking.id ? updatedBooking : b)),
      audit: [`Checked in ticket ${ticketCode} for event ${eventId}`, ...(db.audit || [])],
    };
  });

  return updatedBooking;
}

/**
 * Ticket Service - Member 3: Authentication & Core Business Logic
 * Unique ticket credentials, QR validation, scanner business logic, repeat scan prevention, and attendance status.
 */

import { scanTicket, bookingStatus } from '../data/reservations.js';

export { bookingStatus };

export function validateAndCheckInTicket({ signedIn, role }, event, ticketCode, existingBookings, now = Date.now()) {
  if (!signedIn) {
    throw new Error('Log in to check in attendees.');
  }

  if (role !== 'organizer' && role !== 'admin') {
    throw new Error('Only organizers or administrators can scan and validate tickets.');
  }

  if (!event) {
    throw new Error('Event not found.');
  }

  if (!ticketCode || typeof ticketCode !== 'string') {
    throw new Error('Invalid ticket code.');
  }

  // Delegate core ticket scanning verification to Member 2's scanTicket helper
  const updatedBooking = scanTicket(event, existingBookings, ticketCode.trim(), now);

  const scannedTicket = updatedBooking.tickets.find((t) => t.code === ticketCode.trim());

  return {
    success: true,
    booking: updatedBooking,
    ticket: scannedTicket,
    attendeeName: scannedTicket?.name || 'Attendee',
  };
}

export function getTicketStatusInfo(event, booking, now = Date.now()) {
  if (!booking || !event) return 'Unknown';
  return bookingStatus(event, booking, now);
}

/**
 * Attendance Management Module - Core Data & Query Functions
 * Reuses existing Eventora events and bookings data.
 */

/**
 * Checks whether an event belongs to the logged-in organizer.
 * An organizer can only access their own events.
 */
export function isOrganizerEvent(event, profile = {}) {
  if (!event) return false;

  const org = (profile.organization || '').trim().toLowerCase();
  const name = (profile.name || '').trim().toLowerCase();
  const email = (profile.email || '').trim().toLowerCase();

  const eventOrg = (event.organizer || '').trim().toLowerCase();
  const eventEmail = (event.organizerEmail || '').trim().toLowerCase();

  // Match by organizer email if present
  if (email && eventEmail && email === eventEmail) return true;

  // Match by organization name if set
  if (org && eventOrg) {
    if (eventOrg === org || eventOrg.includes(org) || org.includes(eventOrg)) {
      return true;
    }
  }

  // Match by organizer display name
  if (name && eventOrg && eventOrg === name) return true;

  // Fallback for default demo organizer when no specific organization is set
  if (!org && !name) {
    return eventOrg === 'colombo live' || eventOrg === 'eventora demo organizer';
  }

  return false;
}

/**
 * Filters the list of events to only those belonging to the logged-in organizer.
 */
export function getOrganizerEvents(events = [], profile = {}) {
  if (!Array.isArray(events)) return [];
  return events.filter((event) => isOrganizerEvent(event, profile));
}

/**
 * Retrieves all registered attendees for a specific event from existing bookings.
 * Does not create duplicate tables or modify existing booking records.
 */
export function getEventAttendees(bookings = [], eventId) {
  if (!eventId || !Array.isArray(bookings)) return [];

  const eventBookings = bookings.filter((booking) => booking.eventId === eventId);
  const attendees = [];

  for (const booking of eventBookings) {
    const isCancelled = booking.status === 'Cancelled';
    const tickets = booking.tickets || [];

    for (const ticket of tickets) {
      const isCheckedIn = !isCancelled && !!ticket.checkedInAt;
      const status = isCancelled
        ? 'Cancelled'
        : isCheckedIn
        ? 'Checked in'
        : 'Not checked in';

      attendees.push({
        bookingId: booking.id,
        eventId: booking.eventId,
        name: ticket.name,
        code: ticket.code,
        ticketCode: ticket.code,
        checkedInAt: ticket.checkedInAt || null,
        status, // 'Checked in' | 'Not checked in' | 'Cancelled'
        isCancelled,
        createdAt: booking.createdAt,
      });
    }
  }

  return attendees;
}

/**
 * Computes attendance metrics for a list of attendees:
 * - totalRegistered: total confirmed reservations
 * - checkedIn: attendees who have checked in
 * - notCheckedIn: attendees who have not yet checked in
 * - percentage: attendance rate as a percentage (0-100)
 */
export function calculateAttendanceStats(attendees = []) {
  // Only confirmed (non-cancelled) attendees count toward attendance
  const confirmedAttendees = attendees.filter((a) => !a.isCancelled);
  const totalRegistered = confirmedAttendees.length;
  const checkedIn = confirmedAttendees.filter((a) => a.status === 'Checked in').length;
  const notCheckedIn = Math.max(0, totalRegistered - checkedIn);
  const percentage = totalRegistered > 0 ? Math.round((checkedIn / totalRegistered) * 100) : 0;

  return {
    totalRegistered,
    checkedIn,
    notCheckedIn,
    percentage,
  };
}

/**
 * Filters attendees by search query and check-in status.
 */
export function filterAttendees(attendees = [], query = '', statusFilter = 'All') {
  const q = query.trim().toLowerCase();

  return attendees.filter((attendee) => {
    // Status filter
    if (statusFilter === 'Checked in' && attendee.status !== 'Checked in') return false;
    if (statusFilter === 'Not checked in' && attendee.status !== 'Not checked in') return false;
    if (statusFilter === 'Cancelled' && attendee.status !== 'Cancelled') return false;
    // By default in 'All', only show active confirmed attendees
    if (statusFilter === 'All' && attendee.isCancelled) return false;

    // Search query
    if (q) {
      const matchesName = attendee.name.toLowerCase().includes(q);
      const matchesCode = (attendee.code || '').toLowerCase().includes(q);
      if (!matchesName && !matchesCode) return false;
    }

    return true;
  });
}

/**
 * Formats a check-in timestamp into human-readable Sri Lankan time.
 */
export function formatCheckInTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-LK', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Colombo',
  }).format(date);
}

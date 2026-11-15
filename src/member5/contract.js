// MEMBER 5 - shared names ("the contract").
// Agree these names with Members 2 and 3. If they rename something later,
// change it HERE only - the rest of your code imports from this file.

export const TICKET_STATUS = {
  VALID: 'valid',
  CHECKED_IN: 'checkedIn',
  CANCELLED: 'cancelled',
};

export const BOOKING_STATUS = {
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
};

export const EVENT_STATUS = {
  PUBLISHED: 'published',
  RESCHEDULED: 'rescheduled',
  CANCELLED: 'cancelled',
};

// What the scanner says after a scan
export const CHECK_RESULT = {
  ADMITTED: 'admitted',
  ALREADY_USED: 'alreadyUsed',
  CANCELLED: 'cancelled',
  WRONG_EVENT: 'wrongEvent',
  INVALID: 'invalid',
};

export const NOTICE_TYPE = {
  EVENT_CANCELLED: 'eventCancelled',
  EVENT_RESCHEDULED: 'eventRescheduled',
  VENUE_CHANGED: 'venueChanged',
  REMINDER: 'reminder',
};

/*
Shapes used by Member 5 code (plain objects):

event   = { id, title, venue, start: ISO string, end: ISO string, status }
booking = { id, userId, eventId, status, places }
ticket  = { id, token, bookingId, eventId, attendeeName, status, checkedInAt }
notice  = { id, userId, bookingId, eventId, type, message, read, createdAt }
prefs   = { reminderHours: 1 | 24 | 48 | null }   // null = no reminders
*/

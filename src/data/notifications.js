// Builds attendee notices and reminders from booking and event changes.
/**
 * Eventora Notification Generation & Dispatch Engine
 * Reuses existing Eventora event and registration data.
 */

export const NOTICE_TYPE = {
  EVENT_CANCELLED: 'eventCancelled',
  EVENT_RESCHEDULED: 'eventRescheduled',
  VENUE_CHANGED: 'venueChanged',
  EVENT_UPDATED: 'eventUpdated',
  REMINDER: 'reminder',
  CONFIRMATION: 'bookingConfirmed',
};

export const DELIVERY_STATUS = {
  DELIVERED: 'delivered',
  PENDING: 'pending',
  FAILED: 'failed',
};

/**
 * Detects material changes between an existing event and its update.
 * Returns an array of change objects, or empty array if no material change.
 */
export function detectEventChanges(before, after) {
  if (!before || !after) return [];
  const changes = [];

  // Cancellation
  if (before.status !== 'Cancelled' && after.status === 'Cancelled') {
    changes.push({
      type: NOTICE_TYPE.EVENT_CANCELLED,
      key: 'cancelled',
      title: 'Event cancelled',
      message: `${after.title} has been cancelled.${after.reason ? ` Reason: ${after.reason}` : ''}`,
    });
    return changes; // Cancellation supersedes schedule/venue updates
  }

  // Rescheduled (Date or Time change)
  const scheduleChanged =
    before.startDate !== after.startDate ||
    before.startTime !== after.startTime ||
    before.endTime !== after.endTime;

  if (scheduleChanged) {
    changes.push({
      type: NOTICE_TYPE.EVENT_RESCHEDULED,
      key: `${after.startDate}-${after.startTime}`,
      title: 'Event rescheduled',
      message: `${after.title} has been rescheduled to ${after.date || after.startDate}.${after.reason ? ` Reason: ${after.reason}` : ''}`,
    });
  }

  // Material venue change
  const venueChanged = before.venue !== after.venue || before.city !== after.city;
  if (venueChanged) {
    changes.push({
      type: NOTICE_TYPE.VENUE_CHANGED,
      key: `${after.venue}-${after.city}`,
      title: 'Venue updated',
      message: `${after.title} venue moved to ${after.venue}, ${after.city}.${after.reason ? ` Reason: ${after.reason}` : ''}`,
    });
  }

  return changes;
}

/**
 * Generates notifications for affected registered attendees when an event changes.
 *
 * Rules:
 * - Only notifies registered attendees with Confirmed bookings.
 * - Does not notify users who only saved the event.
 * - Deterministic IDs prevent duplicate notifications for the same change.
 * - Records delivery status ('delivered') and timestamp.
 * - Wrapped with safety isolation so errors never modify or cancel confirmed bookings.
 */
export function buildEventChangeNotifications({
  before,
  after,
  bookings = [],
  existingNotifications = [],
  now = Date.now(),
}) {
  try {
    const changes = detectEventChanges(before, after);
    if (!changes.length) return [];

    // Filter to only affected attendees with Confirmed bookings
    const affectedBookings = bookings.filter(
      (b) => b.eventId === after.id && b.status === 'Confirmed'
    );
    if (!affectedBookings.length) return [];

    const existingIds = new Set(existingNotifications.map((n) => n.id));
    const newNotifications = [];

    for (const change of changes) {
      for (const booking of affectedBookings) {
        // Deterministic composite ID: prevents duplicate notifications for the same change
        const id = `${change.type}-${after.id}-${booking.id}-${change.key}`;

        if (!existingIds.has(id)) {
          newNotifications.push({
            id,
            eventId: after.id,
            bookingId: booking.id,
            type: change.type,
            title: change.title,
            message: change.message,
            read: false,
            deliveryStatus: DELIVERY_STATUS.DELIVERED,
            deliveredAt: new Date(now).toISOString(),
            createdAt: now,
          });
          existingIds.add(id);
        }
      }
    }

    return newNotifications;
  } catch (error) {
    // Requirement 7: Ensure notification failures do not cancel or modify a confirmed booking
    console.warn('Notification generation failed safely without affecting bookings:', error);
    return [];
  }
}

/**
 * Generates before-event reminders according to user preferences.
 *
 * Rules:
 * - Respects profile.reminders (must be true) and profile.reminderHours (e.g. 1, 24, 48).
 * - Only reminds for confirmed, non-cancelled events starting within the window.
 * - Avoids duplicate reminders with deterministic ID.
 */
export function buildReminders({
  events = [],
  bookings = [],
  profile = {},
  existingNotifications = [],
  readReminders = [],
  now = Date.now(),
}) {
  try {
    if (!profile.reminders || !profile.reminderHours) return [];

    const reminderWindowMs = profile.reminderHours * 3600000;
    const existingIds = new Set([
      ...existingNotifications.map((n) => n.id),
      ...readReminders,
    ]);

    const reminders = [];

    for (const booking of bookings) {
      if (booking.status !== 'Confirmed') continue;

      const event = events.find((e) => e.id === booking.eventId);
      if (!event || event.status === 'Cancelled' || event.status === 'Draft') continue;

      // Calculate event start timestamp
      const startsAt = new Date(`${event.startDate}T${event.startTime}:00+05:30`).getTime();
      if (isNaN(startsAt)) continue;

      // Check if event is upcoming and within the reminder window
      if (startsAt <= now || startsAt - now > reminderWindowMs) continue;

      const id = `reminder-${booking.id}-${startsAt}`;
      if (existingIds.has(id)) continue;

      reminders.push({
        id,
        eventId: event.id,
        bookingId: booking.id,
        type: NOTICE_TYPE.REMINDER,
        title: 'Upcoming event reminder',
        message: `${event.title} starts soon · ${event.date || event.startDate}`,
        read: readReminders.includes(id),
        deliveryStatus: DELIVERY_STATUS.DELIVERED,
        deliveredAt: new Date(now).toISOString(),
        createdAt: now,
      });
      existingIds.add(id);
    }

    return reminders;
  } catch (error) {
    console.warn('Reminder generation failed safely:', error);
    return [];
  }
}

/**
 * Safely merges new notifications with existing ones, preserving order and preventing duplicates.
 */
export function safeMergeNotifications(current = [], additions = []) {
  if (!Array.isArray(additions) || additions.length === 0) return current;
  const known = new Set(current.map((item) => item.id));
  const uniqueAdditions = additions.filter((item) => !known.has(item.id));
  return [...uniqueAdditions, ...current];
}

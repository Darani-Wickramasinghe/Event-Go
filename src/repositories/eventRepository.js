import { getDatabaseCache, mutateDatabaseState } from '../config/database.js';
import { events as seedEvents, formatEventDate } from '../data/events.js';
import { createEventEntity, EVENT_STATUS } from '../models/eventModel.js';

function listAllEvents(db) {
  const firstDay = Date.parse(db.demoDate || '2026-11-15');
  const anchor = Date.parse('2026-11-13');
  const baseEvents = seedEvents.map((event) => {
    const startDate = new Date(firstDay + Date.parse(event.startDate) - anchor).toISOString().slice(0, 10);
    return { ...event, startDate, day: startDate.slice(8), date: formatEventDate(startDate, event.startTime) };
  });

  return [...baseEvents, ...(db.createdEvents || [])].map((base) => {
    const event = { status: EVENT_STATUS.PUBLISHED, ...base, ...(db.eventEdits ? db.eventEdits[base.id] : {}) };
    if (['Submitted', 'Rejected'].includes(event.status)) event.status = EVENT_STATUS.DRAFT;
    return event;
  });
}

export function getEventById(eventId) {
  const db = getDatabaseCache();
  const allEvents = listAllEvents(db);
  return allEvents.find((e) => e.id === eventId) || null;
}

export function getAllEvents() {
  const db = getDatabaseCache();
  return listAllEvents(db);
}

export function getPublishedEvents(filters = {}) {
  const db = getDatabaseCache();
  const events = listAllEvents(db);
  return events.filter((e) => {
    if (e.status !== EVENT_STATUS.PUBLISHED && e.status !== EVENT_STATUS.RESCHEDULED) {
      return false;
    }
    if (filters.category && filters.category !== 'All' && e.category !== filters.category) {
      return false;
    }
    if (filters.city && e.city.toLowerCase() !== filters.city.toLowerCase()) {
      return false;
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const match = e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });
}

export function getEventsByOrganizer(organizerName) {
  const db = getDatabaseCache();
  const events = listAllEvents(db);
  return events.filter((e) => e.organizer === organizerName);
}

export function createEvent(eventData, publish = false) {
  const status = publish ? EVENT_STATUS.PUBLISHED : EVENT_STATUS.DRAFT;
  const newEvent = createEventEntity({ ...eventData, status });

  mutateDatabaseState((db) => ({
    ...db,
    createdEvents: [...(db.createdEvents || []), newEvent],
    audit: [`${newEvent.title} · ${publish ? 'Published' : 'Created'}`, ...(db.audit || [])],
  }));

  return newEvent;
}

export function updateEvent(eventId, updates) {
  let updatedEvent = null;
  mutateDatabaseState((db) => {
    const currentEdits = db.eventEdits[eventId] || {};
    updatedEvent = { ...currentEdits, ...updates, updatedAt: Date.now() };
    return {
      ...db,
      eventEdits: {
        ...db.eventEdits,
        [eventId]: updatedEvent,
      },
      audit: [`Updated event ${eventId}`, ...(db.audit || [])],
    };
  });
  return updatedEvent;
}

export function updateEventStatus(eventId, status, reason = '') {
  let updated = null;
  mutateDatabaseState((db) => {
    const currentEdit = db.eventEdits[eventId] || {};
    updated = {
      ...currentEdit,
      status,
      reason: reason.trim(),
      updatedAt: Date.now(),
    };

    // Integrity Rule: When an event is cancelled, cascade cancellation to all bookings
    let bookings = db.bookings;
    let notifications = db.notifications;

    if (status === EVENT_STATUS.CANCELLED) {
      bookings = db.bookings.map((booking) => {
        if (booking.eventId === eventId && booking.status === 'Confirmed') {
          return {
            ...booking,
            status: 'Cancelled',
            cancelledAt: Date.now(),
            tickets: booking.tickets.map((t) => ({ ...t, status: 'Cancelled' })),
          };
        }
        return booking;
      });

      notifications = [
        {
          id: `cancelled-evt-${eventId}-${Date.now()}`,
          eventId,
          title: 'Event cancelled',
          message: reason.trim() || 'This event was cancelled by the organizer.',
          read: false,
          createdAt: Date.now(),
        },
        ...db.notifications,
      ];
    }

    return {
      ...db,
      bookings,
      notifications,
      eventEdits: {
        ...db.eventEdits,
        [eventId]: updated,
      },
      audit: [`Status change for ${eventId} to ${status}`, ...(db.audit || [])],
    };
  });
  return updated;
}

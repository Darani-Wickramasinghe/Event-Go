import { randomUUID } from 'expo-crypto';
import { useMemo } from 'react';
import { events as seedEvents, eventCoverSource, formatEventDate } from './events.js';
import { useDemoStore } from './useDemoStore.js';
import { registerForFreeEvent, cancelRegistration } from '../services/registrationService.js';
import { createOrganizerEvent, updateOrganizerEvent, transitionEventStatus, validateEventPermissions } from '../services/eventBusinessService.js';
import { validateAndCheckInTicket } from '../services/ticketService.js';
import { buildEventChangeNotifications, safeMergeNotifications, DELIVERY_STATUS } from './notifications.js';
import { recordOrganizerActivity } from './organizerNotifications.js';

function bookingDetail(booking) {
  const places = booking.tickets.length;
  return `${booking.tickets[0]?.name || 'Attendee'} · ${places} ${places === 1 ? 'place' : 'places'}`;
}

function listEvents(data) {
  const firstDay = Date.parse(data.demoDate);
  const anchor = Date.parse('2026-11-13');
  const sampleEvents = seedEvents.map((event) => {
    const startDate = new Date(firstDay + Date.parse(event.startDate) - anchor).toISOString().slice(0, 10);
    return { ...event, startDate, day: startDate.slice(8), date: formatEventDate(startDate, event.startTime) };
  });
  return [...data.createdEvents].reverse().concat(sampleEvents).map((base) => {
    const event = { status: 'Published', ...base, ...data.eventEdits[base.id] };
    if (['Submitted', 'Rejected'].includes(event.status)) event.status = 'Draft';
    const organizerProfile = data.organizerProfiles?.[event.organizerEmail?.trim().toLowerCase()];
    if (organizerProfile) event.organizer = organizerProfile.organization;
    return { ...event, defaultImage: base.image, image: eventCoverSource(event.coverImage, base.image, event.category) };
  });
}

export function useEventoraData() {
  const { data, ready, update, commit, storageWarning } = useDemoStore();
  const events = useMemo(() => listEvents(data), [data.demoDate, data.createdEvents, data.eventEdits, data.organizerProfiles]);

  function reserve(eventId, names, id) {
    const codes = names.map(() => randomUUID());
    update((current) => {
      const event = listEvents(current).find((item) => item.id === eventId);
      const { booking, isDuplicateRequest } = registerForFreeEvent(
        { userProfile: current.profile, signedIn: current.signedIn },
        event,
        names,
        id,
        current.bookings,
        codes
      );
      if (isDuplicateRequest || current.bookings.some((item) => item.id === booking.id)) return current;

      return {
        ...current,
        bookings: [booking, ...current.bookings],
        organizerActivity: recordOrganizerActivity(current, event, 'reservation', `reserved-${booking.id}`, bookingDetail(booking)),
        notifications: [{
          id: `confirmed-${booking.id}`, eventId, bookingId: booking.id, title: 'Reservation confirmed',
          message: `${event.title} · ${event.date}`, read: false,
          deliveryStatus: DELIVERY_STATUS.DELIVERED, deliveredAt: new Date().toISOString(),
        }, ...current.notifications],
      };
    });
    return id;
  }

  function cancel(bookingId) {
    update((current) => {
      const booking = current.bookings.find((item) => item.id === bookingId);
      const event = listEvents(current).find((item) => item.id === booking?.eventId);

      cancelRegistration(
        { userProfile: current.profile, signedIn: current.signedIn, role: current.profile.role },
        bookingId,
        event,
        current.bookings
      );

      return {
        ...current,
        bookings: current.bookings.map((item) => item.id === bookingId ? { ...item, status: 'Cancelled' } : item),
        organizerActivity: recordOrganizerActivity(current, event, 'cancellation', `cancelled-${bookingId}`, bookingDetail(booking)),
        notifications: [{
          id: `cancelled-${bookingId}`, eventId: event.id, bookingId, title: 'Reservation cancelled',
          message: `${event.title} · Your places have been released.`, read: false,
          deliveryStatus: DELIVERY_STATUS.DELIVERED, deliveredAt: new Date().toISOString(),
        }, ...current.notifications],
      };
    });
  }

  function saveEvent(draft, eventId, publish = false) {
    const id = eventId ?? randomUUID();
    return commit((current) => {
      if (!current.signedIn) throw new Error('Log in to manage events.');
      const role = current.profile.role || 'organizer';
      const existingEvent = listEvents(current).find((item) => item.id === id);

      if (!eventId && !existingEvent) {
        const newEvent = createOrganizerEvent(
          current.profile,
          role,
          { ...draft, id, publish },
          current.bookings
        );
        return { ...current, createdEvents: [...current.createdEvents, newEvent] };
      }

      const updatedEvent = updateOrganizerEvent(
        current.profile,
        role,
        existingEvent,
        { ...draft, publish },
        current.bookings
      );

      const moved = ['startDate', 'startTime', 'endTime', 'city', 'venue', 'latitude', 'longitude'].some((key) => updatedEvent[key] !== existingEvent[key]);
      const affected = current.bookings.some((booking) => booking.eventId === id && booking.status === 'Confirmed');
      const publicEvent = ['Published', 'Rescheduled', 'Closed'].includes(existingEvent.status);

      const updateNotices = (publicEvent && moved && affected)
        ? buildEventChangeNotifications({
            before: existingEvent,
            after: updatedEvent,
            bookings: current.bookings,
            existingNotifications: current.notifications,
          })
        : [];
      const notices = safeMergeNotifications(current.notifications, updateNotices);

      return {
        ...current,
        eventEdits: { ...current.eventEdits, [id]: updatedEvent },
        notifications: notices,
        audit: [`${existingEvent.title} · ${publish ? 'Published' : 'Updated'}${publicEvent && moved ? ` · ${updatedEvent.reason}` : ''}`, ...current.audit],
      };
    });
  }

  function setEventStatus(eventId, status, reason) {
    return commit((current) => {
      if (!current.signedIn) throw new Error('Log in to manage events.');
      const event = listEvents(current).find((item) => item.id === eventId);
      const role = current.profile.role || 'organizer';
      return transitionEventStatus(current.profile, role, current, event, status, reason);
    });
  }

  async function checkIn(eventId, code) {
    let admittedTicket;
    await commit((current) => {
      const event = listEvents(current).find((item) => item.id === eventId);
      const role = current.profile.role || 'organizer';
      if (current.signedIn && event) validateEventPermissions(current.profile, role, event);
      const result = validateAndCheckInTicket(
        { signedIn: current.signedIn, role },
        event,
        code,
        current.bookings
      );
      const activityId = `check-in-${result.booking.id}-${result.booking.tickets.indexOf(result.ticket)}`;
      admittedTicket = result.ticket;

      return {
        ...current,
        bookings: current.bookings.map((item) => item.id === result.booking.id ? result.booking : item),
        organizerActivity: recordOrganizerActivity(current, event, 'checkIn', activityId, result.attendeeName),
      };
    });
    return admittedTicket;
  }

  return { data, ready, update, commit, storageWarning, events, reserve, cancel, saveEvent, setEventStatus, checkIn };
}

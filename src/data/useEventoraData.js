import { randomUUID } from 'expo-crypto';
import { useMemo } from 'react';
import { changeEventStatus, eventFromDraft } from './eventOperations';
import { events as seedEvents, eventImages, formatEventDate } from './events';
import { cancellationReason, eventTime, makeReservation, scanTicket } from './reservations';
import { useDemoStore } from './useDemoStore';

function listEvents(data) {
  const firstDay = Date.parse(data.demoDate);
  const anchor = Date.parse('2026-11-13');
  const sampleEvents = seedEvents.map((event) => {
    const startDate = new Date(firstDay + Date.parse(event.startDate) - anchor).toISOString().slice(0, 10);
    return { ...event, startDate, day: startDate.slice(8), date: formatEventDate(startDate, event.startTime) };
  });
  return [...sampleEvents, ...data.createdEvents].map((base) => {
    const event = { status: 'Published', ...base, ...data.eventEdits[base.id] };
    return { ...event, image: base.image ?? eventImages[event.category] ?? eventImages.Art };
  });
}

export function useEventoraData() {
  const { data, ready, update, storageWarning } = useDemoStore();
  const events = useMemo(() => listEvents(data), [data.createdEvents, data.eventEdits]);

  function reserve(eventId, names, id) {
    const codes = names.map(() => randomUUID());
    update((current) => {
      if (!current.signedIn) throw new Error('Set up a demo profile first.');
      const event = listEvents(current).find((item) => item.id === eventId);
      const booking = makeReservation(event, current.bookings, names, id, codes);
      if (current.bookings.some((item) => item.id === booking.id)) return current;
      return {
        ...current,
        bookings: [booking, ...current.bookings],
        notifications: [{
          id: `confirmed-${booking.id}`, eventId, bookingId: booking.id, title: 'Reservation confirmed',
          message: `${event.title} · ${event.date}`, read: false,
        }, ...current.notifications],
      };
    });
    return id;
  }

  function cancel(bookingId) {
    update((current) => {
      if (!current.signedIn) throw new Error('Open your demo profile first.');
      const booking = current.bookings.find((item) => item.id === bookingId);
      const event = listEvents(current).find((item) => item.id === booking.eventId);
      const reason = cancellationReason(event, booking);
      if (reason) throw new Error(reason);
      return {
        ...current,
        bookings: current.bookings.map((item) => item.id === bookingId ? { ...item, status: 'Cancelled' } : item),
        notifications: [{
          id: `cancelled-${bookingId}`, eventId: event.id, bookingId, title: 'Reservation cancelled',
          message: `${event.title} · Your places have been released.`, read: false,
        }, ...current.notifications],
      };
    });
  }

  function saveEvent(draft, eventId) {
    const id = eventId ?? randomUUID();
    update((current) => {
      if (current.organizerAccess !== 'Approved') throw new Error('Organizer access is required.');
      const details = eventFromDraft(draft, id, current.bookings);
      if (!eventId) {
        const event = { ...details, organizer: 'Eventora Demo Organizer', status: 'Draft' };
        return { ...current, createdEvents: [...current.createdEvents, event] };
      }
      const event = listEvents(current).find((item) => item.id === id);
      const moved = ['startDate', 'startTime', 'endTime', 'city', 'venue', 'latitude', 'longitude'].some((key) => details[key] !== event[key]);
      const affected = current.bookings.some((booking) => booking.eventId === id && booking.status === 'Confirmed');
      if (affected && details.price !== event.price) throw new Error('Price cannot change while reservations are active.');
      const publicEvent = ['Published', 'Rescheduled', 'Closed'].includes(event.status);
      if (publicEvent && moved && !draft.reason?.trim()) throw new Error('Enter a reason for changing the schedule or venue.');
      if (publicEvent && moved && eventTime(details, details.endTime) <= Date.now()) throw new Error('Set a future schedule for the event.');
      const status = publicEvent && moved && event.status !== 'Closed' ? 'Rescheduled' : event.status;
      const reason = publicEvent && moved ? draft.reason.trim() : event.reason;
      const notices = affected && moved
        ? [{ id: randomUUID(), eventId: id, title: `${event.title} was updated`, message: `${reason} · ${details.date} · ${details.venue}`, read: false }, ...current.notifications]
        : current.notifications;
      return {
        ...current,
        eventEdits: { ...current.eventEdits, [id]: { ...details, status, reason, rescheduled: publicEvent && moved ? true : event.rescheduled } },
        notifications: notices,
        audit: [`${event.title} · Updated${publicEvent && moved ? ` · ${reason}` : ''}`, ...current.audit],
      };
    });
  }

  function setEventStatus(eventId, status, reason, admin = false) {
    update((current) => {
      const event = listEvents(current).find((item) => item.id === eventId);
      if (admin) {
        if (event.status !== 'Submitted') throw new Error('Only submitted drafts can be reviewed.');
        if (status === 'Published' && current.organizerAccess !== 'Approved') throw new Error('Approve the organizer before publishing.');
      } else {
        if (current.organizerAccess !== 'Approved') throw new Error('Organizer access is required.');
        const allowed = ['Draft', 'Rejected'].includes(event.status) ? ['Submitted']
          : ['Published', 'Rescheduled'].includes(event.status) ? ['Closed', 'Cancelled']
          : event.status === 'Closed' ? ['Cancelled'] : [];
        if (!allowed.includes(status)) throw new Error('This status change is unavailable.');
      }
      return changeEventStatus(current, event, status, reason);
    });
  }

  function checkIn(eventId, code) {
    update((current) => {
      if (current.organizerAccess !== 'Approved') throw new Error('Organizer access is required.');
      const event = listEvents(current).find((item) => item.id === eventId);
      const checkedIn = scanTicket(event, current.bookings, code);
      return { ...current, bookings: current.bookings.map((item) => item.id === checkedIn.id ? checkedIn : item) };
    });
  }

  return { data, ready, update, storageWarning, events, reserve, cancel, saveEvent, setEventStatus, checkIn };
}

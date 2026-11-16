import { randomUUID } from 'expo-crypto';
import { useEffect, useMemo, useState } from 'react';
import { events as seedEvents, eventCoverSource, formatEventDate } from './events.js';
import { useDemoStore } from './useDemoStore.js';
import { registerForFreeEvent, cancelRegistration } from '../services/registrationService.js';
import { createOrganizerEvent, updateOrganizerEvent, transitionEventStatus, validateEventPermissions } from '../services/eventBusinessService.js';
import { validateAndCheckInTicket } from '../services/ticketService.js';
import { buildEventChangeNotifications, safeMergeNotifications, DELIVERY_STATUS } from './notifications.js';
import { recordOrganizerActivity } from './organizerNotifications.js';
import { auth, isFirebaseConfigured } from '../config/firebase.js';
import {
  saveEventToFirestore,
  updateEventStatusInFirestore,
  subscribeToCloudEvents,
} from '../services/eventFirestoreService.js';
import {
  saveBookingToFirestore,
  cancelBookingInFirestore,
  updateTicketCheckInInFirestore,
  subscribeToCloudBookings,
} from '../services/bookingFirestoreService.js';
import {
  saveNotificationToFirestore,
} from '../services/notificationFirestoreService.js';

function bookingDetail(booking) {
  const places = booking.tickets.length;
  return `${booking.tickets[0]?.name || 'Attendee'} · ${places} ${places === 1 ? 'place' : 'places'}`;
}

function listEvents(data, cloudEvents = []) {
  const firstDay = Date.parse(data.demoDate || '2026-11-15');
  const anchor = Date.parse('2026-11-13');
  const sampleEvents = seedEvents.map((event) => {
    const startDate = new Date(firstDay + Date.parse(event.startDate) - anchor).toISOString().slice(0, 10);
    return { ...event, startDate, day: startDate.slice(8), date: formatEventDate(startDate, event.startTime) };
  });

  let baseList = [];
  if (cloudEvents && cloudEvents.length > 0) {
    const cloudIds = new Set(cloudEvents.map((item) => item.id));
    baseList = [...cloudEvents];
    (data.createdEvents || []).forEach((localEv) => {
      if (!cloudIds.has(localEv.id)) {
        baseList.push(localEv);
      }
    });
  } else {
    baseList = [...data.createdEvents].reverse().concat(sampleEvents);
  }

  return baseList.map((base) => {
    const event = { status: 'Published', ...base, ...(data.eventEdits ? data.eventEdits[base.id] : {}) };
    if (['Submitted', 'Rejected'].includes(event.status)) event.status = 'Draft';
    const organizerProfile = data.organizerProfiles?.[event.organizerEmail?.trim().toLowerCase()];
    if (organizerProfile) event.organizer = organizerProfile.organization;
    const fallbackImage = base.image || (seedEvents.find((s) => s.id === base.id)?.image);
    return {
      ...event,
      defaultImage: fallbackImage,
      image: eventCoverSource(event.coverImage, fallbackImage, event.category),
    };
  });
}

export function useEventoraData() {
  const { data, ready, update, commit, storageWarning } = useDemoStore();
  const [cloudEvents, setCloudEvents] = useState([]);

  // Subscribe to real-time events from Cloud Firestore
  useEffect(() => {
    if (!ready || !isFirebaseConfigured) return;
    const unsubscribe = subscribeToCloudEvents((incomingEvents) => {
      if (incomingEvents && incomingEvents.length > 0) {
        setCloudEvents(incomingEvents);
      }
    });
    return () => unsubscribe();
  }, [ready]);

  // Subscribe to real-time bookings from Cloud Firestore
  useEffect(() => {
    if (!ready || !isFirebaseConfigured) return;
    const userId = auth?.currentUser?.uid || data.profile?.uid;
    const role = data.profile?.role || 'attendee';

    const unsubscribe = subscribeToCloudBookings(userId, role, (cloudBookings) => {
      if (cloudBookings && cloudBookings.length > 0) {
        update((current) => {
          const merged = [...current.bookings];
          cloudBookings.forEach((cb) => {
            const idx = merged.findIndex((b) => b.id === cb.id);
            if (idx >= 0) {
              merged[idx] = { ...merged[idx], ...cb };
            } else {
              merged.push(cb);
            }
          });
          return { ...current, bookings: merged };
        });
      }
    });
    return () => unsubscribe();
  }, [ready, data.profile?.uid, data.profile?.role, data.signedIn]);

  const events = useMemo(
    () => listEvents(data, cloudEvents),
    [data.demoDate, data.createdEvents, data.eventEdits, data.organizerProfiles, cloudEvents]
  );

  function reserve(eventId, names, id) {
    const codes = names.map(() => randomUUID());
    let savedBooking = null;
    let confirmedNotice = null;

    update((current) => {
      const event = listEvents(current, cloudEvents).find((item) => item.id === eventId);
      const { booking, isDuplicateRequest } = registerForFreeEvent(
        { userProfile: current.profile, signedIn: current.signedIn },
        event,
        names,
        id,
        current.bookings,
        codes
      );
      if (isDuplicateRequest || current.bookings.some((item) => item.id === booking.id)) return current;

      savedBooking = booking;
      confirmedNotice = {
        id: `confirmed-${booking.id}`,
        eventId,
        bookingId: booking.id,
        title: 'Reservation confirmed',
        message: `${event.title} · ${event.date}`,
        read: false,
        deliveryStatus: DELIVERY_STATUS.DELIVERED,
        deliveredAt: new Date().toISOString(),
      };

      return {
        ...current,
        bookings: [booking, ...current.bookings],
        organizerActivity: recordOrganizerActivity(current, event, 'reservation', `reserved-${booking.id}`, bookingDetail(booking)),
        notifications: [confirmedNotice, ...current.notifications],
      };
    });

    if (savedBooking && isFirebaseConfigured) {
      const userId = auth?.currentUser?.uid || data.profile?.uid || 'demo-user';
      saveBookingToFirestore(savedBooking, userId).catch((err) => {
        console.warn('[Firebase] Could not save booking to Firestore:', err.message);
      });
      if (confirmedNotice) {
        saveNotificationToFirestore(confirmedNotice, userId);
      }
    }

    return id;
  }

  function cancel(bookingId) {
    let cancelNotice = null;

    update((current) => {
      const booking = current.bookings.find((item) => item.id === bookingId);
      const event = listEvents(current, cloudEvents).find((item) => item.id === booking?.eventId);

      cancelRegistration(
        { userProfile: current.profile, signedIn: current.signedIn, role: current.profile.role },
        bookingId,
        event,
        current.bookings
      );

      cancelNotice = {
        id: `cancelled-${bookingId}`,
        eventId: event.id,
        bookingId,
        title: 'Reservation cancelled',
        message: `${event.title} · Your places have been released.`,
        read: false,
        deliveryStatus: DELIVERY_STATUS.DELIVERED,
        deliveredAt: new Date().toISOString(),
      };

      return {
        ...current,
        bookings: current.bookings.map((item) => item.id === bookingId ? { ...item, status: 'Cancelled' } : item),
        organizerActivity: recordOrganizerActivity(current, event, 'cancellation', `cancelled-${bookingId}`, bookingDetail(booking)),
        notifications: [cancelNotice, ...current.notifications],
      };
    });

    if (isFirebaseConfigured) {
      cancelBookingInFirestore(bookingId).catch((err) => {
        console.warn('[Firebase] Could not cancel booking in Firestore:', err.message);
      });
      if (cancelNotice) {
        const userId = auth?.currentUser?.uid || data.profile?.uid || 'demo-user';
        saveNotificationToFirestore(cancelNotice, userId);
      }
    }
  }

  function saveEvent(draft, eventId, publish = false) {
    const id = eventId ?? randomUUID();
    let eventToPersist = null;
    const result = commit((current) => {
      if (!current.signedIn) throw new Error('Log in to manage events.');
      const role = current.profile.role || 'organizer';
      const existingEvent = listEvents(current, cloudEvents).find((item) => item.id === id);

      if (!eventId && !existingEvent) {
        const newEvent = createOrganizerEvent(
          current.profile,
          role,
          { ...draft, id, publish },
          current.bookings
        );
        eventToPersist = newEvent;
        return { ...current, createdEvents: [...current.createdEvents, newEvent] };
      }

      const updatedEvent = updateOrganizerEvent(
        current.profile,
        role,
        existingEvent,
        { ...draft, publish },
        current.bookings
      );
      eventToPersist = updatedEvent;

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

    if (isFirebaseConfigured) {
      result.then(() => {
        if (eventToPersist) {
          saveEventToFirestore(eventToPersist).catch((err) => {
            console.warn('[Firebase] Could not save event to Firestore:', err.message);
          });
        }
      }).catch(() => {});
    }

    return result;
  }

  function setEventStatus(eventId, status, reason) {
    const result = commit((current) => {
      if (!current.signedIn) throw new Error('Log in to manage events.');
      const event = listEvents(current, cloudEvents).find((item) => item.id === eventId);
      const role = current.profile.role || 'organizer';
      return transitionEventStatus(current.profile, role, current, event, status, reason);
    });

    if (isFirebaseConfigured) {
      result.then(() => {
        updateEventStatusInFirestore(eventId, status, reason).catch((err) => {
          console.warn('[Firebase] Could not update event status in Firestore:', err.message);
        });
      }).catch(() => {});
    }

    return result;
  }

  async function checkIn(eventId, code) {
    let admittedTicket;
    let updatedBooking = null;

    await commit((current) => {
      const event = listEvents(current, cloudEvents).find((item) => item.id === eventId);
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
      updatedBooking = result.booking;
      return {
        ...current,
        bookings: current.bookings.map((item) => item.id === result.booking.id ? result.booking : item),
        organizerActivity: recordOrganizerActivity(current, event, 'checkIn', activityId, result.attendeeName),
      };
    });

    if (updatedBooking && isFirebaseConfigured) {
      updateTicketCheckInInFirestore(updatedBooking).catch((err) => {
        console.warn('[Firebase] Could not sync ticket check-in to Firestore:', err.message);
      });
    }

    return admittedTicket;
  }

  return { data, ready, update, commit, storageWarning, events, reserve, cancel, saveEvent, setEventStatus, checkIn };
}

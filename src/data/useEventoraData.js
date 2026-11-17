// Connects booking, event, and check-in actions to local storage and Firestore.
import { randomUUID } from 'expo-crypto';
import { useEffect, useMemo, useState } from 'react';
import { events as seedEvents, eventCoverSource, formatEventDate } from './events.js';
import { useDemoStore } from './useDemoStore.js';
import { registerForFreeEvent, cancelRegistration } from '../services/registrationService.js';
import { createOrganizerEvent, updateOrganizerEvent, transitionEventStatus, validateEventPermissions } from '../services/eventBusinessService.js';
import { validateAndCheckInTicket } from '../services/ticketService.js';
import { buildEventChangeNotifications, safeMergeNotifications, DELIVERY_STATUS } from './notifications.js';
import { isFirebaseConfigured } from '../config/firebase.js';
import {
  saveEventToFirestore,
  updateEventStatusInFirestore,
  subscribeToCloudEvents,
} from '../services/eventFirestoreService.js';
import {
  saveBookingToFirestore,
  cancelBookingInFirestore,
  checkInTicketInFirestore,
  subscribeToCloudBookings,
} from '../services/bookingFirestoreService.js';
import {
  saveNotificationToFirestore,
} from '../services/notificationFirestoreService.js';

// Merge a booking by ID and keep a newer local copy if updates arrive out of order.
function saveBookingLocally(current, booking, notice) {
  const index = current.bookings.findIndex(({ id }) => id === booking.id);
  const bookings = [...current.bookings];
  if (index === -1) {
    bookings.unshift(booking);
  } else if (!(bookings[index].updatedAt > booking.updatedAt)) {
    bookings[index] = booking;
  }
  const notifications = notice && !current.notifications.some(({ id }) => id === notice.id)
    ? [notice, ...current.notifications]
    : current.notifications;
  return { ...current, bookings, notifications };
}

// Combine cloud or sample events with local creations and edits for the screens.
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

export function useEventoraData(firebaseUserId) {
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
    if (!ready || !data.signedIn || !firebaseUserId || firebaseUserId !== data.profile?.uid) return;
    const role = data.profile?.role || 'attendee';

    const unsubscribe = subscribeToCloudBookings(firebaseUserId, role, (cloudBookings) => {
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
  }, [ready, firebaseUserId, data.profile?.uid, data.profile?.role, data.signedIn]);

  const events = useMemo(
    () => listEvents(data, cloudEvents),
    [data.demoDate, data.createdEvents, data.eventEdits, data.organizerProfiles, cloudEvents]
  );

  // Generate one code per attendee and validate the booking before choosing a storage path.
  async function reserve(eventId, names, id) {
    const codes = names.map(() => randomUUID());
    const now = Date.now();

    function validate(current, event) {
      return registerForFreeEvent(
        { userProfile: current.profile, signedIn: current.signedIn },
        event,
        names,
        id,
        current.bookings,
        codes,
        now
      ).booking;
    }

    function confirmation(event, booking) {
      return {
        id: `confirmed-${booking.id}`,
        eventId,
        bookingId: booking.id,
        title: 'Reservation confirmed',
        message: `${event.title} · ${event.date}`,
        read: false,
        deliveryStatus: DELIVERY_STATUS.DELIVERED,
        deliveredAt: new Date(booking.createdAt ?? now).toISOString(),
      };
    }

    if (isFirebaseConfigured) {
      const event = events.find((item) => item.id === eventId);
      const booking = await saveBookingToFirestore(validate(data, event), data.profile);
      const notice = confirmation(event, booking);
      update((current) => saveBookingLocally(current, booking, notice));
      void saveNotificationToFirestore(notice, booking.userId);
    } else {
      await commit((current) => {
        const event = listEvents(current, cloudEvents).find((item) => item.id === eventId);
        const booking = validate(current, event);
        return saveBookingLocally(current, booking, confirmation(event, booking));
      });
    }

    return id;
  }

  // Check cancellation rules and save the new booking status.
  async function cancel(bookingId) {
    function getReservation(current) {
      const booking = current.bookings.find(({ id }) => id === bookingId);
      const event = listEvents(current, cloudEvents).find(({ id }) => id === booking?.eventId);
      if (!booking || !event) throw new Error('Reservation not found.');
      const session = { userProfile: current.profile, signedIn: current.signedIn, role: current.profile.role };
      return { booking, event, session };
    }

    function cancellation(event, booking) {
      return {
        id: `cancelled-${bookingId}`,
        eventId: event.id,
        bookingId,
        title: 'Reservation cancelled',
        message: `${event.title} · Your places have been released.`,
        read: false,
        deliveryStatus: DELIVERY_STATUS.DELIVERED,
        deliveredAt: new Date(booking.cancelledAt).toISOString(),
      };
    }

    if (isFirebaseConfigured) {
      const { event, session } = getReservation(data);
      const booking = await cancelBookingInFirestore(bookingId, event, session);
      const notice = cancellation(event, booking);
      update((current) => saveBookingLocally(current, booking, notice));
      void saveNotificationToFirestore(notice, booking.userId);
    } else {
      await commit((current) => {
        const { booking, event, session } = getReservation(current);
        const cancelledAt = Date.now();
        cancelRegistration(session, bookingId, event, current.bookings, cancelledAt);
        const cancelled = { ...booking, status: 'Cancelled', cancelledAt };
        return saveBookingLocally(current, cancelled, cancellation(event, cancelled));
      });
    }
  }

  // Validate the new or edited event and update the local listing.
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

  // Apply a valid status change and send it to Firestore when configured.
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

  // Check event permissions and validate the ticket against cloud or local bookings.
  async function checkIn(eventId, code) {
    function getCheckIn(current) {
      const event = listEvents(current, cloudEvents).find((item) => item.id === eventId);
      const { signedIn, profile } = current;
      if (!signedIn) throw new Error('Log in to check in attendees.');
      if (!event) throw new Error('Event not found.');
      validateEventPermissions(profile, profile.role, event);
      return { event, session: { signedIn, role: profile.role, userProfile: profile } };
    }

    if (isFirebaseConfigured) {
      const { event, session } = getCheckIn(data);
      const result = await checkInTicketInFirestore(event, code, session);
      update((current) => saveBookingLocally(current, result.booking));
      return result.ticket;
    }

    let ticket;
    await commit((current) => {
      const { event, session } = getCheckIn(current);
      const result = validateAndCheckInTicket(session, event, code, current.bookings);
      ticket = result.ticket;
      return saveBookingLocally(current, result.booking);
    });
    return ticket;
  }

  return { data, ready, update, commit, storageWarning, events, reserve, cancel, saveEvent, setEventStatus, checkIn };
}

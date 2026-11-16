/**
 * Booking & Ticket Firestore Service
 * Connects reservations, tickets, cancellations, and QR check-in to Cloud Firestore.
 */

import {
  collection,
  doc,
  getDocsFromServer,
  onSnapshot,
  query,
  runTransaction,
  where,
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../config/firebase.js';
import { ownsReservation } from '../data/reservations.js';
import { cancelRegistration } from './registrationService.js';
import { validateAndCheckInTicket } from './ticketService.js';

export const BOOKINGS_COLLECTION = 'bookings';

function requireCloudSession(profile) {
  if (!db || !auth?.currentUser || auth.currentUser.uid !== profile?.uid) {
    throw new Error('Log in again to sync your reservations.');
  }
}

export async function saveBookingToFirestore(booking, profile) {
  requireCloudSession(profile);
  const bookingRef = doc(db, BOOKINGS_COLLECTION, booking.id);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(bookingRef);
    if (snapshot.exists()) {
      const existing = { ...snapshot.data(), id: snapshot.id };
      if (!ownsReservation(existing, profile) || existing.eventId !== booking.eventId || existing.status !== 'Confirmed') {
        throw new Error('Start a new reservation and try again.');
      }
      return existing;
    }

    const saved = { ...booking, userId: profile.uid, updatedAt: new Date().toISOString() };
    transaction.set(bookingRef, saved);
    return saved;
  });
}

/**
 * Updates booking status to 'Cancelled' in Firestore.
 */
export async function cancelBookingInFirestore(bookingId, event, session) {
  requireCloudSession(session.userProfile);
  const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(bookingRef);
    const booking = snapshot.exists() && { ...snapshot.data(), id: snapshot.id };
    if (!booking || booking.eventId !== event.id) throw new Error('Reservation not found.');
    cancelRegistration(session, bookingId, event, [booking]);
    const cancelledAt = Date.now();
    const changes = { status: 'Cancelled', cancelledAt, updatedAt: new Date(cancelledAt).toISOString() };
    transaction.update(bookingRef, changes);
    return { ...booking, ...changes };
  });
}

/**
 * Updates a checked-in ticket within a booking in Firestore.
 */
export async function checkInTicketInFirestore(event, ticketCode, session) {
  requireCloudSession(session.userProfile);
  const code = typeof ticketCode === 'string' ? ticketCode.trim() : '';
  if (!code) throw new Error('Invalid ticket code.');

  const bookings = await getDocsFromServer(query(collection(db, BOOKINGS_COLLECTION), where('eventId', '==', event.id)));
  const match = bookings.docs.find((snapshot) => snapshot.data().tickets?.some((ticket) => ticket.code === code));
  if (!match) throw new Error('Ticket code was not found for this event.');

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(match.ref);
    const existing = snapshot.exists() ? [{ ...snapshot.data(), id: snapshot.id }] : [];
    const result = validateAndCheckInTicket(session, event, code, existing);
    const updatedAt = new Date(result.ticket.checkedInAt).toISOString();
    transaction.update(match.ref, { tickets: result.booking.tickets, updatedAt });
    return { ...result, booking: { ...result.booking, updatedAt } };
  });
}

/**
 * Real-time listener for bookings:
 * - If user is organizer or admin, can listen to all bookings.
 * - If attendee, listens to bookings belonging to their userId.
 */
export function subscribeToCloudBookings(userId, role, onBookingsChanged, onError) {
  if (!isFirebaseConfigured || !db || !userId) {
    return () => {};
  }

  const bookingsCol = collection(db, BOOKINGS_COLLECTION);
  let q = bookingsCol;

  if (role !== 'organizer' && role !== 'admin') {
    q = query(bookingsCol, where('userId', '==', userId));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const cloudBookings = [];
      snapshot.forEach((docSnap) => {
        cloudBookings.push({
          ...docSnap.data(),
          id: docSnap.id,
        });
      });
      onBookingsChanged(cloudBookings);
    },
    (err) => {
      console.warn('[Firebase] Firestore bookings listener error:', err.message);
      if (onError) onError(err);
    }
  );
}

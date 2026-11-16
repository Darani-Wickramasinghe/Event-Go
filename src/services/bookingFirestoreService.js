/**
 * Booking & Ticket Firestore Service
 * Connects reservations, tickets, cancellations, and QR check-in to Cloud Firestore.
 */

import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../config/firebase.js';

export const BOOKINGS_COLLECTION = 'bookings';

/**
 * Persists a new or updated booking into Firestore.
 */
export async function saveBookingToFirestore(booking, userId) {
  if (!isFirebaseConfigured || !db) return;
  if (!booking || !booking.id) throw new Error('Booking must have a valid ID.');

  const payload = {
    ...booking,
    userId: userId || auth?.currentUser?.uid || 'demo-user',
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, BOOKINGS_COLLECTION, booking.id), payload, { merge: true });
  } catch (err) {
    console.warn(`[Firebase] Failed to save booking ${booking.id} to Firestore:`, err.message);
    throw err;
  }
}

/**
 * Updates booking status to 'Cancelled' in Firestore.
 */
export async function cancelBookingInFirestore(bookingId) {
  if (!isFirebaseConfigured || !db) return;
  if (!bookingId) return;

  try {
    await updateDoc(doc(db, BOOKINGS_COLLECTION, bookingId), {
      status: 'Cancelled',
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn(`[Firebase] Failed to cancel booking ${bookingId} in Firestore:`, err.message);
    throw err;
  }
}

/**
 * Updates a checked-in ticket within a booking in Firestore.
 */
export async function updateTicketCheckInInFirestore(booking) {
  if (!isFirebaseConfigured || !db) return;
  if (!booking || !booking.id) return;

  try {
    await setDoc(doc(db, BOOKINGS_COLLECTION, booking.id), {
      ...booking,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn(`[Firebase] Failed to update ticket check-in for booking ${booking.id}:`, err.message);
    throw err;
  }
}

/**
 * Real-time listener for bookings:
 * - If user is organizer or admin, can listen to all bookings.
 * - If attendee, listens to bookings belonging to their userId.
 */
export function subscribeToCloudBookings(userId, role, onBookingsChanged, onError) {
  if (!isFirebaseConfigured || !db) {
    return () => {};
  }

  const bookingsCol = collection(db, BOOKINGS_COLLECTION);
  let q = bookingsCol;

  if (role !== 'organizer' && role !== 'admin' && userId) {
    q = query(bookingsCol, where('userId', '==', userId));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const cloudBookings = [];
      snapshot.forEach((docSnap) => {
        cloudBookings.push({
          id: docSnap.id,
          ...docSnap.data(),
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

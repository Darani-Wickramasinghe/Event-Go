// Loads event updates from Firestore and writes event details and status changes.
/**
 * Event Firestore Service
 * Connects event creation, editing, status transitions, and real-time syncing to Cloud Firestore.
 */

import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../config/firebase.js';
import { events as seedEvents, formatEventDate } from '../data/events.js';

export const EVENTS_COLLECTION = 'events';

function withoutBundledImages(event) {
  // Bundled image sources are resolved by each app build. Custom covers use coverImage.
  const { image, defaultImage, ...data } = event;
  return data;
}

/**
 * Seed initial sample events to Firestore if the collection is empty.
 */
export async function seedFirestoreEventsIfEmpty() {
  if (!isFirebaseConfigured || !db) return 0;
  try {
    const existing = await getDocs(collection(db, EVENTS_COLLECTION));
    if (existing.size > 0) {
      return existing.size;
    }

    let seededCount = 0;
    for (const event of seedEvents) {
      const sanitized = withoutBundledImages({
        ...event,
        status: 'Published',
        coverImage: null,
        createdAt: new Date().toISOString(),
      });
      await setDoc(doc(db, EVENTS_COLLECTION, event.id), sanitized, { merge: true });
      seededCount++;
    }
    console.log(`[Firebase] Seeded ${seededCount} initial events to Firestore.`);
    return seededCount;
  } catch (err) {
    console.warn('[Firebase] Could not seed events to Firestore:', err.message);
    return 0;
  }
}

/**
 * Real-time listener for Firestore events collection.
 */
export function subscribeToCloudEvents(onEventsChanged, onError) {
  if (!isFirebaseConfigured || !db) {
    return () => {};
  }

  const eventsCol = collection(db, EVENTS_COLLECTION);
  return onSnapshot(
    eventsCol,
    (snapshot) => {
      const cloudEvents = [];
      snapshot.forEach((docSnap) => {
        const data = withoutBundledImages(docSnap.data());
        cloudEvents.push({
          id: docSnap.id,
          ...data,
          day: data.startDate ? data.startDate.slice(8) : '01',
          date: data.startDate && data.startTime ? formatEventDate(data.startDate, data.startTime) : (data.date || ''),
        });
      });
      onEventsChanged(cloudEvents);
    },
    (err) => {
      console.warn('[Firebase] Firestore events listener error:', err.message);
      if (onError) onError(err);
    }
  );
}

/**
 * Save (create or update) an event document in Firestore.
 */
export async function saveEventToFirestore(eventData) {
  if (!isFirebaseConfigured || !db) return;
  if (!eventData || !eventData.id) throw new Error('Event must have a valid ID to save to Firestore.');

  const sanitized = withoutBundledImages({
    ...eventData,
    updatedAt: new Date().toISOString(),
  });

  try {
    await setDoc(doc(db, EVENTS_COLLECTION, eventData.id), sanitized, { merge: true });
  } catch (err) {
    console.warn(`[Firebase] Failed to save event ${eventData.id} to Firestore:`, err.message);
    throw err;
  }
}

/**
 * Update event status (e.g. Published, Cancelled, Rescheduled) in Firestore.
 */
export async function updateEventStatusInFirestore(eventId, status, reason = '') {
  if (!isFirebaseConfigured || !db) return;
  if (!eventId) throw new Error('Event ID is required to update status in Firestore.');

  try {
    await updateDoc(doc(db, EVENTS_COLLECTION, eventId), {
      status,
      reason: (reason || '').trim(),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn(`[Firebase] Failed to update event status ${eventId} in Firestore:`, err.message);
    throw err;
  }
}

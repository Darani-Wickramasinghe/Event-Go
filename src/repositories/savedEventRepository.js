// Adds, removes, and looks up bookmarks for a user.
import { getDatabaseCache, mutateDatabaseState } from '../config/database.js';
import { createSavedEventEntity } from '../models/savedEventModel.js';

export function getSavedEvents(userId = 'demo-user') {
  const db = getDatabaseCache();
  if (Array.isArray(db.savedEvents) && db.savedEvents.length > 0) {
    return db.savedEvents.filter((item) => item.userId === userId).map((item) => item.eventId);
  }
  return db.savedIds || [];
}

export function isEventSaved(userId = 'demo-user', eventId) {
  const savedList = getSavedEvents(userId);
  return savedList.includes(eventId);
}

export function saveEvent(userId = 'demo-user', eventId) {
  if (!eventId) throw new Error('Event ID is required to save an event.');

  let currentSaved = getSavedEvents(userId);
  // Integrity Safeguard: Rule 2 - Prevent duplicate saved-event links for one user/event pair
  if (currentSaved.includes(eventId)) {
    return currentSaved; // Already saved, no-op (idempotent)
  }

  const savedRecord = createSavedEventEntity({ userId, eventId, savedAt: Date.now() });

  mutateDatabaseState((db) => {
    const existingIds = db.savedIds || [];
    const existingRecords = db.savedEvents || [];

    return {
      ...db,
      savedIds: existingIds.includes(eventId) ? existingIds : [...existingIds, eventId],
      savedEvents: [...existingRecords.filter((r) => !(r.userId === userId && r.eventId === eventId)), savedRecord],
    };
  });

  return getSavedEvents(userId);
}

export function removeSavedEvent(userId = 'demo-user', eventId) {
  if (!eventId) throw new Error('Event ID is required to remove saved event.');

  mutateDatabaseState((db) => {
    const existingIds = db.savedIds || [];
    const existingRecords = db.savedEvents || [];

    return {
      ...db,
      savedIds: existingIds.filter((id) => id !== eventId),
      savedEvents: existingRecords.filter((r) => !(r.userId === userId && r.eventId === eventId)),
    };
  });

  return getSavedEvents(userId);
}

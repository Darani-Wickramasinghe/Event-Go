// Builds and validates the link between a user and a bookmarked event.
/**
 * Saved Event Relationship Model
 */

export function createSavedEventEntity({ userId, eventId, savedAt = Date.now() }) {
  if (!userId || !eventId) {
    throw new Error('User ID and Event ID are required for saved events.');
  }

  return {
    userId,
    eventId,
    savedAt,
  };
}

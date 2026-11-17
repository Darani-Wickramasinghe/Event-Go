// Defines the shape and defaults for a user's event preferences.
/**
 * User Preferences Entity Model
 */

export function createUserPreferencesEntity({ userId, interests = [], city = 'Kelaniya', reminders = false, reminderHours = 24 }) {
  if (!userId) {
    throw new Error('User ID is required for preferences.');
  }
  return {
    userId,
    interests: Array.isArray(interests) ? interests : [],
    city: city || 'Kelaniya',
    reminders: Boolean(reminders),
    reminderHours: Number.isInteger(reminderHours) && reminderHours > 0 ? reminderHours : 24,
    updatedAt: Date.now(),
  };
}

// Keeps the repository layer's data in memory for the current process.
export const initialDatabaseState = {
  users: [],
  profile: { name: '', interests: [], city: 'Kelaniya', reminders: false, reminderHours: 24, role: 'Attendee' },
  userPreferences: {},
  savedEvents: [], // Array of { userId, eventId, savedAt }
  createdEvents: [],
  eventEdits: {},
  bookings: [], // Registrations containing tickets
  notifications: [],
  readReminders: [],
  reports: [],
  audit: [],
  signedIn: false,
  demoDate: '2026-11-15',
};

let memoryStore = { ...initialDatabaseState };

/**
 * Synchronous access to current database cache (for sync models/selectors).
 */
export function getDatabaseCache() {
  return memoryStore;
}

export function mutateDatabaseState(updateFn) {
  memoryStore = updateFn(memoryStore);
  return memoryStore;
}

export function resetDatabaseState() {
  memoryStore = { ...initialDatabaseState };
}

let AsyncStorage = null;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  AsyncStorage = {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  };
}

export const STORAGE_KEY = 'eventora-demo-v1';

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
let pendingWrite = Promise.resolve();

/**
 * Loads the database state from persistent storage or memory.
 */
export async function getDatabaseState() {
  try {
    if (AsyncStorage && AsyncStorage.getItem) {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        memoryStore = {
          ...initialDatabaseState,
          ...parsed,
          profile: { ...initialDatabaseState.profile, ...parsed.profile },
        };
      }
    }
  } catch (err) {
    console.warn('[Database] Warning: Could not read persistent storage.', err.message);
  }
  return memoryStore;
}

/**
 * Synchronous access to current database cache (for sync models/selectors).
 */
export function getDatabaseCache() {
  return memoryStore;
}

/**
 * Updates the database state atomically and persists it to AsyncStorage.
 * @param {Function} updateFn - Function receiving current state and returning updated state.
 */
export function mutateDatabaseState(updateFn) {
  const next = updateFn(memoryStore);
  memoryStore = next;
  if (AsyncStorage && AsyncStorage.setItem) {
    pendingWrite = pendingWrite
      .then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)))
      .catch((err) => {
        console.warn('[Database] Warning: Failed to persist database state.', err.message);
      });
  }
  return next;
}

/**
 * Resets the in-memory cache and storage (useful for testing or logout).
 */
export async function resetDatabaseState() {
  memoryStore = { ...initialDatabaseState };
  try {
    if (AsyncStorage && AsyncStorage.removeItem) {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    // Ignore error in non-AsyncStorage environments
  }
}

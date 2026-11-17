// Creates, finds, and updates users in the repository's in-memory store.
import { getDatabaseCache, mutateDatabaseState } from '../config/database.js';
import { createUserEntity } from '../models/userModel.js';
import { createUserPreferencesEntity } from '../models/userPreferencesModel.js';

export function getUserById(userId) {
  const db = getDatabaseCache();
  const profile = db.profile;
  if (profile && (profile.id === userId || userId === 'demo-user')) {
    return { id: 'demo-user', ...profile };
  }
  return db.users.find((u) => u.id === userId) || null;
}

export function getUserByEmail(email) {
  if (!email) return null;
  const db = getDatabaseCache();
  const normalized = email.trim().toLowerCase();
  return db.users.find((u) => u.email === normalized) || null;
}

export function createUser(userData) {
  const newUser = createUserEntity(userData);
  mutateDatabaseState((db) => {
    // Integrity rule: Prevent duplicate email
    if (newUser.email && db.users.some((u) => u.email === newUser.email)) {
      throw new Error(`User with email ${newUser.email} already exists.`);
    }
    return {
      ...db,
      users: [...db.users, newUser],
    };
  });
  return newUser;
}

export function updateUser(userId, updates) {
  let updated = null;
  mutateDatabaseState((db) => {
    if (userId === 'demo-user' || db.profile.id === userId) {
      const newProfile = { ...db.profile, ...updates };
      updated = { id: 'demo-user', ...newProfile };
      return { ...db, profile: newProfile };
    }
    const idx = db.users.findIndex((u) => u.id === userId);
    if (idx === -1) throw new Error(`User with ID ${userId} not found.`);
    updated = { ...db.users[idx], ...updates, updatedAt: Date.now() };
    const newUsers = [...db.users];
    newUsers[idx] = updated;
    return { ...db, users: newUsers };
  });
  return updated;
}

export function getUserPreferences(userId) {
  const db = getDatabaseCache();
  if (db.userPreferences && db.userPreferences[userId]) {
    return db.userPreferences[userId];
  }
  return createUserPreferencesEntity({ userId, interests: db.profile.interests, city: db.profile.city });
}

export function updateUserPreferences(userId, prefs) {
  const preferences = createUserPreferencesEntity({ userId, ...prefs });
  mutateDatabaseState((db) => ({
    ...db,
    userPreferences: {
      ...db.userPreferences,
      [userId]: preferences,
    },
    profile: {
      ...db.profile,
      interests: preferences.interests,
      city: preferences.city,
      reminders: preferences.reminders,
      reminderHours: preferences.reminderHours,
    },
  }));
  return preferences;
}

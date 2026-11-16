/**
 * Auth Service - Member 3: Authentication & Core Business Logic
 * Handles user registration, authentication, session management, and role-based permissions.
 * Integrated with Firebase Authentication and Cloud Firestore for virtual persistence.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../config/firebase.js';

export const ROLES = {
  ATTENDEE: 'attendee',
  ORGANIZER: 'organizer',
  ADMIN: 'admin',
};

export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const address = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address);
}

export function validatePassword(password) {
  if (!password || typeof password !== 'string' || password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }
  return true;
}

export function validateRegistrationInput({ name, email, city, role, organization }) {
  if (!name || !name.trim()) {
    throw new Error('Full name is required.');
  }
  if (!validateEmail(email)) {
    throw new Error('A valid email address is required.');
  }
  if (!city || !city.trim()) {
    throw new Error('Home city is required.');
  }
  if (role === ROLES.ORGANIZER && (!organization || !organization.trim())) {
    throw new Error('Organization name is required for organizers.');
  }
  return true;
}

export function mapFirebaseAuthError(error) {
  if (!error) return 'An unexpected error occurred.';
  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please log in.';
    case 'auth/invalid-email':
      return 'The email address is invalid.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    default:
      return error.message || 'Authentication failed. Please try again.';
  }
}

/**
 * Synchronous local registration (for in-memory / demo / unit tests)
 */
export function registerUser(formData, currentStore) {
  const { name, email, city, role = ROLES.ATTENDEE, organization = '' } = formData;
  validateRegistrationInput({ name, email, city, role, organization });

  const formattedEmail = email.trim().toLowerCase();

  if (currentStore.profile?.email && currentStore.profile.email.toLowerCase() === formattedEmail && currentStore.signedIn) {
    throw new Error('An account with this email is already signed in on this device.');
  }

  const newProfile = {
    ...currentStore.profile,
    name: name.trim(),
    email: formattedEmail,
    city: city.trim(),
    organization: role === ROLES.ORGANIZER ? organization.trim() : (currentStore.profile.organization || ''),
    role: role,
    interests: currentStore.profile.interests || [],
  };

  return {
    signedIn: true,
    profile: newProfile,
  };
}

/**
 * Synchronous local login (for in-memory / demo / unit tests)
 */
export function loginUser({ email }, currentStore) {
  if (!validateEmail(email)) {
    throw new Error('Enter a valid email address.');
  }

  const formattedEmail = email.trim().toLowerCase();
  const existingEmail = currentStore.profile?.email?.toLowerCase();

  if (existingEmail && existingEmail !== formattedEmail) {
    throw new Error('That email does not match a profile on this device.');
  }

  return {
    signedIn: true,
    profile: {
      ...currentStore.profile,
      email: formattedEmail,
    },
  };
}

/**
 * Synchronous local logout (for in-memory / demo / unit tests)
 */
export function logoutUser(currentStore) {
  return {
    ...currentStore,
    signedIn: false,
  };
}

/**
 * Firebase Cloud Registration
 * Creates auth user and stores profile in Firestore: users/{uid}
 */
export async function registerWithFirebase(formData) {
  const { name, email, password, city, role = ROLES.ATTENDEE, organization = '', interests = [] } = formData;
  validateRegistrationInput({ name, email, city, role, organization });
  validatePassword(password);

  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase is not configured. Check your .env file.');
  }

  const formattedEmail = email.trim().toLowerCase();

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, formattedEmail, password);
    const user = userCredential.user;

    if (user && updateProfile) {
      await updateProfile(user, { displayName: name.trim() }).catch(() => {});
    }

    const profile = {
      id: user.uid,
      uid: user.uid,
      name: name.trim(),
      email: formattedEmail,
      city: city.trim(),
      organization: role === ROLES.ORGANIZER ? organization.trim() : '',
      role,
      interests: Array.isArray(interests) ? interests : [],
      reminders: false,
      reminderHours: 24,
      createdAt: new Date().toISOString(),
    };

    if (db) {
      await setDoc(doc(db, 'users', user.uid), profile);
    }

    return {
      signedIn: true,
      user,
      profile,
    };
  } catch (error) {
    throw new Error(mapFirebaseAuthError(error));
  }
}

/**
 * Firebase Cloud Login
 * Signs in with credentials and retrieves profile from Firestore: users/{uid}
 */
export async function loginWithFirebase({ email, password }) {
  if (!validateEmail(email)) {
    throw new Error('A valid email address is required.');
  }
  if (!password) {
    throw new Error('Password is required.');
  }

  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase is not configured. Check your .env file.');
  }

  const formattedEmail = email.trim().toLowerCase();

  try {
    const userCredential = await signInWithEmailAndPassword(auth, formattedEmail, password);
    const user = userCredential.user;

    let profile = null;
    if (db) {
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (docSnap.exists()) {
        profile = docSnap.data();
      }
    }

    if (!profile) {
      profile = {
        id: user.uid,
        uid: user.uid,
        name: user.displayName || formattedEmail.split('@')[0],
        email: formattedEmail,
        city: 'Kelaniya',
        role: ROLES.ATTENDEE,
        organization: '',
        interests: [],
        reminders: false,
        reminderHours: 24,
      };
      if (db) {
        await setDoc(doc(db, 'users', user.uid), profile, { merge: true }).catch(() => {});
      }
    }

    return {
      signedIn: true,
      user,
      profile,
    };
  } catch (error) {
    throw new Error(mapFirebaseAuthError(error));
  }
}

/**
 * Firebase Cloud Logout
 */
export async function logoutWithFirebase() {
  if (isFirebaseConfigured && auth) {
    await signOut(auth);
  }
  return {
    signedIn: false,
    profile: { name: '', email: '', city: 'Kelaniya', interests: [], reminders: false, reminderHours: 24 },
  };
}

/**
 * Fetch a user profile from Firestore by UID
 */
export async function fetchUserProfile(uid) {
  if (!uid || !db) return null;
  try {
    const docSnap = await getDoc(doc(db, 'users', uid));
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (err) {
    console.warn('[Firebase] Failed to fetch user profile:', err.message);
  }
  return null;
}

/**
 * Update user profile in Firestore
 */
export async function updateUserProfileInFirestore(uid, updates) {
  if (!uid || !db) return;
  try {
    await setDoc(doc(db, 'users', uid), { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('[Firebase] Failed to update user profile in Firestore:', err.message);
    throw err;
  }
}

export function isAttendee(role) {
  return role === ROLES.ATTENDEE || !role;
}

export function isOrganizer(role) {
  return role === ROLES.ORGANIZER;
}

export function isAdmin(role) {
  return role === ROLES.ADMIN;
}

export function canManageEvent(userProfile, role, event) {
  if (!userProfile || !role) return false;
  if (role === ROLES.ADMIN) return true;
  if (role === ROLES.ORGANIZER) {
    if (!event) return true; // Can create new event
    const userOrg = (userProfile.organization || userProfile.name || '').trim().toLowerCase();
    const eventOrg = (event.organizer || '').trim().toLowerCase();
    return userOrg === eventOrg || !eventOrg;
  }
  return false;
}

/**
 * Auth Service - Member 3: Authentication & Core Business Logic
 * Handles user registration, authentication, session management, and role-based permissions.
 */

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

function savedProfiles(store) {
  const email = store.profile?.email?.trim().toLowerCase();
  return email ? { ...store.profiles, [email]: store.profile } : store.profiles ?? {};
}

export function registerUser(formData, currentStore) {
  const { name, email, city, role = ROLES.ATTENDEE, organization = '' } = formData;
  validateRegistrationInput({ name, email, city, role, organization });

  const formattedEmail = email.trim().toLowerCase();

  if (currentStore.profile?.email && currentStore.profile.email.toLowerCase() === formattedEmail && currentStore.signedIn) {
    throw new Error('An account with this email is already signed in on this device.');
  }

  const profiles = savedProfiles(currentStore);
  if (profiles[formattedEmail]) {
    throw new Error('An account with this email already exists on this device. Log in to continue.');
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
    profiles: { ...profiles, [formattedEmail]: newProfile },
  };
}

export function loginUser({ email, role }, currentStore) {
  if (!validateEmail(email)) {
    throw new Error('Enter a valid email address.');
  }

  const formattedEmail = email.trim().toLowerCase();
  const profiles = savedProfiles(currentStore);
  const savedProfile = profiles[formattedEmail];
  if (!savedProfile && (Object.keys(profiles).length > 0 || !currentStore.profile?.name)) {
    throw new Error('That email does not match a profile on this device.');
  }
  const profile = savedProfile ?? currentStore.profile;
  if (role && profile.role && profile.role !== role) {
    throw new Error(`Choose the ${profile.role} role to use this account.`);
  }
  const signedInProfile = { ...profile, email: formattedEmail };

  return {
    signedIn: true,
    profile: signedInProfile,
    profiles: { ...profiles, [formattedEmail]: signedInProfile },
  };
}

export function logoutUser(currentStore) {
  return {
    ...currentStore,
    signedIn: false,
  };
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
    const eventEmail = event.organizerEmail?.trim().toLowerCase();
    if (eventEmail) return eventEmail === userProfile.email?.trim().toLowerCase();

    const userOrg = (userProfile.organization || userProfile.name || '').trim().toLowerCase();
    const eventOrg = (event.organizer || '').trim().toLowerCase();
    return !!eventOrg && userOrg === eventOrg;
  }
  return false;
}

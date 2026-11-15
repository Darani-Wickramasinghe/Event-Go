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
    const userOrg = (userProfile.organization || userProfile.name || '').trim().toLowerCase();
    const eventOrg = (event.organizer || '').trim().toLowerCase();
    return userOrg === eventOrg || !eventOrg;
  }
  return false;
}

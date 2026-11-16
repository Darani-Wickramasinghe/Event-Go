import { ROLES, validateEmail } from '../services/authService.js';

export function editableOrganizerProfile(data) {
  const account = data.profile;
  const email = account.email?.trim().toLowerCase();
  return {
    name: account.name ?? '',
    organization: account.organization ?? '',
    email: account.email ?? '',
    phone: '',
    description: '',
    picture: null,
    ...data.organizerProfiles?.[email],
  };
}

export function saveOrganizerProfile(data, draft) {
  const account = data.profile;
  const ownerEmail = account.email?.trim().toLowerCase();
  if (!data.signedIn || account.role !== ROLES.ORGANIZER || !ownerEmail) {
    throw new Error('Sign in as an organizer to edit this profile.');
  }
  const profile = {
    name: draft.name.trim(),
    organization: draft.organization.trim(),
    email: draft.email.trim(),
    phone: draft.phone.trim(),
    description: draft.description.trim(),
    picture: draft.picture ?? null,
  };
  if (!profile.name || !profile.organization) throw new Error('Enter your name and organization name.');
  if (profile.email && !validateEmail(profile.email)) throw new Error('Enter a valid contact email address.');
  return {
    ...data,
    organizerProfiles: { ...data.organizerProfiles, [ownerEmail]: profile },
  };
}

export function eventOrganizerProfile(data, event) {
  const email = event.organizerEmail?.trim().toLowerCase();
  if (!email) return { organization: event.organizer };
  const publicProfile = data.organizerProfiles?.[email];
  if (publicProfile) return publicProfile;

  const activeAccount = data.profile.email?.trim().toLowerCase() === email ? data.profile : null;
  const account = activeAccount ?? data.profiles?.[email];
  return {
    organization: event.organizer,
    name: account?.role === ROLES.ORGANIZER ? account.name : '',
  };
}

/**
 * Event Business Service - Member 3: Authentication & Core Business Logic
 * Business rules for event creation, editing, state transitions, and organizer permissions.
 */

import { canManageEvent, isOrganizer, isAdmin } from './authService.js';
import { eventFromDraft, changeEventStatus } from '../data/eventOperations.js';
import { eventTime } from '../data/reservations.js';

export const VALID_EVENT_STATUSES = [
  'Draft',
  'Submitted',
  'Published',
  'Registration closed',
  'Closed',
  'Completed',
  'Archived',
  'Cancelled',
  'Rescheduled',
];

export function validateEventPermissions(userProfile, role, event = null) {
  if (!isOrganizer(role) && !isAdmin(role)) {
    throw new Error('Only organizers or administrators can perform event management operations.');
  }
  if (event && !canManageEvent(userProfile, role, event)) {
    throw new Error('You do not have permission to manage another organization’s event.');
  }
  return true;
}

export function validateDraftEventData(draft, eventId, existingBookings = []) {
  return eventFromDraft(draft, eventId, existingBookings);
}

export function createOrganizerEvent(userProfile, role, draftData, existingBookings = []) {
  validateEventPermissions(userProfile, role);

  const eventId = draftData.id || null;
  const validatedDetails = validateDraftEventData(draftData, eventId, existingBookings);

  const organizerName = (userProfile.organization || userProfile.name || 'Eventora Organizer').trim();

  const isPublish = draftData.publish === true;

  if (isPublish && eventTime(validatedDetails, validatedDetails.endTime) <= Date.now()) {
    throw new Error('Set a future schedule before publishing.');
  }

  return {
    ...validatedDetails,
    organizer: organizerName,
    organizerEmail: userProfile.email?.trim().toLowerCase() || '',
    status: isPublish ? 'Published' : 'Draft',
  };
}

export function updateOrganizerEvent(userProfile, role, existingEvent, draftData, existingBookings = []) {
  validateEventPermissions(userProfile, role, existingEvent);

  const eventId = existingEvent.id;
  const validatedDetails = validateDraftEventData(draftData, eventId, existingBookings);

  const isPublish = draftData.publish === true;
  const isPublicEvent = ['Published', 'Rescheduled', 'Closed'].includes(existingEvent.status);
  const moved = ['startDate', 'startTime', 'endTime', 'city', 'venue', 'latitude', 'longitude'].some(
    (key) => validatedDetails[key] !== existingEvent[key]
  );
  const hasActiveBookings = existingBookings.some(
    (b) => b.eventId === eventId && b.status === 'Confirmed'
  );

  if (hasActiveBookings && validatedDetails.price !== existingEvent.price) {
    throw new Error('Price cannot change while reservations are active.');
  }

  if (isPublicEvent && moved && !draftData.reason?.trim()) {
    throw new Error('Enter a reason for changing the schedule or venue.');
  }

  if (isPublicEvent && moved && eventTime(validatedDetails, validatedDetails.endTime) <= Date.now()) {
    throw new Error('Set a future schedule for the event.');
  }

  if (isPublish && existingEvent.status !== 'Draft') {
    throw new Error('Only drafts can be published.');
  }

  const nextStatus = isPublish
    ? 'Published'
    : isPublicEvent && moved && existingEvent.status !== 'Closed'
    ? 'Rescheduled'
    : existingEvent.status;

  const reasonText = isPublish ? '' : isPublicEvent && moved ? draftData.reason.trim() : (existingEvent.reason || '');

  return {
    ...validatedDetails,
    status: nextStatus,
    reason: reasonText,
    rescheduled: isPublicEvent && moved ? true : existingEvent.rescheduled,
    ...(role === 'organizer' && !existingEvent.organizerEmail && userProfile.email
      ? { organizerEmail: userProfile.email.trim().toLowerCase() }
      : {}),
  };
}

export function transitionEventStatus(userProfile, role, currentStoreData, event, newStatus, reason = '') {
  validateEventPermissions(userProfile, role, event);

  const ended = eventTime(event, event.endTime) <= Date.now();
  const isPublic = ['Published', 'Rescheduled', 'Closed'].includes(event.status);

  const allowedTransitions = {
    Draft: ['Published'],
    Published: ['Closed', 'Cancelled'],
    Rescheduled: ['Closed', 'Cancelled'],
    Closed: ['Cancelled'],
    Cancelled: ['Archived'],
  };

  if (ended || isPublic) {
    if (!allowedTransitions[event.status]) allowedTransitions[event.status] = [];
    if (ended || event.status === 'Cancelled') {
      if (!allowedTransitions[event.status].includes('Archived')) {
        allowedTransitions[event.status].push('Archived');
      }
    }
  }

  const allowed = allowedTransitions[event.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Invalid status transition from '${event.status}' to '${newStatus}'.`);
  }

  return changeEventStatus(currentStoreData, event, newStatus, reason);
}

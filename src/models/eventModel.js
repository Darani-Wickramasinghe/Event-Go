// Builds and validates event records for the repository layer.
/**
 * Event Entity Model & Integrity Validation
 */

export const EVENT_STATUS = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  PUBLISHED: 'Published',
  RESCHEDULED: 'Rescheduled',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
  ARCHIVED: 'Archived',
};

export function createEventEntity({
  id,
  organizer,
  title,
  category,
  city,
  venue,
  description,
  startDate,
  startTime,
  endTime,
  capacity = null,
  price = 0,
  setting = 'Indoor',
  status = EVENT_STATUS.DRAFT,
  coverImage = null,
  latitude = null,
  longitude = null,
  eligibility = '',
  accessibility = '',
  reason = '',
  rescheduled = false,
  createdAt = Date.now(),
}) {
  if (!title || !title.trim()) throw new Error('Event title is required.');
  if (!city || !city.trim()) throw new Error('Event city is required.');
  if (!venue || !venue.trim()) throw new Error('Event venue is required.');
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) throw new Error('Start date must be in YYYY-MM-DD format.');

  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!timePattern.test(startTime) || !timePattern.test(endTime) || startTime >= endTime) {
    throw new Error('Event end time must be after start time on the same day.');
  }

  const parsedCapacity = capacity === null || capacity === '' ? null : Number(capacity);
  if (parsedCapacity !== null && (!Number.isSafeInteger(parsedCapacity) || parsedCapacity < 1)) {
    throw new Error('Event capacity must be a positive integer or null for unlimited.');
  }

  const parsedPrice = Number(price);
  if (!Number.isSafeInteger(parsedPrice) || parsedPrice < 0) {
    throw new Error('Event price must be 0 or a positive whole number.');
  }

  return {
    id: id || `event-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    organizer: organizer || 'Eventora Organizer',
    title: title.trim(),
    category: category || 'General',
    city: city.trim(),
    venue: venue.trim(),
    description: description.trim(),
    startDate,
    startTime,
    endTime,
    capacity: parsedCapacity,
    price: parsedPrice,
    setting,
    status,
    coverImage,
    latitude: latitude ? Number(latitude) : null,
    longitude: longitude ? Number(longitude) : null,
    eligibility: eligibility.trim(),
    accessibility: accessibility.trim(),
    reason: reason.trim(),
    rescheduled: Boolean(rescheduled),
    createdAt,
    updatedAt: Date.now(),
  };
}

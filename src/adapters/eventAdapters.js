export const VENUE_TIMEZONE = 'Asia/Colombo';
const UTC_OFFSET = '+05:30';

export function toWeatherEvent(event) {
  if (!event) return null;
  const hasCoords = Number.isFinite(event.latitude) && Number.isFinite(event.longitude);
  return {
    id: event.id,
    startsAt: `${event.startDate}T${event.startTime}:00${UTC_OFFSET}`,
    endsAt: `${event.startDate}T${event.endTime}:00${UTC_OFFSET}`,
    timezone: VENUE_TIMEZONE,
    // Only an explicit Indoor event uses arrival-time weather.
    setting: event.setting === 'Indoor' ? 'indoor' : 'outdoor',
    coordinates: hasCoords ? { latitude: event.latitude, longitude: event.longitude } : null,
  };
}
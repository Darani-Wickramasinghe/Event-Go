export const organizerAlertTypes = [
  { key: 'reservation', label: 'New reservations', title: 'New reservation', icon: 'ticket-outline' },
  { key: 'cancellation', label: 'Reservation cancellations', title: 'Reservation cancelled', icon: 'close-circle-outline' },
  { key: 'checkIn', label: 'Attendee check-ins', title: 'Attendee checked in', icon: 'checkmark-circle-outline' },
];

export function recordOrganizerActivity(data, event, type, id, detail) {
  const activity = data.organizerActivity ?? [];
  if (!data.createdEvents.some((item) => item.id === event.id) || activity.some((item) => item.id === id)) return activity;
  return [{ id, type, eventId: event.id, detail, createdAt: Date.now() }, ...activity];
}

export function organizerInbox(data, events, preferences) {
  if (preferences.muted) return [];
  const eventById = new Map(events.map((event) => [event.id, event]));
  const readIds = new Set(preferences.readIds);
  return (data.organizerActivity ?? []).flatMap((activity) => {
    const event = eventById.get(activity.eventId);
    if (!event || preferences[activity.type] === false) return [];
    return [{ ...activity, event, read: readIds.has(activity.id) }];
  });
}

export function organizerPreferences(data) {
  const email = data.profile.email?.trim().toLowerCase();
  return email ? data.organizerNotificationSettings?.[email] ?? {} : {};
}

export function updateOrganizerPreferences(data, change) {
  const email = data.profile.email?.trim().toLowerCase();
  if (!data.signedIn || !email) return data;
  return {
    ...data,
    organizerNotificationSettings: {
      ...data.organizerNotificationSettings,
      [email]: change(organizerPreferences(data)),
    },
  };
}

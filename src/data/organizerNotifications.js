// Builds the organizer inbox from booking activity and notification preferences.
export const organizerAlertTypes = [
  { key: 'reservation', label: 'New reservations', title: 'New reservation', icon: 'ticket-outline' },
  { key: 'cancellation', label: 'Reservation cancellations', title: 'Reservation cancelled', icon: 'close-circle-outline' },
  { key: 'checkIn', label: 'Attendee check-ins', title: 'Attendee checked in', icon: 'checkmark-circle-outline' },
];

function activityTime(value) {
  return typeof value === 'number' ? value : Date.parse(value);
}

export function organizerInbox(data, events, preferences) {
  if (preferences.muted) return [];
  const eventById = new Map(events.map((event) => [event.id, event]));
  const readIds = new Set(preferences.readIds);
  // Index activity by ID so updates to the same booking or ticket do not create duplicate rows.
  const activities = new Map((data.organizerActivity ?? []).map((activity) => [activity.id, activity]));

  for (const booking of data.bookings ?? []) {
    if (!eventById.has(booking.eventId) || !['Confirmed', 'Cancelled'].includes(booking.status)) continue;
    const tickets = booking.tickets ?? [];
    const detail = `${tickets[0]?.name || 'Attendee'} · ${tickets.length} ${tickets.length === 1 ? 'place' : 'places'}`;
    function addActivity(id, type, description, timestamp) {
      const createdAt = activityTime(timestamp);
      if (Number.isFinite(createdAt)) {
        activities.set(id, { id, type, eventId: booking.eventId, detail: description, createdAt });
      }
    }

    addActivity(`reserved-${booking.id}`, 'reservation', detail, booking.createdAt);
    if (booking.status === 'Cancelled') {
      addActivity(`cancelled-${booking.id}`, 'cancellation', detail, booking.cancelledAt);
    }
    tickets.forEach((ticket, index) => {
      if (ticket.checkedInAt) {
        addActivity(`check-in-${booking.id}-${index}`, 'checkIn', ticket.name || 'Attendee', ticket.checkedInAt);
      }
    });
  }

  return [...activities.values()].flatMap((activity) => {
    const event = eventById.get(activity.eventId);
    if (!event || preferences[activity.type] === false) return [];
    return [{ ...activity, event, read: readIds.has(activity.id) }];
  }).sort((first, second) => second.createdAt - first.createdAt);
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

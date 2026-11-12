import { useEffect, useState } from 'react';
import { Action, Choices, Copy, Page, Panel } from '../components/FlowUI';
import { bookingStatus, eventTime } from '../data/reservations';

export default function NotificationsScreen({ data, events, onRead, onOpen, onSettings, onBack }) {
  const [filter, setFilter] = useState('All');
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const { reminderHours, reminders: enabled } = data.profile;
  const reminders = data.signedIn && enabled ? data.bookings.flatMap((booking) => {
    const event = events.find((item) => item.id === booking.eventId);
    if (!event || !['Confirmed', 'Rescheduled'].includes(bookingStatus(event, booking, now))) return [];
    const startsAt = eventTime(event);
    if (startsAt <= now || startsAt - now > reminderHours * 3600000) return [];
    const id = `reminder-${booking.id}-${startsAt}`;
    return [{
      id, eventId: event.id, bookingId: booking.id, title: 'Upcoming event reminder',
      message: `${event.title} · ${event.date}`, read: data.readReminders.includes(id),
    }];
  }) : [];
  const notices = data.signedIn ? [...reminders, ...data.notifications] : [];
  const unread = notices.filter((notice) => !notice.read);
  const visible = filter === 'Unread' ? unread : notices;

  return (
    <Page title="Notifications" onBack={onBack}>
      {notices.length > 0 && (
        <>
          <Choices label="Show notifications" options={['All', 'Unread']} selected={[filter]} onSelect={setFilter} />
          <Copy>{unread.length} unread</Copy>
          {unread.length > 0 && <Action label="Mark all as read" secondary onPress={() => onRead(unread.map(({ id }) => id))} />}
        </>
      )}
      {visible.map((notice) => (
        <Panel title={notice.title} key={notice.id}>
          <Copy>{notice.read ? '' : 'New · '}{notice.message}</Copy>
          <Action
            label={notice.bookingId ? 'Open reservation' : 'Open event update'}
            secondary
            onPress={() => { onRead([notice.id]); onOpen(notice); }}
          />
        </Panel>
      ))}
      {visible.length === 0 && (
        <Panel title={filter === 'Unread' ? 'You’re all caught up' : 'No notifications yet'}>
          {filter === 'All' && <Copy>Booking confirmations, changes, and reminders appear here.</Copy>}
          <Action label="Reminder settings" secondary onPress={onSettings} />
        </Panel>
      )}
    </Page>
  );
}

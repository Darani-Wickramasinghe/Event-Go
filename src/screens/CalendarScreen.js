// Shows reservations or organizer events on a month calendar.
import { StyleSheet, Text } from 'react-native';
import { Action, Copy, EmptyState, Page, Panel, SectionHeading } from '../components/FlowUI';
import MonthCalendar, { fullDate } from '../components/MonthCalendar';
import { OrganizerEventBadge, OrganizerEventFact } from '../components/OrganizerEventMedia';
import { agendaEntries, formatCalendarDate } from '../data/agenda';
import { organizerEventStatus } from '../data/organizerEvents';
import { eventTime, sriLankaDate } from '../data/reservations';
import { colors, headingFont } from '../theme';
import { ReservationCard } from './TicketsScreen';

export default function CalendarScreen({ bookings, events, view, onChange, onBack, onOpen, onBrowse, organizer = false }) {
  const today = sriLankaDate();
  const selected = view.date ?? null;
  const month = view.month ?? (selected ?? today).slice(0, 7);
  const entries = organizer
    ? events.filter((event) => !['Cancelled', 'Archived'].includes(event.status) && Number.isFinite(eventTime(event)))
      .sort((first, second) => eventTime(first) - eventTime(second)).map((event) => ({ event, status: organizerEventStatus(event) }))
    : agendaEntries(bookings, events).filter(({ status }) => status !== 'Cancelled');
  const counts = {};
  for (const { event } of entries) counts[event.startDate] = (counts[event.startDate] ?? 0) + 1;
  const matches = entries.filter(({ event }) => selected ? event.startDate === selected : event.startDate.startsWith(month));
  const itemLabel = organizer ? 'events' : 'reservations';

  return (
    <Page title="Calendar" onBack={onBack}>
      <Panel>
        <MonthCalendar month={month} selected={selected} counts={counts} countLabel={organizer ? 'event' : 'reservation'}
          onMonthChange={(nextMonth) => onChange({ month: nextMonth, date: null })}
          onSelect={(date) => onChange({ month, date: selected === date ? null : date })} />
        <Action label="Go to today" secondary onPress={() => onChange({ month: today.slice(0, 7), date: today })} />
      </Panel>
      <Text accessibilityRole="header" style={styles.month}>
        {selected ? formatCalendarDate(selected, fullDate) : `This month’s ${itemLabel}`}
      </Text>
      {selected && <Action label="Show full month" secondary onPress={() => onChange({ month, date: null })} />}
      {matches.map((entry) => organizer ? (
        <Panel key={entry.event.id}>
          <OrganizerEventBadge status={entry.status} />
          <SectionHeading>{entry.event.title}</SectionHeading>
          <OrganizerEventFact icon="calendar-outline">{entry.event.date || entry.event.startDate}</OrganizerEventFact>
          <OrganizerEventFact icon="location-outline">{entry.event.venue || 'Venue unavailable'}</OrganizerEventFact>
          <Action label="Manage event" accessibilityLabel={`Manage ${entry.event.title}`} secondary onPress={() => onOpen(entry.event)} />
        </Panel>
      ) : <ReservationCard key={entry.booking.id} entry={entry} onOpen={onOpen} />)}
      {matches.length === 0 && (organizer
        ? <EmptyState title={selected ? 'No events on this date' : 'No events this month'} icon="calendar-outline">
            {!entries.length && <Action label="View my events" onPress={onBrowse} />}
          </EmptyState>
        : <Copy>{`No ${itemLabel} ${selected ? 'on this date' : 'this month'}.`}</Copy>)}
      {!organizer && entries.length === 0 && <Action label="Browse events" onPress={onBrowse} />}
    </Page>
  );
}

const styles = StyleSheet.create({
  month: { color: colors.ink, fontFamily: headingFont, fontSize: 16 },
});

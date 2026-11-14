import { StyleSheet, Text } from 'react-native';
import { Action, Copy, Page, Panel } from '../components/FlowUI';
import MonthCalendar, { fullDate } from '../components/MonthCalendar';
import { agendaEntries, formatCalendarDate } from '../data/agenda';
import { sriLankaDate } from '../data/reservations';
import { colors, headingFont } from '../theme';
import { ReservationCard } from './TicketsScreen';

export default function CalendarScreen({ bookings, events, view, onChange, onBack, onOpen, onBrowse }) {
  const today = sriLankaDate();
  const selected = view.date ?? null;
  const month = view.month ?? (selected ?? today).slice(0, 7);
  const entries = agendaEntries(bookings, events);
  const counts = {};
  for (const { event } of entries) counts[event.startDate] = (counts[event.startDate] ?? 0) + 1;
  const matches = entries.filter(({ event }) => selected ? event.startDate === selected : event.startDate.startsWith(month));

  return (
    <Page title="Calendar" onBack={onBack}>
      <Panel>
        <MonthCalendar month={month} selected={selected} counts={counts}
          onMonthChange={(nextMonth) => onChange({ month: nextMonth, date: null })}
          onSelect={(date) => onChange({ month, date: selected === date ? null : date })} />
        <Action label="Go to today" secondary onPress={() => onChange({ month: today.slice(0, 7), date: today })} />
      </Panel>
      <Text accessibilityRole="header" style={styles.month}>
        {selected ? formatCalendarDate(selected, fullDate) : 'This month’s reservations'}
      </Text>
      {selected && <Action label="Show full month" secondary onPress={() => onChange({ month, date: null })} />}
      {matches.map((entry) => <ReservationCard key={entry.booking.id} entry={entry} onOpen={onOpen} />)}
      {matches.length === 0 && <Copy>{selected ? 'No reservations on this date.' : 'No reservations this month.'}</Copy>}
      {entries.length === 0 && <Action label="Browse events" onPress={onBrowse} />}
    </Page>
  );
}

const styles = StyleSheet.create({
  month: { color: colors.ink, fontFamily: headingFont, fontSize: 16 },
});

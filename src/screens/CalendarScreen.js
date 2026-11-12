import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Action, Copy, Page, Panel } from '../components/FlowUI';
import { agendaEntries, formatCalendarDate, monthDays, shiftMonth } from '../data/agenda';
import { sriLankaDate } from '../data/reservations';
import { colors, headingFont } from '../theme';
import { ReservationCard } from './TicketsScreen';

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fullDate = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };

export default function CalendarScreen({ bookings, events, view, onChange, onBack, onOpen, onBrowse }) {
  const today = sriLankaDate();
  const selected = view.date ?? null;
  const month = view.month ?? (selected ?? today).slice(0, 7);
  const entries = agendaEntries(bookings, events);
  const counts = {};
  for (const { event } of entries) counts[event.startDate] = (counts[event.startDate] ?? 0) + 1;
  const matches = entries.filter(({ event }) => selected ? event.startDate === selected : event.startDate.startsWith(month));

  function changeMonth(offset) {
    onChange({ month: shiftMonth(month, offset), date: null });
  }

  return (
    <Page title="Calendar" onBack={onBack}>
      <Panel>
        <View style={styles.header}>
          <MonthButton label="Previous month" icon="chevron-back" onPress={() => changeMonth(-1)} />
          <Text accessibilityRole="header" style={styles.month}>
            {formatCalendarDate(`${month}-01`, { month: 'long', year: 'numeric' })}
          </Text>
          <MonthButton label="Next month" icon="chevron-forward" onPress={() => changeMonth(1)} />
        </View>
        <View style={styles.grid}>
          {weekdays.map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}
          {monthDays(month).map((date, index) => {
            if (!date) return <View key={index} style={styles.cell} />;
            const active = selected === date;
            const count = counts[date] ?? 0;
            return (
              <View key={date} style={styles.cell}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${formatCalendarDate(date, fullDate)}, ${count} ${count === 1 ? 'reservation' : 'reservations'}`}
                  accessibilityState={{ selected: active }}
                  aria-pressed={Platform.OS === 'web' ? active : undefined}
                  onPress={() => onChange({ month, date: active ? null : date })}
                  style={[styles.day, date === today && styles.today, active && styles.selected]}
                >
                  <Text style={[styles.number, active && styles.onSelected]}>{Number(date.slice(8))}</Text>
                  {count > 0 && <View style={[styles.dot, active && styles.selectedDot]} />}
                </Pressable>
              </View>
            );
          })}
        </View>
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

function MonthButton({ label, icon, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.arrow}>
      <Ionicons name={icon} size={20} color={colors.purpleDark} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  month: { color: colors.ink, fontFamily: headingFont, fontSize: 16 },
  arrow: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.285%', textAlign: 'center', color: colors.muted, fontSize: 12, paddingBottom: 8 },
  cell: { width: '14.285%', minHeight: 44, padding: 1 },
  day: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  today: { borderColor: colors.action },
  selected: { backgroundColor: colors.action },
  number: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  onSelected: { color: colors.white },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.action, position: 'absolute', bottom: 4 },
  selectedDot: { backgroundColor: colors.white },
});

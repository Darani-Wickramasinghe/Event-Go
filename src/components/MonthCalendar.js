import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatCalendarDate, monthDays, shiftMonth } from '../data/agenda';
import { sriLankaDate } from '../data/reservations';
import { colors, headingFont } from '../theme';

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const fullDate = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };

export default function MonthCalendar({ month, selected, onMonthChange, onSelect, counts, min, max }) {
  const today = sriLankaDate();
  return (
    <View>
      <View style={styles.header}>
        <MonthButton label="Previous month" icon="chevron-back" disabled={!!min && month <= min.slice(0, 7)}
          onPress={() => onMonthChange(shiftMonth(month, -1))} />
        <Text accessibilityRole="header" style={styles.month}>
          {formatCalendarDate(`${month}-01`, { month: 'long', year: 'numeric' })}
        </Text>
        <MonthButton label="Next month" icon="chevron-forward" disabled={!!max && month >= max.slice(0, 7)}
          onPress={() => onMonthChange(shiftMonth(month, 1))} />
      </View>
      <View style={styles.grid}>
        {weekdays.map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}
        {monthDays(month).map((date, index) => {
          if (!date) return <View key={index} style={styles.cell} />;
          const active = selected === date;
          const disabled = (!!min && date < min) || (!!max && date > max);
          const count = counts?.[date] ?? 0;
          const label = formatCalendarDate(date, fullDate);
          return (
            <View key={date} style={styles.cell}>
              <Pressable accessibilityRole="button"
                accessibilityLabel={counts ? `${label}, ${count} ${count === 1 ? 'reservation' : 'reservations'}` : label}
                accessibilityState={{ selected: active, disabled }}
                aria-pressed={Platform.OS === 'web' ? active : undefined}
                disabled={disabled} onPress={() => onSelect(date)}
                style={[styles.day, date === today && styles.today, active && styles.selected, disabled && styles.disabled]}>
                <Text style={[styles.number, active && styles.onSelected]}>{Number(date.slice(8))}</Text>
                {count > 0 && <View style={[styles.dot, active && styles.selectedDot]} />}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function MonthButton({ label, icon, disabled, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled}
      onPress={onPress} style={[styles.arrow, disabled && styles.disabled]}>
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
  disabled: { opacity: 0.4 },
  number: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  onSelected: { color: colors.white },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.action, position: 'absolute', bottom: 4 },
  selectedDot: { backgroundColor: colors.white },
});

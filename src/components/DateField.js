import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatCalendarDate } from '../data/agenda';
import { sriLankaDate } from '../data/reservations';
import { colors } from '../theme';
import { Action } from './FlowUI';
import MonthCalendar from './MonthCalendar';

export default function DateField({ label, value, expanded, onToggle, onChange, min, max, optional }) {
  const display = value ? formatCalendarDate(value, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Select a date';
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${display}`}
        accessibilityState={{ expanded }} onPress={onToggle} style={styles.trigger}>
        <Ionicons name="calendar-outline" size={19} color={colors.purpleDark} />
        <Text style={styles.value}>{display}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
      </Pressable>
      {expanded && <Picker value={value} min={min} max={max} optional={optional} onChange={onChange} />}
    </View>
  );
}

function Picker({ value, min, max, optional, onChange }) {
  const [month, setMonth] = useState(() => {
    const start = value || sriLankaDate();
    return (min && start < min ? min : max && start > max ? max : start).slice(0, 7);
  });
  return (
    <View style={styles.calendar}>
      <MonthCalendar month={month} selected={value} onMonthChange={setMonth} onSelect={onChange} min={min} max={max} />
      {optional && !!value && <Action label="Clear date" secondary onPress={() => onChange('')} />}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  trigger: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  value: { flex: 1, color: colors.ink, fontSize: 15 },
  calendar: { paddingHorizontal: 4, paddingBottom: 8, gap: 8 },
});

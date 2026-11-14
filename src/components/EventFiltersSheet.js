import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateField from './DateField';
import { dateRangeError, defaultFilters } from '../data/eventFilters';
import { categories } from '../data/events';
import { colors, headingFont } from '../theme';

export default function EventFiltersSheet({ filters, category, onClose, onApply }) {
  const [draft, setDraft] = useState(filters);
  const [draftCategory, setDraftCategory] = useState(category);
  const [error, setError] = useState('');
  const [openDate, setOpenDate] = useState(null);

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
    setError('');
  }

  function reset() {
    setOpenDate(null);
    setDraft(defaultFilters);
    setDraftCategory('All');
    setError('');
  }

  function dateField(label, field, bounds) {
    return <DateField label={label} value={draft[field]} expanded={openDate === field} optional {...bounds}
      onToggle={() => setOpenDate(openDate === field ? null : field)}
      onChange={(date) => { update(field, date); setOpenDate(null); }} />;
  }

  function apply() {
    const next = { ...draft, city: draft.city.trim(), from: draft.from.trim(), to: draft.to.trim() };
    const message = dateRangeError(next.from, next.to);
    if (message) {
      setError(message);
      return;
    }
    onApply(next, draftCategory);
  }

  return (
    <Modal transparent animationType="slide" onRequestClose={() => openDate ? setOpenDate(null) : onClose()}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView edges={['bottom']} style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>Filters</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={onClose} style={styles.close}>
              <Ionicons name="close" size={23} color={colors.ink} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.fields}>
            <View style={styles.group}>
              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {categories.map(({ label, icon }) => (
                  <Pressable
                    key={label}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    accessibilityState={{ selected: draftCategory === label }}
                    onPress={() => setDraftCategory(label)}
                    style={styles.category}
                  >
                    <View style={[styles.categoryIcon, draftCategory === label && styles.selected]}>
                      <Ionicons name={icon} size={23} color={draftCategory === label ? colors.white : colors.muted} />
                    </View>
                    <Text style={styles.optionText}>{label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <View style={styles.group}>
              <Text style={styles.label}>Date range</Text>
              {dateField('Start date', 'from', { max: draft.to })}
              {dateField('End date', 'to', { min: draft.from })}
              {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            </View>
            <View style={styles.row}>
              <FilterInput label="City" placeholder="Any city" icon="location-outline" value={draft.city} onChangeText={(value) => update('city', value)} />
            </View>
            <FilterOptions label="Price" options={['Any', 'Free', 'Paid']} value={draft.price} onSelect={(value) => update('price', value)} />
            <FilterOptions label="Venue setting" options={['Any', 'Indoor', 'Outdoor']} value={draft.setting} onSelect={(value) => update('setting', value)} />
            <FilterOptions label="Availability" options={['Any', 'Available']} value={draft.availability} onSelect={(value) => update('availability', value)} />
          </ScrollView>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={reset} style={[styles.action, styles.reset]}>
              <Text style={styles.actionText}>Reset</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={apply} style={[styles.action, styles.apply, styles.selected]}>
              <Text style={[styles.actionText, styles.whiteText]}>Apply filters</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FilterInput({ label, icon, ...props }) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputBox}>
        {icon && <Ionicons name={icon} size={20} color={colors.purpleDark} />}
        <TextInput accessibilityLabel={label} style={styles.input} placeholderTextColor={colors.muted} autoCorrect={false} {...props} />
      </View>
    </View>
  );
}

function FilterOptions({ label, options, value, onSelect }) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((option) => {
          const active = value === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityLabel={label + ', ' + option}
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(option)}
              style={[styles.option, active && styles.selected]}
            >
              <Text style={[styles.optionText, active && styles.whiteText]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(18, 13, 38, 0.64)' },
  sheet: { width: '100%', maxWidth: 520, maxHeight: '96%', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.white },
  handle: { alignSelf: 'center', width: 30, height: 4, marginTop: 10, borderRadius: 2, backgroundColor: '#D6D5DB' },
  header: { paddingLeft: 20, paddingRight: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.ink, fontSize: 24, fontFamily: headingFont },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  fields: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 20 },
  group: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  category: { alignItems: 'center', gap: 6, minWidth: 62 },
  categoryIcon: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  inputGroup: { flexGrow: 1, flexBasis: 0, minWidth: 0, gap: 6 },
  inputBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12 },
  input: { flex: 1, minHeight: 44, color: colors.ink, fontSize: 14 },
  option: { minHeight: 44, minWidth: 60, paddingHorizontal: 12, borderRadius: 11, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: colors.action, borderColor: colors.action },
  optionText: { color: colors.ink, fontSize: 14 },
  whiteText: { color: colors.white },
  error: { color: '#9E2638', fontSize: 13 },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
  action: { minHeight: 50, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  reset: { flex: 2, borderColor: colors.line },
  apply: { flex: 3 },
  actionText: { color: colors.ink, fontSize: 15, fontWeight: '700' },
});

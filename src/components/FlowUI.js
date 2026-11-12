import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, headingFont } from '../theme';

export function Page({ title, onBack, children }) {
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        {onBack && (
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color={colors.ink} />
          </Pressable>
        )}
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {children}
      </ScrollView>
    </View>
  );
}

export function Action({ label, icon, onPress, secondary, disabled }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.action, secondary && styles.secondary, (disabled || pressed) && styles.dim]}
    >
      {icon && <Ionicons name={icon} size={20} color={secondary ? colors.purpleDark : colors.white} />}
      <Text style={[styles.actionText, secondary && styles.secondaryText]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} style={[styles.input, props.multiline && styles.multiline]} {...props} />
    </View>
  );
}

export function Panel({ title, children }) {
  return (
    <View style={styles.panel}>
      {title && <Text accessibilityRole="header" style={styles.subtitle}>{title}</Text>}
      {children}
    </View>
  );
}

export function Copy({ children, alert }) {
  return <Text accessibilityRole={alert ? 'alert' : undefined} style={[styles.copy, alert && styles.alert]}>{children}</Text>;
}

export function Choices({ label, options, selected, onSelect }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choices}>
        {options.map((item) => {
          const active = selected.includes(item);
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityLabel={item}
              accessibilityState={{ selected: active }}
              aria-pressed={Platform.OS === 'web' ? active : undefined}
              onPress={() => onSelect(item)}
              style={[styles.choice, active && styles.active]}
            >
              <Text style={[styles.label, active && styles.activeLabel]}>{item}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  header: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.line },
  back: { width: 44, height: 44, marginLeft: -10, justifyContent: 'center', alignItems: 'center' },
  title: { flexShrink: 1, color: colors.ink, fontFamily: headingFont, fontSize: 24 },
  content: { padding: 20, gap: 16, paddingBottom: 28 },
  action: { minHeight: 50, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.action, backgroundColor: colors.action },
  secondary: { borderColor: colors.line, backgroundColor: colors.white },
  dim: { opacity: 0.58 },
  actionText: { flexShrink: 1, color: colors.white, fontWeight: '700', fontSize: 15, textAlign: 'center' },
  secondaryText: { color: colors.purpleDark },
  field: { gap: 6 },
  label: { color: colors.ink, fontWeight: '600', fontSize: 14 },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, color: colors.ink, fontSize: 16 },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  panel: { gap: 10, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: '#FAFAFF' },
  subtitle: { color: colors.ink, fontSize: 17, fontFamily: headingFont },
  copy: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  alert: { color: '#9E2638' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { justifyContent: 'center', minHeight: 44, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 13, backgroundColor: colors.white },
  active: { backgroundColor: colors.lavender, borderColor: colors.action },
  activeLabel: { color: colors.purpleDark },
});

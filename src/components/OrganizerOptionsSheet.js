import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Copy, HeaderAction, SectionHeading } from './FlowUI';
import { colors, iconSizes, radii, semanticColors, spacing, touchTargets, typography } from '../theme';

export default function OrganizerOptionsSheet({ title, detail, options = [], onClose, children }) {
  return (
    <Modal transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable accessible={false} onPress={onClose} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.heading}>
            <SectionHeading style={styles.title}>{title}</SectionHeading>
            <HeaderAction label="Close options" icon="close-outline" onPress={onClose} />
          </View>
          {!!detail && <Copy>{detail}</Copy>}
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
            {children}
            {options.map(({ label, icon, onPress, selected, destructive, disabled }) => (
              <Pressable key={label} accessibilityRole="button" accessibilityLabel={label}
                aria-pressed={selected} disabled={disabled} accessibilityState={{ disabled }} onPress={onPress}
                style={({ pressed }) => [styles.option, pressed && styles.pressed, disabled && styles.disabled]}>
                <Ionicons name={icon} size={iconSizes.md} color={destructive ? semanticColors.error.text : colors.primary} />
                <Text style={[styles.optionLabel, destructive && styles.danger]}>{label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(21, 25, 54, 0.35)' },
  sheet: { width: '100%', maxWidth: 520, maxHeight: '86%', paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.xs,
    borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, backgroundColor: colors.surface },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  title: { flex: 1, minWidth: 0 },
  option: { minHeight: touchTargets.standard, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.xs, gap: spacing.sm, borderRadius: radii.md },
  optionLabel: { ...typography.label, color: colors.text, flexShrink: 1 },
  pressed: { backgroundColor: colors.lavender },
  disabled: { opacity: 0.55 },
  danger: { color: semanticColors.error.text },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, iconSizes, radii, semanticColors, shadows, spacing, touchTargets, typography } from '../theme';

const actionColors = {
  primary: { fill: colors.primary, border: colors.primary, text: colors.surface },
  secondary: { fill: colors.surface, border: colors.border, text: colors.purpleDark },
  danger: { fill: semanticColors.error.text, border: semanticColors.error.text, text: colors.surface },
};

export function HeaderAction({ label, icon, onPress, badge, inverse = false }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed, focused }) => [styles.headerAction,
        pressed && (inverse ? styles.inverseHeaderActionPressed : styles.headerActionPressed),
        focused && styles.focusRing, focused && inverse && styles.inverseFocusRing]}>
      <Ionicons name={icon} size={iconSizes.lg} color={inverse ? colors.surface : colors.text} />
      {!!badge && <View style={[styles.headerBadge, inverse && styles.inverseHeaderBadge]}>
        <Text style={[styles.headerBadgeText, inverse && styles.inverseHeaderBadgeText]}>{badge > 99 ? '99+' : badge}</Text>
      </View>}
    </Pressable>
  );
}

export function Page({ title, onBack, banner, leading, actions, footer, showsVerticalScrollIndicator, children }) {
  return (
    <View style={styles.page}>
      {!banner && <View style={styles.header}>
        {leading ?? (onBack && <HeaderAction label="Go back" icon="arrow-back" onPress={onBack} />)}
        <Text accessibilityRole="header" accessibilityLabel={title} numberOfLines={2} style={styles.title}>{title}</Text>
        {actions && <View style={styles.headerActions}>{actions}</View>}
      </View>}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={showsVerticalScrollIndicator} keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        contentInsetAdjustmentBehavior="never" contentContainerStyle={banner ? undefined : styles.content}>
        {banner ? <>{banner}<View style={styles.content}>{children}</View></> : children}
      </ScrollView>
      {footer && <View style={styles.footer}>{footer}</View>}
    </View>
  );
}

export function Action({ label, accessibilityLabel = label, icon, onPress, secondary,
  variant = secondary ? 'secondary' : 'primary', disabled, loading = false }) {
  const unavailable = !!disabled || loading;
  const appearance = actionColors[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: unavailable, busy: loading }}
      aria-busy={loading || undefined}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed, focused }) => [styles.action, { backgroundColor: appearance.fill, borderColor: appearance.border },
        unavailable ? styles.disabled : pressed && styles.pressed, focused && styles.focusRing]}
    >
      {loading
        ? <ActivityIndicator size="small" color={appearance.text} />
        : icon && <Ionicons name={icon} size={iconSizes.md} color={appearance.text} />}
      <Text style={[styles.actionText, { color: appearance.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, hint, error, style, onFocus, onBlur, leadingIcon, trailingAction, ...props }) {
  const [focused, setFocused] = useState(false);
  const input = <TextInput accessibilityLabel={label} placeholderTextColor={colors.textSecondary} {...props}
    {...(Platform.OS === 'web' && !!error && { 'aria-invalid': true })}
    style={[styles.input, props.multiline && styles.multiline, style, !!leadingIcon && styles.inputWithIcon,
      trailingAction && styles.inputWithAction, focused && styles.focusedInput,
      !!error && styles.invalidInput, props.editable === false && styles.disabled]}
    onFocus={(event) => { setFocused(true); onFocus?.(event); }}
    onBlur={(event) => { setFocused(false); onBlur?.(event); }} />;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {leadingIcon || trailingAction ? (
        <View>
          {input}
          {!!leadingIcon && <View pointerEvents="none" style={styles.inputIcon}>
            <Ionicons name={leadingIcon} size={iconSizes.md} color={colors.textSecondary} />
          </View>}
          {trailingAction && <View style={styles.inputAction}>{trailingAction}</View>}
        </View>
      ) : input}
      {!!(error || hint) && <Text accessibilityRole={error ? 'alert' : undefined}
        style={[styles.caption, !!error && styles.alert]}>{error || hint}</Text>}
    </View>
  );
}

export function Panel({ title, children, elevated = false, style }) {
  return (
    <View style={[styles.panel, elevated && shadows.card, style]}>
      {title && <SectionHeading>{title}</SectionHeading>}
      {children}
    </View>
  );
}

export function SectionHeading({ children, style }) {
  return <Text accessibilityRole="header" style={[styles.subtitle, style]}>{children}</Text>;
}

export function Badge({ label, tone = 'neutral' }) {
  const appearance = semanticColors[tone] ?? (tone === 'accent'
    ? { surface: colors.lavender, text: colors.purpleDark }
    : { surface: colors.background, text: colors.textSecondary });
  return (
    <View style={[styles.badge, { backgroundColor: appearance.surface }]}>
      <Text style={[typography.caption, { color: appearance.text }]}>{label}</Text>
    </View>
  );
}

export function LoadingState({ label = 'Loading…' }) {
  return (
    <View accessibilityLiveRegion="polite" aria-live="polite" style={styles.state}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Copy>{label}</Copy>
    </View>
  );
}

export function EmptyState({ icon, title, description, children }) {
  return (
    <Panel>
      <View style={styles.state}>
        {icon && <View style={styles.stateIcon}><Ionicons name={icon} size={iconSizes.md} color={colors.purpleDark} /></View>}
        <View style={styles.stateText}>
          <SectionHeading style={styles.emptyTitle}>{title}</SectionHeading>
          {!!description && <Copy>{description}</Copy>}
        </View>
      </View>
      {children}
    </Panel>
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
              style={({ pressed, focused }) => [styles.choice, active && styles.active, pressed && styles.pressed,
                focused && styles.focusRing]}
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
  page: { flex: 1, minHeight: 0, minWidth: 0, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg,
    minHeight: touchTargets.minimum + spacing.md, flexShrink: 0, paddingVertical: spacing.xs,
    borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  headerAction: { width: touchTargets.minimum, height: touchTargets.minimum, flexShrink: 0,
    borderRadius: radii.md, justifyContent: 'center', alignItems: 'center' },
  headerActionPressed: { backgroundColor: colors.lavender },
  inverseHeaderActionPressed: { backgroundColor: 'rgba(255, 255, 255, 0.15)' },
  inverseFocusRing: Platform.OS === 'web' ? { outlineColor: colors.surface } : {},
  headerActions: { flexDirection: 'row', flexShrink: 0, gap: spacing.xxs },
  headerBadge: { position: 'absolute', top: spacing.xxs, right: 0, minWidth: iconSizes.sm, borderRadius: radii.pill,
    paddingHorizontal: spacing.xxs, alignItems: 'center', backgroundColor: colors.primary },
  headerBadgeText: { ...typography.caption, color: colors.surface },
  inverseHeaderBadge: { backgroundColor: colors.surface },
  inverseHeaderBadgeText: { color: colors.primary },
  title: { ...typography.title, flex: 1, minWidth: 0, color: colors.text },
  scroll: { flex: 1, minHeight: 0, minWidth: 0 },
  footer: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, gap: spacing.xs,
    borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  content: { minWidth: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  action: { minHeight: touchTargets.standard, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.md, borderWidth: 1 },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.86 },
  focusRing: Platform.OS === 'web'
    ? { outlineColor: colors.primary, outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2 }
    : {},
  actionText: { ...typography.button, flexShrink: 1, textAlign: 'center' },
  field: { gap: spacing.xs },
  label: { ...typography.label, color: colors.text },
  input: { ...typography.input, minHeight: touchTargets.standard, borderWidth: 1, borderColor: colors.controlBorder,
    borderRadius: radii.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, color: colors.text,
    backgroundColor: colors.surface },
  inputWithIcon: { paddingLeft: iconSizes.md + spacing.lg },
  inputWithAction: { paddingRight: touchTargets.standard },
  inputIcon: { position: 'absolute', left: spacing.sm, top: 0, bottom: 0, justifyContent: 'center' },
  inputAction: { position: 'absolute', right: spacing.xxs, top: 0, bottom: 0, justifyContent: 'center' },
  focusedInput: { borderColor: colors.primary },
  invalidInput: { borderColor: semanticColors.error.text },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  panel: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surface },
  subtitle: { ...typography.section, color: colors.text },
  copy: { ...typography.body, color: colors.textSecondary },
  caption: { ...typography.caption, color: colors.textSecondary },
  alert: { color: semanticColors.error.text },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  choice: { justifyContent: 'center', minHeight: touchTargets.minimum, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, backgroundColor: colors.surface },
  active: { backgroundColor: colors.lavender, borderColor: colors.primary },
  activeLabel: { color: colors.purpleDark },
  badge: { alignSelf: 'flex-start', borderRadius: radii.pill,
    paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs, overflow: 'hidden' },
  state: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: touchTargets.standard },
  stateIcon: { width: touchTargets.minimum, height: touchTargets.minimum, borderRadius: radii.md,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lavender },
  stateText: { flex: 1, minWidth: 0, gap: spacing.xxs },
  emptyTitle: { ...typography.button },
});

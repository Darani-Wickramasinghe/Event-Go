// Displays organizer notifications and controls for muting or filtering alerts.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Action, Choices, Copy, EmptyState, Page, Panel } from '../components/FlowUI';
import { organizerAlertTypes } from '../data/organizerNotifications';
import { colors, iconSizes, radii, spacing, touchTargets, typography } from '../theme';

const dateFormat = new Intl.DateTimeFormat('en-LK', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Colombo',
});

export function OrganizerNotificationsScreen({ notices, onRead, onOpenEvent, onSettings, onBack }) {
  const [filter, setFilter] = useState('All');
  const unread = notices.filter((notice) => !notice.read);
  const visible = filter === 'Unread' ? unread : notices;

  return (
    <Page title="Notifications" onBack={onBack}>
      <Action label="Notification settings" icon="settings-outline" secondary onPress={onSettings} />
      <Choices label="Show notifications" options={['All', 'Unread']} selected={[filter]} onSelect={setFilter} />
      {unread.length > 0 && <Action label="Mark all as read" secondary onPress={() => onRead(unread.map(({ id }) => id))} />}
      {visible.map((notice) => {
        const type = organizerAlertTypes.find(({ key }) => key === notice.type);
        return (
          <Panel key={notice.id}>
            <View style={styles.heading}>
              <View style={styles.icon}><Ionicons name={type.icon} size={iconSizes.md} color={colors.purpleDark} /></View>
              <View style={styles.content}>
                <Text accessibilityRole="header" style={styles.title}>{type.title}{notice.read ? '' : ' · New'}</Text>
                <Copy>{notice.event.title}</Copy>
              </View>
            </View>
            <Copy>{notice.detail}</Copy>
            <Copy>{dateFormat.format(notice.createdAt)}</Copy>
            <Action label={`Manage ${notice.event.title}`} secondary onPress={() => {
              onRead([notice.id]);
              onOpenEvent(notice.event);
            }} />
            {!notice.read && <Action label="Mark as read" secondary onPress={() => onRead([notice.id])} />}
          </Panel>
        );
      })}
      {visible.length === 0 && <EmptyState icon="notifications-outline"
        title={filter === 'Unread' ? 'No unread notifications' : 'No notifications yet'}
        description={filter === 'All' ? 'New event activity will appear here when its alerts are enabled.' : undefined} />}
    </Page>
  );
}

export function OrganizerNotificationSettings({ preferences, onChange, onBack }) {
  const muted = !!preferences.muted;

  return (
    <Page title="Notification settings" onBack={onBack}>
      <Panel title="In-app alerts">
        <AlertSwitch label="Mute all alerts" value={muted} onChange={(value) => onChange('muted', value)} />
        <Copy>Hidden alerts stay in your inbox history.</Copy>
      </Panel>
      <Panel title="Event activity">
        {muted && <Copy>Turn off Mute all alerts to edit individual settings.</Copy>}
        {organizerAlertTypes.map(({ key, label }) => (
          <AlertSwitch key={key} label={label} value={!muted && preferences[key] !== false}
            disabled={muted} onChange={(value) => onChange(key, value)} />
        ))}
      </Panel>
    </Page>
  );
}

function AlertSwitch({ label, value, disabled = false, onChange }) {
  function toggle() {
    if (!disabled) onChange(!value);
  }

  function handleKeyDown(event) {
    if (event.key !== ' ' && event.key !== 'Spacebar') return;
    event.preventDefault();
    if (!event.repeat) toggle();
  }

  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={label}
      aria-checked={value} accessibilityState={{ disabled }} disabled={disabled} onPress={toggle}
      {...(Platform.OS === 'web' && { onKeyDown: handleKeyDown })}
      style={({ focused, pressed }) => [styles.heading, styles.switchRow, disabled && styles.switchDisabled,
        (focused || pressed) && styles.switchActive]}>
      <Text style={[styles.content, styles.title]}>{label}</Text>
      <View style={[styles.switchTrack, value && styles.switchTrackOn]}>
        <View style={[styles.switchThumb, value && styles.switchThumbOn]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: touchTargets.minimum },
  content: { flex: 1, minWidth: 0 },
  icon: { width: 38, height: 38, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lavender },
  title: { ...typography.button, color: colors.text },
  switchRow: { minHeight: touchTargets.standard, borderRadius: radii.sm },
  switchActive: { backgroundColor: colors.lavender },
  switchDisabled: { opacity: 0.5 },
  switchTrack: { width: 38, height: 18, borderRadius: 9, paddingHorizontal: 2,
    justifyContent: 'center', backgroundColor: '#D5D9E7' },
  switchTrackOn: { backgroundColor: '#C7DAFF', alignItems: 'flex-end' },
  switchThumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.white },
  switchThumbOn: { backgroundColor: colors.action },
});

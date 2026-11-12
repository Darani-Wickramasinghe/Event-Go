import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, Choices, Copy, Field, Page, Panel } from '../components/FlowUI';
import { categories } from '../data/events';
import { bookingStatus, eventTime } from '../data/reservations';
import { colors } from '../theme';

export function DemoSignIn({ name, onSignIn, onBack }) {
  const [value, setValue] = useState(name);
  return (
    <Page title="Welcome to Eventora" onBack={onBack}>
      <Copy>Create or reopen the demo profile on this device. Use a sample name.</Copy>
      <Field label="Display name" value={value} onChangeText={setValue} autoCapitalize="words" maxLength={70} />
      <Action label="Continue with demo profile" onPress={() => onSignIn(value.trim())} disabled={!value.trim()} />
    </Page>
  );
}

export function ProfileScreen({ signedIn, profile, onOpen }) {
  return (
    <Page title="Profile">
      <Panel title={signedIn ? profile.name : 'Guest'}>
        <Copy>{signedIn ? `${profile.city} · Demo profile` : 'Browse events as a guest or set up a demo profile to reserve places.'}</Copy>
        <Action label={signedIn ? 'Edit profile and interests' : 'Set up demo profile'} onPress={() => onOpen(signedIn ? 'settings' : 'signIn')} />
      </Panel>
      <PersonalTools onOpen={onOpen} />
      <Panel title="Demo tools">
        <Copy>Try the organizer and moderator workflows on this device.</Copy>
        <Action label="Organizer workspace" secondary onPress={() => onOpen('organizer')} />
        <Action label="Admin workspace" secondary onPress={() => onOpen('admin')} />
      </Panel>
    </Page>
  );
}

function PersonalTools({ onOpen }) {
  return (
    <>
      <Action label="My Registrations & Tickets" icon="ticket-outline" secondary onPress={() => onOpen('registrations')} />
      <Action label="Calendar" icon="calendar-outline" secondary onPress={() => onOpen('calendar')} />
      <Action label="Saved Events" icon="bookmark-outline" secondary onPress={() => onOpen('saved')} />
      <Action label="Notifications" icon="notifications-outline" secondary onPress={() => onOpen('notifications')} />
      <Action label="Settings" icon="settings-outline" secondary onPress={() => onOpen('settings')} />
    </>
  );
}

export function SideMenu({ onOpen, onClose }) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.drawer} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={styles.menu}>
            <Action label="Close menu" icon="close" secondary onPress={onClose} />
            <PersonalTools onOpen={onOpen} />
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export function SettingsScreen({ profile, signedIn, onSave, onSignOut, onBack }) {
  const [draft, setDraft] = useState(profile);
  function toggleInterest(interest) {
    setDraft((current) => ({
      ...current,
      interests: current.interests.includes(interest)
        ? current.interests.filter((item) => item !== interest)
        : [...current.interests, interest],
    }));
  }

  return (
    <Page title="Settings" onBack={onBack}>
      {signedIn && (
        <Field label="Display name" value={draft.name} maxLength={70} onChangeText={(name) => setDraft({ ...draft, name })} />
      )}
      <Field label="Home city" value={draft.city} maxLength={50} onChangeText={(city) => setDraft({ ...draft, city })} />
      <Choices label="Interests" options={categories.slice(1).map((category) => category.label)} selected={draft.interests} onSelect={toggleInterest} />
      <Choices label="In-app reminders" options={['On', 'Off']} selected={[draft.reminders ? 'On' : 'Off']} onSelect={(value) => setDraft({ ...draft, reminders: value === 'On' })} />
      <Action label="Save settings" disabled={!draft.city.trim() || (signedIn && !draft.name.trim())} onPress={() => onSave({ ...draft, name: draft.name.trim(), city: draft.city.trim() })} />
      {signedIn && <Action label="Sign out of demo profile" secondary onPress={onSignOut} />}
    </Page>
  );
}

export function NotificationsScreen({ data, events, onRead, onOpen, onBack }) {
  const reminders = data.profile.reminders ? data.bookings.flatMap((booking) => {
    const event = events.find((item) => item.id === booking.eventId);
    if (!event || !['Confirmed', 'Rescheduled'].includes(bookingStatus(event, booking))) return [];
    const untilStart = eventTime(event) - Date.now();
    return untilStart > 0 && untilStart <= 86400000
      ? [{ id: `reminder-${booking.id}`, eventId: event.id, title: `${event.title} starts within 24 hours`, message: event.date, read: true }]
      : [];
  }) : [];
  const notices = [...data.notifications, ...reminders];
  return (
    <Page title="Notifications" onBack={onBack}>
      {notices.length === 0 && <Copy>You’re all caught up.</Copy>}
      {notices.map((notice) => (
        <Panel title={notice.title} key={notice.id}>
          <Copy>{notice.read ? '' : 'New · '}{notice.message}</Copy>
          <Action label="Open event update" secondary onPress={() => { onRead(notice.id); onOpen(notice.eventId); }} />
        </Panel>
      ))}
    </Page>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(18, 13, 38, 0.56)' },
  drawer: { flex: 1, width: '86%', maxWidth: 320, backgroundColor: colors.white },
  menu: { padding: 18, gap: 10 },
});

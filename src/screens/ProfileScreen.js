import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, Choices, Copy, Field, Page, Panel } from '../components/FlowUI';
import { categories } from '../data/events';
import { colors } from '../theme';

export function ProfileScreen({ signedIn, profile, onOpen, onSwitchRole }) {
  return (
    <Page title="Profile">
      <Panel title={signedIn ? profile.name : 'Guest'}>
        <Copy>{signedIn ? `${profile.city} · Demo profile` : 'Browse events as a guest or set up a demo profile to reserve places.'}</Copy>
        {signedIn ? (
          <>
            {profile.email && <Copy>{profile.email}</Copy>}
            <Action label="Edit profile and interests" onPress={() => onOpen('settings')} />
            {!profile.email && <Action label="Finish account setup" secondary onPress={() => onOpen('signUp')} />}
          </>
        ) : (
          <>
            <Action label="Log in" onPress={() => onOpen('signIn')} />
            {!profile.email && <Action label="Sign up" secondary onPress={() => onOpen('signUp')} />}
          </>
        )}
      </Panel>
      <PersonalTools onOpen={onOpen} />
      <Action label="Switch role" secondary onPress={onSwitchRole} />
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
      <Panel title="Profile and discovery">
        {signedIn && (
          <Field label="Display name" value={draft.name} maxLength={70} onChangeText={(name) => setDraft({ ...draft, name })} />
        )}
        <Field label="Home city" value={draft.city} maxLength={50} onChangeText={(city) => setDraft({ ...draft, city })} />
        <Choices label="Interests" options={categories.slice(1).map((category) => category.label)} selected={draft.interests} onSelect={toggleInterest} />
      </Panel>
      <Panel title="Event reminders">
        <Choices label="In-app reminders" options={['On', 'Off']} selected={[draft.reminders ? 'On' : 'Off']} onSelect={(value) => setDraft({ ...draft, reminders: value === 'On' })} />
        {draft.reminders && (
          <Choices
            label="Remind me before the event"
            options={['1 hour', '24 hours', '48 hours']}
            selected={[draft.reminderHours === 1 ? '1 hour' : `${draft.reminderHours} hours`]}
            onSelect={(value) => setDraft({ ...draft, reminderHours: parseInt(value, 10) })}
          />
        )}
        <Copy>Reminders appear in the Notifications screen on this device.</Copy>
      </Panel>
      <Action label="Save settings" disabled={!draft.city.trim() || (signedIn && !draft.name.trim())} onPress={() => onSave({ ...draft, name: draft.name.trim(), city: draft.city.trim() })} />
      {signedIn && <Action label="Sign out of demo profile" secondary onPress={onSignOut} />}
    </Page>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(18, 13, 38, 0.56)' },
  drawer: { flex: 1, width: '86%', maxWidth: 320, backgroundColor: colors.white },
  menu: { padding: 18, gap: 10 },
});

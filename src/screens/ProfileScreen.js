import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Action, Choices, Copy, Field, Page, Panel } from '../components/FlowUI';
import { personalTools } from '../components/SideMenu';
import { categories } from '../data/events';
import { colors, headingFont } from '../theme';

export function ProfileScreen({ signedIn, profile, onOpen, onSwitchRole, onBack }) {
  const [expanded, setExpanded] = useState(false);
  const name = signedIn && profile.name.trim() ? profile.name.trim() : 'Guest';
  const initials = name.split(/\s+/).slice(0, 2).map((word) => Array.from(word)[0]).join('').toUpperCase();
  const interests = categories.filter(({ label }) => profile.interests.includes(label));
  const bio = signedIn ? profile.bio?.trim() : '';
  const canExpand = bio?.length > 150;

  return (
    <Page title="Profile" onBack={onBack}>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          {signedIn ? <Text style={styles.initials}>{initials}</Text> : <Ionicons name="person-outline" size={33} color={colors.purpleDark} />}
        </View>
        <Text accessibilityRole="header" style={styles.name}>{name}</Text>
        {signedIn && !!profile.city && <Text style={styles.city}>{profile.city}</Text>}
        {signedIn ? (
          <>
            <ProfileButton label="Edit Profile" icon="create-outline" onPress={() => onOpen('editProfile')} />
            {!profile.email && <ProfileButton label="Finish account setup" onPress={() => onOpen('signUp')} />}
          </>
        ) : (
          <>
            <ProfileButton label="Log in" onPress={() => onOpen('signIn')} />
            {!profile.email && <ProfileButton label="Sign up" onPress={() => onOpen('signUp')} />}
          </>
        )}
      </View>
      {signedIn && (
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>About Me</Text>
          <Copy>{canExpand && !expanded ? `${bio.slice(0, 150).trimEnd()}…` : bio || 'Add a short bio in Edit Profile.'}</Copy>
          {canExpand && <ProfileButton label={expanded ? 'Read less' : 'Read more'} compact expanded={expanded} onPress={() => setExpanded(!expanded)} />}
        </View>
      )}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Interests</Text>
          <ProfileButton label="Change interests" text="Change" icon="create-outline" compact onPress={() => onOpen('interests')} />
        </View>
        <View style={styles.chips}>
          {interests.map(({ label, color }) => (
            <View key={label} style={[styles.chip, { backgroundColor: color }]}><Text style={styles.chipLabel}>{label}</Text></View>
          ))}
        </View>
        {!interests.length && <Copy>Pick the kinds of events you’d like to discover.</Copy>}
      </View>
      <View style={styles.tools}>
        {personalTools.map(({ name, label, icon }) => (
          <ProfileRow key={name} label={label} icon={icon} onPress={() => onOpen(name)} />
        ))}
        <ProfileRow label="Switch role" icon="swap-horizontal-outline" onPress={onSwitchRole} />
      </View>
    </Page>
  );
}

function ProfileButton({ label, text, icon, compact, expanded, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={expanded === undefined ? undefined : { expanded }} onPress={onPress}
      style={({ pressed }) => [styles.button, compact ? styles.compactButton : styles.centerButton, pressed && styles.pressed]}>
      {icon && <Ionicons name={icon} size={compact ? 15 : 19} color={colors.purpleDark} />}
      <Text style={styles.buttonLabel}>{text ?? label}</Text>
    </Pressable>
  );
}

function ProfileRow({ label, icon, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={colors.purpleDark} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

export function SettingsScreen({ profile, signedIn, onSave, onSignOut, onBack, mode = 'settings' }) {
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
    <Page title={mode === 'editProfile' ? 'Edit Profile' : mode === 'interests' ? 'Interests' : 'Settings'} onBack={onBack}>
      {mode !== 'interests' && <Panel title="Profile and discovery">
        {signedIn && (
          <Field label="Display name" value={draft.name} maxLength={70} onChangeText={(name) => setDraft({ ...draft, name })} />
        )}
        <Field label="Home city" value={draft.city} maxLength={50} onChangeText={(city) => setDraft({ ...draft, city })} />
        {signedIn && <Field label="About Me" multiline value={draft.bio ?? ''} maxLength={400} onChangeText={(bio) => setDraft({ ...draft, bio })} />}
      </Panel>}
      {mode !== 'editProfile' && <Choices label="Interests" options={categories.slice(1).map((category) => category.label)} selected={draft.interests} onSelect={toggleInterest} />}
      {mode === 'settings' && <Panel title="Event reminders">
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
      </Panel>}
      <Action label={mode === 'settings' ? 'Save settings' : 'Save changes'} disabled={mode !== 'interests' && (!draft.city.trim() || (signedIn && !draft.name.trim()))}
        onPress={() => onSave({ ...draft, name: draft.name.trim(), city: draft.city.trim(), bio: draft.bio?.trim() ?? '' })} />
      {signedIn && mode === 'settings' && <Action label="Sign out of demo profile" secondary onPress={onSignOut} />}
    </Page>
  );
}

const styles = StyleSheet.create({
  identity: { alignItems: 'center', gap: 8, paddingTop: 7, paddingBottom: 14 },
  avatar: { width: 82, height: 82, borderRadius: 41, backgroundColor: colors.lavender, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  initials: { color: colors.purpleDark, fontSize: 30, fontFamily: headingFont },
  name: { color: colors.ink, fontSize: 23, fontFamily: headingFont, textAlign: 'center' },
  city: { color: colors.muted, fontSize: 14, marginBottom: 5 },
  section: { gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  button: { flexDirection: 'row', gap: 7, alignItems: 'center', alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: colors.action },
  centerButton: { alignSelf: 'center' },
  compactButton: { backgroundColor: colors.lavender, borderWidth: 0, paddingHorizontal: 11 },
  buttonLabel: { color: colors.purpleDark, fontSize: 14, fontWeight: '600' },
  pressed: { backgroundColor: colors.lavender },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderRadius: 18, paddingHorizontal: 12, paddingVertical: 6 },
  chipLabel: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  tools: { borderTopWidth: 1, borderColor: colors.line, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 11, paddingVertical: 8 },
  rowLabel: { flex: 1, color: colors.ink, fontSize: 14 },
});

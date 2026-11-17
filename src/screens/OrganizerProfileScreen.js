// Displays and edits organizer details and shows the public organizer profile.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Action, Copy, Field, Page, Panel, SectionHeading } from '../components/FlowUI';
import PhotoPicker from '../components/PhotoPicker';
import OrganizerOptionsSheet from '../components/OrganizerOptionsSheet';
import useOrganizerBack from '../hooks/useOrganizerBack';
import { colors, headingFont, iconSizes, radii, semanticColors, spacing, touchTargets, typography } from '../theme';

export function OrganizerAccountProfile({ profile, saved, onEdit, onSettings, onNotifications, onSignOut }) {
  const [failedPicture, setFailedPicture] = useState(null);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const name = profile.organization || profile.name || 'Organizer';
  const initials = name.trim().split(/\s+/).slice(0, 2).map((word) => Array.from(word)[0]).join('').toUpperCase();

  return (
    <>
      <Panel elevated>
        <View style={styles.identity}>
          {profile.picture && profile.picture !== failedPicture
            ? <Image source={{ uri: profile.picture }} style={styles.avatar} accessibilityRole="image" accessibilityLabel="Organization profile picture"
                onError={() => setFailedPicture(profile.picture)} />
            : <View style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View>}
          <View style={styles.identityText}>
            <SectionHeading>{name}</SectionHeading>
            {!!profile.name && profile.name !== name && <Copy>{profile.name}</Copy>}
            {!!profile.email && <Copy>{profile.email}</Copy>}
          </View>
        </View>
        <Action label="Edit profile" icon="create-outline" onPress={onEdit} />
        {saved && <Text accessibilityLiveRegion="polite" aria-live="polite" style={styles.saved}>Profile saved.</Text>}
      </Panel>
      {!!(profile.description || profile.phone) && <Panel title="Organization details">
        {!!profile.description && <Copy>{profile.description}</Copy>}
        {!!profile.phone && <View>
          <Text style={styles.label}>Contact number</Text><Copy>{profile.phone}</Copy>
        </View>}
      </Panel>}
      <Panel title="Settings">
        <SettingsRow label="Account preferences" icon="person-circle-outline" onPress={onSettings} divided />
        <SettingsRow label="Notification preferences" icon="notifications-outline" onPress={onNotifications} />
      </Panel>
      <Action label="Sign out" icon="log-out-outline" secondary onPress={() => setSignOutOpen(true)} />
      {signOutOpen && <OrganizerOptionsSheet title="Sign out of Eventora?" onClose={() => setSignOutOpen(false)}
        options={[{ label: 'Confirm sign out', icon: 'log-out-outline', destructive: true, onPress: onSignOut }]} />}
    </>
  );
}

function SettingsRow({ label, icon, onPress, divided }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => [styles.settingsRow, divided && styles.divided, pressed && styles.pressed]}>
      <Ionicons name={icon} size={iconSizes.md} color={colors.purpleDark} />
      <Text style={[styles.label, styles.settingsLabel]}>{label}</Text>
      <Ionicons name="chevron-forward" size={iconSizes.sm} color={colors.textSecondary} />
    </Pressable>
  );
}

export function EditOrganizerProfile({ profile, onSave, onBack }) {
  const [draft, setDraft] = useState(profile);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);

  function back() {
    if (!saveLock.current && !preparingPhoto) onBack();
  }
  useOrganizerBack(back);

  function change(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError('');
  }

  async function save() {
    if (saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setError('');
    try {
      await onSave(draft);
    } catch (failure) {
      setError(failure.message || 'Profile could not be saved. Try again.');
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

  return (
    <Page title="Edit profile" onBack={back}
      footer={<>
        {!!error && <Copy alert>{error}</Copy>}
        <Action label="Save profile" icon="checkmark" onPress={save} loading={saving} disabled={preparingPhoto} />
      </>}>
      <Copy>Attendees can see the details you save here. Use a contact email you want to share.</Copy>
      <PhotoPicker profile image={draft.picture ? { uri: draft.picture } : undefined}
        hasCustomImage={!!draft.picture} onChange={(picture) => change('picture', picture)} onBusyChange={setPreparingPhoto} />
      <Panel title="Personal information">
        <Field label="Organizer name" value={draft.name} maxLength={70} onChangeText={(value) => change('name', value)} />
      </Panel>
      <Panel title="Organization details">
        <Field label="Organization name" value={draft.organization} maxLength={80} onChangeText={(value) => change('organization', value)} />
        <Field label="Organization description" value={draft.description} multiline maxLength={700}
          onChangeText={(value) => change('description', value)} />
      </Panel>
      <Panel title="Contact details">
        <Field label="Email address" value={draft.email} keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
          maxLength={120} onChangeText={(value) => change('email', value)} />
        <Field label="Contact number" value={draft.phone} keyboardType="phone-pad" maxLength={30}
          onChangeText={(value) => change('phone', value)} />
      </Panel>
      <Action label="Cancel editing" secondary onPress={back} disabled={saving || preparingPhoto} />
    </Page>
  );
}

export default function OrganizerProfileScreen({ profile, onBack }) {
  return (
    <Page title="Organizer profile" onBack={onBack}>
      <OrganizerProfileDetails profile={profile} />
    </Page>
  );
}

export function OrganizerProfileDetails({ profile }) {
  return (
    <>
      <Panel>
        <View style={styles.identity}>
          {profile.picture ? (
            <Image source={{ uri: profile.picture }} style={styles.avatar} accessibilityRole="image"
              accessibilityLabel="Organizer profile picture" />
          ) : (
            <View style={styles.avatar}><Ionicons name="person-outline" size={30} color={colors.purpleDark} /></View>
          )}
          <View style={styles.identityText}>
            <Text accessibilityRole="header" style={styles.organization}>{profile.organization}</Text>
            {!!profile.name && <Copy>{profile.name}</Copy>}
          </View>
        </View>
      </Panel>
      <Panel title="About the organization">
        <Copy>{profile.description || 'No description provided.'}</Copy>
      </Panel>
      <Panel title="Contact details">
        <Text style={styles.label}>Email address</Text>
        <Copy>{profile.email || 'Not provided'}</Copy>
        <Text style={styles.label}>Contact number</Text>
        <Copy>{profile.phone || 'Not provided'}</Copy>
      </Panel>
    </>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  identityText: { flex: 1, minWidth: 0, gap: 4 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.lavender,
    alignItems: 'center', justifyContent: 'center' },
  organization: { color: colors.ink, fontSize: 23, fontFamily: headingFont },
  label: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  initials: { ...typography.title, color: colors.purpleDark },
  saved: { ...typography.label, color: semanticColors.success.text },
  settingsRow: { minHeight: touchTargets.standard, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.xs, gap: spacing.sm, borderRadius: radii.sm },
  settingsLabel: { flex: 1, minWidth: 0 },
  divided: { borderBottomWidth: 1, borderColor: colors.border },
  pressed: { backgroundColor: colors.lavender },
});

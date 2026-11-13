import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, headingFont } from '../theme';

export const personalTools = [
  { name: 'registrations', label: 'My Registrations & Tickets', icon: 'ticket-outline' },
  { name: 'calendar', label: 'Calendar', icon: 'calendar-outline' },
  { name: 'saved', label: 'Saved Events', icon: 'bookmark-outline' },
  { name: 'notifications', label: 'Notifications', icon: 'notifications-outline' },
  { name: 'settings', label: 'Settings', icon: 'settings-outline' },
];

export default function SideMenu({ profile, signedIn, onOpen, onClose, onProfile, onSignOut }) {
  const name = signedIn && profile.name.trim() ? profile.name.trim() : 'Guest';
  const initials = name.split(/\s+/).slice(0, 2).map((word) => Array.from(word)[0]).join('').toUpperCase();

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable accessible={false} onPress={onClose} style={StyleSheet.absoluteFill} />
        <View pointerEvents="box-none" style={styles.frame}>
          <SafeAreaView style={styles.drawer} accessibilityViewIsModal>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <View style={styles.header}>
                <View style={styles.avatar}>
                  {signedIn
                    ? <Text style={styles.initials}>{initials}</Text>
                    : <Ionicons name="person-outline" size={25} color={colors.purpleDark} />}
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Close menu" onPress={onClose}
                  style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
                  <Ionicons name="close" size={23} color={colors.muted} />
                </Pressable>
              </View>
              <View style={styles.identity}>
                <Text accessibilityRole="header" style={styles.name}>{name}</Text>
                {signedIn && !!profile.city && <Text style={styles.city}>{profile.city}</Text>}
              </View>
              <View style={styles.links}>
                <MenuRow label="My Profile" icon="person-outline" onPress={onProfile} />
                {personalTools.map(({ name: screen, label, icon }) => (
                  <MenuRow key={screen} label={label} icon={icon} onPress={() => onOpen(screen)} />
                ))}
              </View>
              {signedIn && (
                <View style={styles.account}>
                  <MenuRow label="Sign out" icon="log-out-outline" onPress={onSignOut} />
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

function MenuRow({ label, icon, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Ionicons name={icon} size={21} color={colors.muted} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(18, 13, 38, 0.32)' },
  frame: { flex: 1, width: '100%', maxWidth: 520 },
  drawer: { flex: 1, width: '84%', maxWidth: 300, backgroundColor: colors.white },
  content: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingLeft: 9 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.lavender, alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.purpleDark, fontSize: 21, fontFamily: headingFont },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  identity: { paddingHorizontal: 9, marginTop: 10, gap: 4 },
  name: { color: colors.ink, fontSize: 20, fontFamily: headingFont },
  city: { color: colors.muted, fontSize: 13 },
  links: { marginTop: 19 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 48, paddingHorizontal: 9, paddingVertical: 8, borderRadius: 10 },
  pressed: { backgroundColor: colors.lavender },
  label: { flexShrink: 1, color: colors.ink, fontSize: 15, lineHeight: 20 },
  account: { borderTopWidth: 1, borderColor: colors.line, marginTop: 10, paddingTop: 7 },
});

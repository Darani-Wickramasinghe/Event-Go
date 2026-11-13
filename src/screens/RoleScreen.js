import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import EventoraLogo from '../components/EventoraLogo';
import { colors, headingFont } from '../theme';

export default function RoleScreen({ onSelect }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <EventoraLogo style={styles.logo} />
      <View style={styles.hero}>
        <Image source={require('../../assets/music.jpg')} resizeMode="cover" style={styles.photo} />
        <View pointerEvents="none" style={styles.shade} />
        <Text accessibilityRole="header" style={styles.title}>Welcome to{'\n'}Eventora</Text>
      </View>
      <View style={styles.choices}>
        <Text accessibilityRole="header" style={styles.prompt}>How will you use Eventora?</Text>
        <RoleChoice title="Attendee" description="Discover events and reserve your spot."
          label="Continue as an attendee" icon="compass-outline" onPress={() => onSelect('attendee')} />
        <RoleChoice title="Event organizer" description="Publish events and manage attendees."
          label="Continue as an event organizer" icon="calendar-outline" onPress={() => onSelect('organizer')} />
      </View>
    </ScrollView>
  );
}

function RoleChoice({ title, description, label, icon, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={description}
      onPress={onPress} style={({ pressed }) => [styles.choice, pressed && styles.pressed]}>
      <View style={styles.roleIcon}>
        <Ionicons name={icon} size={25} color={colors.purpleDark} />
      </View>
      <View style={styles.choiceText}>
        <Text style={styles.choiceTitle}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Ionicons name="arrow-forward" size={20} color={colors.purpleDark} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 22, gap: 18 },
  logo: { width: 156, height: 52, alignSelf: 'center' },
  hero: { minHeight: 218, borderRadius: 22, overflow: 'hidden', justifyContent: 'flex-end', padding: 21, backgroundColor: colors.purpleDark },
  photo: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(22, 16, 61, 0.65)' },
  title: { color: colors.white, fontFamily: headingFont, fontSize: 36, letterSpacing: -1.2 },
  choices: { gap: 10 },
  prompt: { color: colors.ink, fontFamily: headingFont, fontSize: 18, marginBottom: 2 },
  choice: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 82,
    paddingVertical: 12, paddingHorizontal: 13, borderRadius: 15, borderWidth: 1, borderColor: colors.line,
  },
  pressed: { backgroundColor: colors.lavender },
  roleIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.lavender, alignItems: 'center', justifyContent: 'center' },
  choiceText: { flex: 1, gap: 4 },
  choiceTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  description: { color: colors.muted, fontSize: 13, lineHeight: 18 },
});

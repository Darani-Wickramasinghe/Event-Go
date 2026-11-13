import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import EventoraLogo from '../components/EventoraLogo';
import { colors, headingFont } from '../theme';

export default function RoleScreen({ onSelect }) {
  const { width } = useWindowDimensions();
  const logoWidth = Math.min(290, width * 0.68);
  const logoSize = { width: logoWidth, height: logoWidth / 3 };

  return (
    <View style={styles.screen}>
      <Image source={require('../../assets/welcome-concert.png')} resizeMode="cover" style={styles.photo} />
      <View pointerEvents="none" style={styles.shade} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text accessibilityRole="header" accessibilityLabel="Welcome to Eventora" style={styles.welcome}>WELCOME TO</Text>
          <View style={logoSize}>
            <EventoraLogo style={logoSize} />
            <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
              aria-hidden pointerEvents="none" style={[styles.whiteWord, { left: logoWidth * 0.283, width: logoWidth * 0.422 }]}>
              <EventoraLogo style={[logoSize, { left: -logoWidth * 0.283, tintColor: colors.white }]} />
            </View>
          </View>
          <Text style={styles.subtitle}>Discover, create and be part of amazing events</Text>
        </View>

        <View style={styles.choices}>
          <Text accessibilityRole="header" style={styles.prompt}>How will you use Eventora?</Text>
          <RoleChoice title="Attendee" description="Discover events and reserve your spot."
            label="Continue as an attendee" icon="ticket-outline" color="#B97BFF" onPress={() => onSelect('attendee')} />
          <RoleChoice title="Event organizer" description="Publish events and manage attendees."
            label="Continue as an event organizer" icon="calendar-outline" color="#69B8FF" onPress={() => onSelect('organizer')} />
        </View>
      </ScrollView>
    </View>
  );
}

function RoleChoice({ title, description, label, icon, color, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={description}
      onPress={onPress} style={({ pressed }) => [styles.choice, pressed && styles.pressed]}>
      <View style={[styles.roleIcon, { borderColor: color }]}>
        <Ionicons name={icon} size={30} color={color} />
      </View>
      <View style={styles.choiceText}>
        <Text style={styles.choiceTitle}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Ionicons name="arrow-forward" size={23} color="#36ECF6" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#121031' },
  photo: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(14, 10, 44, 0.30)' },
  scroll: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 26, paddingTop: 40, paddingBottom: 34 },
  intro: { flexGrow: 1.55, flexBasis: 0, justifyContent: 'center', alignItems: 'center', minHeight: 245 },
  welcome: { color: colors.white, fontSize: 14, fontWeight: '700', letterSpacing: 5, textAlign: 'center' },
  whiteWord: { position: 'absolute', top: 0, bottom: 0, overflow: 'hidden' },
  subtitle: { color: colors.white, textAlign: 'center', fontSize: 18, lineHeight: 25, fontWeight: '700', maxWidth: 300 },
  choices: { flexGrow: 1, justifyContent: 'center', gap: 7, paddingTop: 20 },
  prompt: { color: colors.white, fontFamily: headingFont, fontSize: 21, marginBottom: 6, letterSpacing: -0.35 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 68, paddingVertical: 10, borderRadius: 10 },
  pressed: { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
  roleIcon: { width: 49, minHeight: 36, borderRightWidth: 1, alignItems: 'flex-start', justifyContent: 'center' },
  choiceText: { flex: 1, gap: 4 },
  choiceTitle: { color: colors.white, fontSize: 18, fontWeight: '700' },
  description: { color: '#EFEBFF', fontSize: 13, lineHeight: 18 },
});

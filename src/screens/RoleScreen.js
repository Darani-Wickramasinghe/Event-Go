import { StyleSheet, Text, View } from 'react-native';
import EventoraMark from '../components/EventoraMark';
import { Action, Copy, Page, Panel } from '../components/FlowUI';
import { colors, headingFont } from '../theme';

export default function RoleScreen({ onSelect }) {
  return (
    <Page title="Welcome to Eventora">
      <View style={styles.hero}>
        <EventoraMark size={54} />
        <Text accessibilityRole="header" style={styles.title}>How will you use Eventora?</Text>
      </View>
      <Panel title="Attendee">
        <Copy>Discover events, reserve places, and find your tickets.</Copy>
        <Action label="Continue as an attendee" icon="compass-outline" onPress={() => onSelect('attendee')} />
      </Panel>
      <Panel title="Event organizer">
        <Copy>Create events, manage reservations, and check in attendees.</Copy>
        <Action label="Continue as an event organizer" icon="calendar-outline" secondary onPress={() => onSelect('organizer')} />
      </Panel>
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.lavender, borderRadius: 24, padding: 24, gap: 12 },
  title: { color: colors.ink, fontFamily: headingFont, fontSize: 27 },
});

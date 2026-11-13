import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { BookmarkButton } from '../components/EventCard';
import EventWeather from '../components/EventWeather';
import { Action, Copy } from '../components/FlowUI';
import { formatPrice } from '../data/events';
import { colors, headingFont } from '../theme';

export default function EventDetailsScreen({ event, saved, onSave, onBack, remaining, unavailable, booking, attendeeCount, onBook, onReport }) {
  const [message, setMessage] = useState('');
  const [expanded, setExpanded] = useState(false);
  const destination = encodeURIComponent(`${event.venue}, ${event.city}, Sri Lanka`);
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  const bookingLabel = booking ? 'View my tickets' : event.price ? 'Preview tickets' : 'Reserve free places';
  const initials = event.organizer.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  const longDescription = event.description.length > 170;
  const description = longDescription && !expanded
    ? `${event.description.slice(0, 170).replace(/\s+\S*$/, '')}…`
    : event.description;

  async function shareEvent() {
    try {
      if (Platform.OS === 'web') {
        const url = new URL(window.location.href);
        url.searchParams.set('event', event.id);
        if (navigator.share) await navigator.share({ title: event.title, url: url.toString() });
        else if (navigator.clipboard) {
          await navigator.clipboard.writeText(url.toString());
          setMessage('Event link copied.');
        } else setMessage(url.toString());
      } else {
        await Share.share({ message: `${event.title} · ${event.date}\n${event.venue}, ${event.city}\neventora://event/${event.id}` });
      }
    } catch (failure) {
      if (failure.name !== 'AbortError') setMessage('The event link could not be shared.');
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.cover}>
          <Image source={event.image} style={styles.image} resizeMode="cover" />
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back to events" onPress={onBack} style={styles.photoButton}>
              <Ionicons name="chevron-back" size={24} color={colors.white} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Share event" onPress={shareEvent} style={styles.photoButton}>
              <Ionicons name="share-outline" size={23} color={colors.white} />
            </Pressable>
          </View>
        </View>
        <View style={styles.content}>
          <View style={styles.intro}>
            <View style={styles.titleRow}>
              <View style={styles.titleBlock}>
                <Text style={styles.category}>{event.category} · {event.setting}</Text>
                <Text accessibilityRole="header" style={styles.title}>{event.title}</Text>
              </View>
              <Text style={styles.price}>{formatPrice(event.price)}</Text>
            </View>
            <View style={styles.facts}>
              <Fact icon="location-outline">{event.venue}, {event.city}</Fact>
              <Fact icon="calendar-outline">{event.date} · ends {event.endTime} · Sri Lanka time</Fact>
            </View>
            <TextLink label="Get directions" icon="navigate-outline" onPress={() => Linking.openURL(directions).catch(() => setMessage('Directions could not be opened. Use the venue address above.'))} />
            <View style={styles.invite}>
              <Fact icon="people-outline">{attendeeCount} {attendeeCount === 1 ? 'place' : 'places'} reserved</Fact>
              <TextLink label="Invite friends" onPress={shareEvent} />
            </View>
            {!!message && <Copy>{message}</Copy>}
          </View>
          <View style={styles.organizer}>
            <View style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View>
            <View style={styles.titleBlock}>
              <Text style={styles.organizerName}>{event.organizer}</Text>
              <Text style={styles.meta}>Event organizer</Text>
            </View>
          </View>
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.subtitle}>Description</Text>
            <Text style={styles.description}>{description}</Text>
            {longDescription && <TextLink label={expanded ? 'Read less' : 'Read more'} expanded={expanded} onPress={() => setExpanded(!expanded)} />}
            {!!event.eligibility && <Fact icon="information-circle-outline">Eligibility · {event.eligibility}</Fact>}
            {!!event.accessibility && <Fact icon="accessibility-outline">Accessibility · {event.accessibility}</Fact>}
          </View>
          <EventWeather event={event} />
          <TextLink label="Report event" icon="flag-outline" onPress={onReport} />
        </View>
      </ScrollView>
      <View style={styles.footer}>
        {!!unavailable && <Copy alert>{unavailable}{event.reason ? ` · ${event.reason}` : ''}</Copy>}
        {!unavailable && !event.price && <Text style={styles.meta}>{remaining === null ? 'Unlimited free admission' : `${remaining} free places available`}</Text>}
        <View style={styles.footerRow}>
          <BookmarkButton event={event} saved={saved} onPress={onSave} style={styles.save} />
          <View style={styles.ticket}>
            <Action label={bookingLabel} icon="ticket-outline" disabled={!booking && !!unavailable} onPress={onBook} />
          </View>
        </View>
      </View>
    </View>
  );
}

function Fact({ icon, children }) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={18} color={colors.purpleDark} />
      <Text style={styles.factText}>{children}</Text>
    </View>
  );
}

function TextLink({ label, icon, expanded, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={expanded === undefined ? undefined : { expanded }} onPress={onPress} style={styles.link}>
      {icon && <Ionicons name={icon} size={17} color={colors.purpleDark} />}
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  cover: { height: 315, backgroundColor: colors.lavender },
  image: { width: '100%', height: '100%' },
  actions: { position: 'absolute', left: 18, right: 18, top: 16, flexDirection: 'row', justifyContent: 'space-between' },
  photoButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(19, 18, 38, 0.68)', alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 20, gap: 20, borderTopLeftRadius: 25, borderTopRightRadius: 25, marginTop: -23, backgroundColor: colors.white },
  intro: { gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleBlock: { flex: 1, gap: 4 },
  category: { color: colors.purpleDark, fontSize: 13, fontWeight: '700' },
  title: { color: colors.ink, fontSize: 27, fontFamily: headingFont, letterSpacing: -0.6 },
  price: { backgroundColor: colors.lavender, color: colors.purpleDark, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, fontWeight: '800' },
  facts: { gap: 7, paddingTop: 5 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  factText: { flexShrink: 1, color: colors.muted, fontSize: 14, lineHeight: 20 },
  invite: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 14 },
  link: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkText: { color: colors.purpleDark, fontSize: 14, fontWeight: '700' },
  organizer: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderColor: colors.line, paddingTop: 17 },
  avatar: { width: 45, height: 45, borderRadius: 23, backgroundColor: colors.lavender, alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.purpleDark, fontSize: 15, fontWeight: '800' },
  organizerName: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  section: { gap: 8 },
  subtitle: { color: colors.ink, fontSize: 17, fontFamily: headingFont },
  description: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  footer: { backgroundColor: colors.white, borderTopWidth: 1, borderColor: colors.line, paddingVertical: 10, paddingHorizontal: 22, gap: 6 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  save: { width: 50, height: 50, borderRadius: 14, borderWidth: 1, borderColor: colors.line },
  ticket: { flex: 1 },
});

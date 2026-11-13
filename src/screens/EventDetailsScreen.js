import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { BookmarkButton } from '../components/EventCard';
import EventWeather from '../components/EventWeather';
import { Action, Copy } from '../components/FlowUI';
import { formatPrice } from '../data/events';
import { eventTime } from '../data/reservations';
import { colors, headingFont } from '../theme';

const dayFormat = new Intl.DateTimeFormat('en-LK', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'Asia/Colombo' });
const timeFormat = new Intl.DateTimeFormat('en-LK', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Colombo' });

export default function EventDetailsScreen({ event, saved, onSave, onBack, remaining, unavailable, booking, attendeeCount, onBook, onReport }) {
  const [message, setMessage] = useState('');
  const [expanded, setExpanded] = useState(false);
  const destination = encodeURIComponent(`${event.venue}, ${event.city}, Sri Lanka`);
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  const bookingLabel = booking ? 'View my tickets' : event.price ? 'Preview tickets' : 'Reserve free places';
  const start = eventTime(event);
  const schedule = `${timeFormat.format(start)}–${timeFormat.format(eventTime(event, event.endTime))} · Sri Lanka time`;
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
          <View style={styles.toolbar}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back to events" onPress={onBack} style={styles.toolbarButton}>
              <Ionicons name="chevron-back" size={24} color={colors.white} />
            </Pressable>
            <View style={styles.toolbarActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Share event" onPress={shareEvent} style={styles.toolbarButton}>
                <Ionicons name="share-outline" size={23} color={colors.white} />
              </Pressable>
              <BookmarkButton event={event} saved={saved} onPress={onSave} style={styles.toolbarButton} color={colors.white} />
            </View>
          </View>
        </View>
        <View style={styles.content}>
          <View style={styles.intro}>
            <Text style={styles.category}>{event.category} · {event.setting}</Text>
            <Text accessibilityRole="header" style={styles.title}>{event.title}</Text>
            {attendeeCount > 0 && <Text style={styles.meta}>{attendeeCount} {attendeeCount === 1 ? 'place' : 'places'} reserved</Text>}
            {!!message && <Copy>{message}</Copy>}
            {!!unavailable && <Copy alert>{unavailable}{event.reason ? ` · ${event.reason}` : ''}</Copy>}
          </View>
          <View style={styles.facts}>
            <KeyDetail icon="calendar-outline" title={dayFormat.format(start)} detail={schedule} />
            <KeyDetail icon="location-outline" title={event.venue} detail={`${event.city}, Sri Lanka`}>
              <Pressable accessibilityRole="button" accessibilityLabel="Get directions" onPress={() => Linking.openURL(directions).catch(() => setMessage('Directions could not be opened. Use the venue address above.'))} style={styles.directions}>
                <Ionicons name="navigate-outline" size={21} color={colors.purpleDark} />
              </Pressable>
            </KeyDetail>
          </View>
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.subtitle}>About this event</Text>
            <Text style={styles.description}>{description}</Text>
            {longDescription && <TextLink label={expanded ? 'Read less' : 'Read more'} expanded={expanded} onPress={() => setExpanded(!expanded)} />}
            {!!event.eligibility && <Fact icon="information-circle-outline">Eligibility · {event.eligibility}</Fact>}
            {!!event.accessibility && <Fact icon="accessibility-outline">Accessibility · {event.accessibility}</Fact>}
          </View>
          <EventWeather event={event} />
          <View style={styles.organizer}>
            <View style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View>
            <View style={styles.titleBlock}>
              <Text style={styles.meta}>Organized by</Text>
              <Text style={styles.organizerName}>{event.organizer}</Text>
            </View>
            <TextLink label="Report event" icon="flag-outline" color="#B42332" onPress={onReport} />
          </View>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.ticketPrice}>
          <Text style={styles.price}>{formatPrice(event.price)}</Text>
          <Text style={styles.meta}>{unavailable || (event.price ? 'Per ticket' : remaining === null ? 'Admission' : `${remaining} places left`)}</Text>
        </View>
        <View style={styles.ticket}>
          <Action label={bookingLabel} icon="ticket-outline" disabled={!booking && !!unavailable} onPress={onBook} />
        </View>
      </View>
    </View>
  );
}

function KeyDetail({ icon, title, detail, children }) {
  return (
    <View style={styles.keyDetail}>
      <View style={styles.factIcon}><Ionicons name={icon} size={21} color={colors.purpleDark} /></View>
      <View style={styles.titleBlock}>
        <Text style={styles.organizerName}>{title}</Text>
        <Text style={styles.meta}>{detail}</Text>
      </View>
      {children}
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

function TextLink({ label, icon, expanded, onPress, color = colors.purpleDark }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={expanded === undefined ? undefined : { expanded }} onPress={onPress} style={styles.link}>
      {icon && <Ionicons name={icon} size={17} color={color} />}
      <Text style={[styles.linkText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  toolbar: {
    position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 12, minHeight: 54,
  },
  toolbarActions: { flexDirection: 'row', alignItems: 'center' },
  toolbarButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  cover: { width: '100%', height: 300, backgroundColor: colors.lavender },
  image: { width: '100%', height: '100%' },
  content: {
    marginTop: -24, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.white,
    paddingHorizontal: 20, paddingTop: 22, paddingBottom: 16, gap: 19,
  },
  intro: { gap: 5 },
  titleBlock: { flex: 1, gap: 3 },
  category: { color: colors.purpleDark, fontSize: 13, fontWeight: '700' },
  title: { color: colors.ink, fontSize: 31, fontFamily: headingFont, letterSpacing: -0.8 },
  price: { color: colors.ink, fontSize: 18, fontFamily: headingFont },
  facts: { gap: 12, paddingVertical: 13, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  keyDetail: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  factIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.lavender, alignItems: 'center', justifyContent: 'center' },
  directions: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  factText: { flexShrink: 1, color: colors.muted, fontSize: 14, lineHeight: 20 },
  link: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkText: { fontSize: 14, fontWeight: '700' },
  organizer: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderColor: colors.line, paddingTop: 17 },
  avatar: { width: 45, height: 45, borderRadius: 23, backgroundColor: colors.lavender, alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.purpleDark, fontSize: 15, fontWeight: '800' },
  organizerName: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  section: { gap: 8 },
  subtitle: { color: colors.ink, fontSize: 17, fontFamily: headingFont },
  description: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  footer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderTopWidth: 1, borderColor: colors.line, paddingVertical: 10, paddingHorizontal: 20, gap: 12 },
  ticketPrice: { flexShrink: 1, maxWidth: '43%', gap: 2 },
  ticket: { flex: 1 },
});

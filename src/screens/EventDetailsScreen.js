import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { BookmarkButton } from '../components/EventCard';
import EventWeather from '../components/EventWeather';
import { Action, Copy } from '../components/FlowUI';
import { formatPrice } from '../data/events';
import { colors, headingFont } from '../theme';

export default function EventDetailsScreen({ event, saved, onSave, onBack, remaining, unavailable, booking, onBook, onReport }) {
  const [message, setMessage] = useState('');
  const destination = encodeURIComponent(`${event.venue}, ${event.city}, Sri Lanka`);
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  const bookingLabel = booking ? 'View my tickets' : event.price ? 'Preview tickets' : 'Reserve free places';

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
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.cover}>
        <Image source={event.image} style={styles.image} />
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to events" onPress={onBack} style={styles.back}>
            <Ionicons name="arrow-back" size={23} color={colors.ink} />
          </Pressable>
          <BookmarkButton event={event} saved={saved} onPress={onSave} />
        </View>
      </View>
      <View style={styles.content}>
        <View style={styles.labels}>
          <Text style={styles.category}>{event.category}</Text>
          <Text style={styles.price}>{formatPrice(event.price)}</Text>
        </View>
        <Text accessibilityRole="header" style={styles.title}>{event.title}</Text>
        <Detail icon="calendar-outline" title={event.date} text={`Ends at ${event.endTime} · Sri Lanka time`} />
        <Detail icon="location-outline" title={event.venue} text={`${event.city}, Sri Lanka`} />
        <Detail icon="person-outline" title={event.organizer} text={`${event.setting} event`} />
        <Action label={bookingLabel} icon="ticket-outline" disabled={!booking && !!unavailable} onPress={onBook} />
        {!!unavailable && <Copy alert>{unavailable}{event.reason ? ` · ${event.reason}` : ''}</Copy>}
        {!unavailable && !event.price && <Copy>{remaining === null ? 'Unlimited free admission' : `${remaining} free places available`}</Copy>}
        <Text accessibilityRole="header" style={styles.subtitle}>About the event</Text>
        <Text style={styles.description}>{event.description}</Text>
        <Action label="Get directions" icon="navigate-outline" secondary onPress={() => Linking.openURL(directions).catch(() => setMessage('Directions could not be opened. Use the venue address above.'))} />
        <EventWeather event={event} />
        <Action label="Share event" icon="share-social-outline" secondary onPress={shareEvent} />
        <Action label="Report event" secondary onPress={onReport} />
        {!!message && <Copy>{message}</Copy>}
      </View>
    </ScrollView>
  );
}

function Detail({ icon, title, text }) {
  return (
    <View style={styles.detail}>
      <View style={styles.detailIcon}><Ionicons name={icon} size={22} color={colors.purpleDark} /></View>
      <View style={styles.detailText}>
        <Text style={styles.detailTitle}>{title}</Text>
        <Text style={styles.description}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { height: 247, backgroundColor: colors.lavender },
  image: { width: '100%', height: '100%' },
  actions: {
    position: 'absolute', left: 16, right: 16, top: 16, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  back: {
    backgroundColor: colors.white, width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  content: {
    padding: 22, gap: 15, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    marginTop: -20, backgroundColor: colors.white,
  },
  labels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  category: {
    borderRadius: 15, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: colors.lavender, color: colors.purpleDark, fontSize: 13, fontWeight: '700',
  },
  price: { color: colors.purpleDark, fontSize: 16, fontWeight: '800' },
  title: { color: colors.ink, fontSize: 35, fontFamily: headingFont, letterSpacing: -0.8 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  detailText: { flexShrink: 1 },
  detailIcon: {
    width: 44, height: 44, borderRadius: 13, backgroundColor: colors.lavender,
    alignItems: 'center', justifyContent: 'center',
  },
  detailTitle: { color: colors.ink, fontWeight: '700', fontSize: 15 },
  subtitle: { color: colors.ink, fontFamily: headingFont, fontSize: 21, marginTop: 5 },
  description: { color: colors.muted, fontSize: 14, lineHeight: 21 },
});

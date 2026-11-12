import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatPrice } from '../data/events';
import { colors } from '../theme';

export function BookmarkButton({ event, saved, onPress, style }) {
  const action = saved ? 'Remove from saved events' : 'Save event';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${action}: ${event.title}`}
      accessibilityState={{ selected: saved }}
      onPress={onPress}
      style={[styles.bookmark, style]}
    >
      <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={19} color={colors.purpleDark} />
    </Pressable>
  );
}

export default function EventCard({ event, saved, onOpen, onSave, compact = false }) {
  const month = new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' })
    .format(new Date(event.startDate)).toUpperCase();
  return (
    <View style={[styles.card, compact && styles.compactCard]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${event.title}, ${event.date}, ${event.city}, ${formatPrice(event.price)}`}
        onPress={onOpen}
        style={compact && styles.compactContent}
      >
        <View>
          <Image source={event.image} style={compact ? styles.thumbnail : styles.cover} />
          {!compact && (
            <View style={styles.dateBadge}>
              <Text style={styles.day}>{event.day}</Text>
              <Text style={styles.month}>{month}</Text>
            </View>
          )}
        </View>
        <View style={compact ? styles.compactBody : styles.body}>
          {compact && <Text style={styles.date}>{event.date}</Text>}
          <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
          <View style={styles.location}>
            <Ionicons name="location-outline" size={14} color={colors.muted} />
            <Text style={styles.locationText} numberOfLines={1}>{event.venue}, {event.city}</Text>
          </View>
          {!compact && (
            <View style={styles.meta}>
              <Text style={styles.category}>{event.category}</Text>
              <Text style={[styles.price, event.price === 0 && styles.free]}>{formatPrice(event.price)}</Text>
            </View>
          )}
        </View>
      </Pressable>
      <BookmarkButton event={event} saved={saved} onPress={onSave} style={compact ? styles.compactBookmark : styles.coverBookmark} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 220,
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    boxShadow: '0px 5px 14px rgba(39, 33, 104, 0.07)',
  },
  cover: { width: '100%', height: 125, borderRadius: 13 },
  dateBadge: {
    position: 'absolute', top: 9, left: 9, width: 42, minHeight: 43,
    borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white,
  },
  day: { color: '#B93C44', fontSize: 16, fontWeight: '800' },
  month: { color: '#B93C44', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  bookmark: {
    width: 40, height: 40, borderRadius: 13, alignItems: 'center',
    justifyContent: 'center', backgroundColor: colors.white,
  },
  coverBookmark: { position: 'absolute', top: 15, right: 15 },
  body: { padding: 7, paddingTop: 10, gap: 6 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '750' },
  location: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  locationText: { color: colors.muted, fontSize: 12, flexShrink: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 },
  category: { color: colors.muted, fontSize: 12 },
  price: { color: colors.purpleDark, fontWeight: '800', fontSize: 13 },
  free: { color: '#12745B' },
  compactCard: { width: '100%', padding: 8, borderRadius: 16, boxShadow: 'none' },
  compactContent: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  thumbnail: { width: 72, height: 72, borderRadius: 11 },
  compactBody: { flex: 1, paddingRight: 38, gap: 5 },
  date: { color: colors.purpleDark, fontSize: 12, fontWeight: '700' },
  compactBookmark: { position: 'absolute', top: 24, right: 7, backgroundColor: colors.lavender },
});

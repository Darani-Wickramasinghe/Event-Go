import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import EventCard from '../components/EventCard';
import { categories, events } from '../data/events';
import { colors, headingFont } from '../theme';

export default function DiscoveryScreen({ home, openExplore, renderEvent, openProfile, search, setSearch, category, setCategory, freeOnly, setFreeOnly }) {
  const [showFilters, setShowFilters] = useState(false);
  const query = search.trim().toLowerCase();
  const results = events.filter((event) => {
    const searchable = [event.title, event.city, event.venue, event.category].join(' ').toLowerCase();
    return searchable.includes(query)
      && (category === 'All' || event.category === category)
      && (!freeOnly || event.price === 0);
  });

  function selectCategory(label) {
    setCategory(label);
    openExplore();
  }

  function clearFilters() {
    setSearch('');
    setCategory('All');
    setFreeOnly(false);
  }

  return (
    <ScrollView key={home ? 'home' : 'explore'} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View pointerEvents="none" style={styles.orbit} />
        <View pointerEvents="none" style={styles.innerOrbit} />
        <View style={styles.top}>
          <View style={styles.brand}>
            <View style={styles.mark}>
              <Ionicons name="ticket" color={colors.purpleDark} size={20} />
            </View>
            <Text style={styles.wordmark}>eventora</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={openProfile} style={styles.profile}>
            <Ionicons name="person-outline" color={colors.white} size={19} />
          </Pressable>
        </View>
        <View style={styles.heroContent}>
          {home && (
            <View style={styles.location}>
              <Ionicons name="location-outline" size={15} color="#BBFAE8" />
              <Text style={styles.locationText}>Kelaniya, Sri Lanka</Text>
            </View>
          )}
          <Text accessibilityRole="header" style={styles.heading}>{home ? 'Find your next event' : 'Explore events'}</Text>
          <View style={styles.searchRow}>
            {home ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Search events or cities" onPress={openExplore} style={styles.searchBox}>
                <Ionicons name="search-outline" size={21} color={colors.white} />
                <Text style={styles.placeholder}>Search events or cities</Text>
              </Pressable>
            ) : (
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={21} color={colors.white} />
                <TextInput
                  accessibilityLabel="Search events or cities"
                  placeholder="Search events or cities"
                  placeholderTextColor="#EEECFF"
                  value={search}
                  onChangeText={setSearch}
                  autoCorrect={false}
                  returnKeyType="search"
                  style={styles.input}
                />
                {search.length > 0 && (
                  <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch('')} style={styles.clearSearch}>
                    <Ionicons name="close-circle" size={20} color={colors.white} />
                  </Pressable>
                )}
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Filters"
              accessibilityState={{ expanded: !home && showFilters }}
              onPress={() => { openExplore(); setShowFilters(home || !showFilters); }}
              style={[styles.filterButton, !home && (showFilters || freeOnly) && styles.filterActive]}
            >
              <Ionicons name="options-outline" size={23} color={colors.white} />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRail} contentContainerStyle={styles.chips}>
        {categories.map(({ label, icon, color, ink }) => {
          const selected = !home && category === label;
          return (
            <Pressable
              key={label}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected }}
              onPress={() => selectCategory(label)}
              style={[styles.chip, { backgroundColor: selected ? ink : color }]}
            >
              <Ionicons name={icon} size={17} color={selected ? colors.white : ink} />
              <Text style={[styles.chipText, { color: selected ? colors.white : ink }]}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {home ? (
        <>
          <View style={styles.sectionHeading}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Upcoming events</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="See all upcoming events" onPress={() => { clearFilters(); openExplore(); }} style={styles.textButton}>
              <Text style={styles.link}>See all</Text>
              <Ionicons name="chevron-forward" size={15} color={colors.purpleDark} />
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
            {events.map((event) => renderEvent(event))}
          </ScrollView>

          <Pressable accessibilityRole="button" accessibilityLabel="Explore free events" onPress={() => { clearFilters(); setFreeOnly(true); openExplore(); }} style={styles.banner}>
            <View style={styles.bannerBody}>
              <Text style={styles.bannerTitle}>Free events</Text>
              <Text style={styles.bannerLink}>Explore free entry <Ionicons name="arrow-forward" size={14} /></Text>
            </View>
            <View style={styles.bannerArt}>
              <Ionicons name="ticket-outline" size={44} color="#168A71" />
            </View>
          </Pressable>

          <View style={styles.sectionHeading}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Around Kelaniya</Text>
          </View>
          <View style={styles.list}>
            {events.filter((event) => event.city === 'Kelaniya').map((event) => renderEvent(event, true))}
          </View>
        </>
      ) : (
        <>
          {showFilters && (
            <Pressable
              accessibilityRole="switch"
              accessibilityLabel="Free events only"
              accessibilityState={{ checked: freeOnly }}
              onPress={() => setFreeOnly(!freeOnly)}
              style={styles.filterRow}
            >
              <Text style={styles.filterLabel}>Free events only</Text>
              <Ionicons name={freeOnly ? 'checkbox' : 'square-outline'} size={24} color={colors.purpleDark} />
            </Pressable>
          )}
          <View style={styles.sectionHeading}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>{results.length} {results.length === 1 ? 'event' : 'events'}</Text>
            {(query || category !== 'All' || freeOnly) && (
              <Pressable accessibilityRole="button" onPress={clearFilters} style={styles.textButton}>
                <Text style={styles.link}>Clear filters</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.list}>
            {results.map((event) => renderEvent(event, true))}
            {results.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="search-outline" size={32} color={colors.purple} />
                <Text accessibilityRole="header" style={styles.emptyTitle}>No matching events</Text>
                <Text style={styles.emptyText}>Try a different city, event name, or category.</Text>
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.purple, borderBottomLeftRadius: 29, borderBottomRightRadius: 29,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 34, overflow: 'hidden',
  },
  orbit: {
    position: 'absolute', width: 235, height: 235, borderRadius: 118, borderWidth: 1,
    borderColor: '#786BF1', right: -56, top: -96,
  },
  innerOrbit: {
    position: 'absolute', width: 177, height: 177, borderRadius: 89, borderWidth: 1,
    borderColor: '#786BF1', right: -27, top: -67,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  mark: {
    width: 35, height: 35, borderRadius: 11, backgroundColor: '#BBFAE8',
    alignItems: 'center', justifyContent: 'center',
  },
  wordmark: { color: colors.white, fontSize: 23, fontFamily: headingFont, letterSpacing: -0.7 },
  profile: {
    width: 44, height: 44, borderRadius: 15, backgroundColor: '#6B5DF0',
    alignItems: 'center', justifyContent: 'center',
  },
  heroContent: { gap: 9, marginTop: 20 },
  location: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { color: '#E9E5FF', fontSize: 13, fontWeight: '600' },
  heading: { color: colors.white, fontSize: 33, fontFamily: headingFont, letterSpacing: -1.3 },
  searchRow: { flexDirection: 'row', gap: 9, marginTop: 5 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 14,
    paddingLeft: 12, paddingRight: 8, backgroundColor: '#6658EC', minHeight: 48,
  },
  placeholder: { color: '#EEECFF', fontSize: 14 },
  input: { flex: 1, color: colors.white, fontSize: 14, minHeight: 48, paddingVertical: 5 },
  clearSearch: { minWidth: 28, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  filterButton: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: '#6658EC',
    alignItems: 'center', justifyContent: 'center',
  },
  filterActive: { backgroundColor: '#3730A3' },
  chipRail: { marginTop: -17 },
  chips: { gap: 8, paddingHorizontal: 20, paddingBottom: 4 },
  chip: {
    flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 13,
    minHeight: 42, borderRadius: 24,
  },
  chipText: { fontSize: 13, fontWeight: '700' },
  sectionHeading: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginTop: 15, marginBottom: 8, minHeight: 38,
  },
  sectionTitle: { fontSize: 21, fontFamily: headingFont, color: colors.ink, letterSpacing: -0.45 },
  textButton: { flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 38 },
  link: { fontSize: 13, fontWeight: '700', color: colors.purpleDark },
  cards: { gap: 12, paddingHorizontal: 20, paddingTop: 2, paddingBottom: 12 },
  banner: {
    marginHorizontal: 20, marginTop: 11, paddingHorizontal: 17, paddingVertical: 13,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.mint, borderRadius: 17, overflow: 'hidden',
  },
  bannerBody: { gap: 5 },
  bannerTitle: { color: '#164639', fontWeight: '800', fontSize: 17 },
  bannerLink: { color: '#146855', fontWeight: '700', fontSize: 13 },
  bannerArt: {
    backgroundColor: '#B8F0E1', width: 72, height: 52, alignItems: 'center',
    justifyContent: 'center', borderRadius: 13, transform: [{ rotate: '-12deg' }],
  },
  list: { paddingHorizontal: 20, paddingBottom: 18, gap: 10 },
  filterRow: {
    marginHorizontal: 20, marginTop: 12, padding: 12, backgroundColor: colors.lavender,
    borderRadius: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  filterLabel: { color: colors.ink, fontWeight: '700' },
  empty: { alignItems: 'center', gap: 7, padding: 30 },
  emptyTitle: { color: colors.ink, fontWeight: '800', fontSize: 17 },
  emptyText: { color: colors.muted, textAlign: 'center' },
});

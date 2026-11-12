import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import EventCard from './src/components/EventCard';
import { defaultFilters } from './src/data/eventFilters';
import { events } from './src/data/events';
import DiscoveryScreen from './src/screens/DiscoveryScreen';
import EventDetailsScreen from './src/screens/EventDetailsScreen';
import { colors, headingFont } from './src/theme';

const tabs = [
  { label: 'Home', icon: 'home' },
  { label: 'Explore', icon: 'compass' },
  { label: 'Map', icon: 'map' },
  { label: 'Profile', icon: 'person' },
];

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
    [headingFont]: require('./assets/Inter-ExtraBold.ttf'),
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <Eventora />
    </SafeAreaProvider>
  );
}

function Eventora() {
  const [tab, setTab] = useState('Home');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [savedIds, setSavedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [filters, setFilters] = useState(defaultFilters);

  const isDiscovery = tab === 'Home' || tab === 'Explore';
  const purpleTop = isDiscovery && !selectedEvent;

  useEffect(() => {
    if (!selectedEvent) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedEvent(null);
      return true;
    });
    return () => back.remove();
  }, [selectedEvent]);

  function toggleSave(eventId) {
    setSavedIds((current) => (
      current.includes(eventId)
        ? current.filter((id) => id !== eventId)
        : [...current, eventId]
    ));
  }

  function renderEvent(event, compact = false) {
    return (
      <EventCard
        key={event.id}
        event={event}
        compact={compact}
        saved={savedIds.includes(event.id)}
        onOpen={() => setSelectedEvent(event)}
        onSave={() => toggleSave(event.id)}
      />
    );
  }

  return (
    <View style={styles.background}>
      <StatusBar barStyle={purpleTop ? 'light-content' : 'dark-content'} />
      <View style={styles.shell}>
        <SafeAreaView edges={['top']} style={[styles.safeTop, purpleTop && styles.purpleTop]}>
          <View style={styles.content}>
            {selectedEvent ? (
              <EventDetailsScreen
                event={selectedEvent}
                saved={savedIds.includes(selectedEvent.id)}
                onSave={() => toggleSave(selectedEvent.id)}
                onBack={() => setSelectedEvent(null)}
              />
            ) : isDiscovery ? (
              <DiscoveryScreen
                home={tab === 'Home'}
                openExplore={() => setTab('Explore')}
                openProfile={() => setTab('Profile')}
                renderEvent={renderEvent}
                search={search}
                setSearch={setSearch}
                category={category}
                setCategory={setCategory}
                filters={filters}
                setFilters={setFilters}
              />
            ) : (
              <ScrollView key={tab} contentContainerStyle={styles.otherPage}>
                <Text accessibilityRole="header" style={styles.pageTitle}>{tab}</Text>
                {tab === 'Map' ? (
                  <>
                    <Text style={styles.help}>Browse event venues and open directions from an event.</Text>
                    {events.map((event) => renderEvent(event, true))}
                  </>
                ) : (
                  <>
                    <Text accessibilityRole="header" style={styles.sectionTitle}>Saved events</Text>
                    {events.filter((event) => savedIds.includes(event.id)).map((event) => renderEvent(event, true))}
                    {savedIds.length === 0 && <Text style={styles.help}>Tap the bookmark on an event to save it here.</Text>}
                  </>
                )}
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
        {selectedEvent ? (
          <SafeAreaView edges={['bottom']} />
        ) : (
          <SafeAreaView edges={['bottom']} style={styles.navigation}>
            {tabs.map(({ label, icon }) => {
              const active = tab === label;
              return (
                <Pressable
                  key={label}
                  accessibilityRole="tab"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: active }}
                  onPress={() => setTab(label)}
                  style={styles.tab}
                >
                  <View style={[styles.tabIcon, active && styles.activeIcon]}>
                    <Ionicons name={active ? icon : `${icon}-outline`} color={active ? colors.purpleDark : colors.muted} size={21} />
                  </View>
                  <Text style={[styles.tabLabel, active && styles.activeLabel]}>{label}</Text>
                </Pressable>
              );
            })}
          </SafeAreaView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#EFEDFA', alignItems: 'center' },
  shell: { flex: 1, width: '100%', maxWidth: 520, backgroundColor: colors.white },
  safeTop: { flex: 1, backgroundColor: colors.white },
  purpleTop: { backgroundColor: colors.purple },
  content: { flex: 1, backgroundColor: colors.white },
  navigation: {
    flexDirection: 'row', borderTopWidth: 1, borderColor: colors.line,
    backgroundColor: colors.white, paddingHorizontal: 10,
  },
  tab: { flex: 1, minHeight: 61, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabIcon: { width: 43, height: 29, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  activeIcon: { backgroundColor: colors.lavender },
  tabLabel: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  activeLabel: { color: colors.purpleDark, fontWeight: '800' },
  otherPage: { padding: 20, gap: 12 },
  pageTitle: { color: colors.ink, fontSize: 32, fontFamily: headingFont },
  sectionTitle: { color: colors.ink, fontSize: 20, fontFamily: headingFont },
  help: { color: colors.muted, fontSize: 14, lineHeight: 21 },
});

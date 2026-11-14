import Ionicons from '@expo/vector-icons/Ionicons';
import { randomUUID } from 'expo-crypto';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { BackHandler, Linking, Platform, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import EventCard from './src/components/EventCard';
import { Copy, Page } from './src/components/FlowUI';
import SideMenu from './src/components/SideMenu';
import { defaultFilters } from './src/data/eventFilters';
import { eventTime, registrationStatus, remainingPlaces, reservedPlaces } from './src/data/reservations';
import { useEventoraData } from './src/data/useEventoraData';
import AccountScreen from './src/screens/AccountScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import DiscoveryScreen from './src/screens/DiscoveryScreen';
import EventDetailsScreen from './src/screens/EventDetailsScreen';
import LaunchScreen from './src/screens/LaunchScreen';
import MapScreen from './src/screens/MapScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import { ReportScreen } from './src/screens/OperationsScreen';
import { OrganizerScreen } from './src/screens/OrganizerScreen';
import { ProfileScreen, SettingsScreen } from './src/screens/ProfileScreen';
import ReservationScreen from './src/screens/ReservationScreen';
import RoleScreen from './src/screens/RoleScreen';
import SavedEventsScreen from './src/screens/SavedEventsScreen';
import { ReservationsList, TicketScreen } from './src/screens/TicketsScreen';
import { colors, headingFont } from './src/theme';

const tabs = [
  { label: 'Home', icon: 'home' },
  { label: 'Explore', icon: 'compass' },
  { label: 'Map', icon: 'map' },
  { label: 'Profile', icon: 'person' },
];

if (Platform.OS !== 'web') SplashScreen.preventAutoHideAsync().catch(() => {});

function hideNativeSplash() {
  if (Platform.OS !== 'web') SplashScreen.hideAsync().catch(() => {});
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
    [headingFont]: require('./assets/Inter-ExtraBold.ttf'),
  });

  return (
    <SafeAreaProvider>
      <Eventora fontsReady={fontsLoaded || !!fontError} />
    </SafeAreaProvider>
  );
}

function Eventora({ fontsReady }) {
  const [launching, setLaunching] = useState(true);
  const [role, setRole] = useState(null);
  const [linkedEventId, setLinkedEventId] = useState(null);
  const [tab, setTab] = useState('Home');
  const [pages, setPages] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [filters, setFilters] = useState(defaultFilters);
  const { data, ready, update, storageWarning, events, reserve, cancel, saveEvent, setEventStatus, checkIn } = useEventoraData();
  const page = pages.at(-1);
  const event = events.find((item) => item.id === page?.eventId);
  const bookings = data.signedIn ? data.bookings : [];
  const publicEvents = events.filter((item) => ['Published', 'Rescheduled', 'Closed'].includes(item.status))
    .map((item) => ({ ...item, available: !registrationStatus(item, data.bookings) }));
  const nextEvent = publicEvents.filter((item) => eventTime(item, item.endTime) > Date.now()
    && bookings.some((booking) => booking.eventId === item.id && booking.status === 'Confirmed'))
    .sort((first, second) => eventTime(first) - eventTime(second))[0];

  const isDiscovery = tab === 'Home' || tab === 'Explore';
  const purpleTop = role === 'attendee' && isDiscovery && !page && ready;

  useEffect(() => {
    if (!page) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => back.remove();
  }, [page, role, pages.length]);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    function openLink(url) {
      if (!active || !url) return;
      let id;
      try {
        const parsed = new URL(url);
        id = parsed.searchParams.get('event') ?? (/\/event\/([^/]+)$/.exec(parsed.pathname)?.[1]);
        if (!id && parsed.protocol === 'eventora:' && parsed.hostname === 'event') id = parsed.pathname.slice(1);
      } catch {
        return;
      }
      if (id) setLinkedEventId(id);
    }
    Linking.getInitialURL().then(openLink).catch(() => {});
    const subscription = Linking.addEventListener('url', ({ url }) => openLink(url));
    return () => { active = false; subscription.remove(); };
  }, [ready]);

  useEffect(() => {
    if (role !== 'attendee' || !linkedEventId || page?.entry) return;
    if (events.some((item) => item.id === linkedEventId && ['Published', 'Rescheduled', 'Closed'].includes(item.status))) {
      setPages([{ name: 'event', eventId: linkedEventId }]);
    }
    setLinkedEventId(null);
  }, [role, linkedEventId, events, page?.entry]);

  function switchRole() {
    setPages([]);
    setMenuOpen(false);
    setTab('Home');
    setRole(null);
  }

  function signOut() {
    update((current) => ({ ...current, signedIn: false }));
    switchRole();
  }

  function selectRole(nextRole) {
    setRole(nextRole);
    setPages([{ name: 'signUp', entry: true }]);
  }

  function open(name, params = {}) {
    setPages((current) => [...current, { name, ...params }]);
  }

  function replace(name, params = {}) {
    setPages((current) => [...current.slice(0, -1), { name, ...params }]);
  }

  function goBack() {
    if (page?.entry) {
      switchRole();
      return;
    }
    setPages((current) => current.slice(0, -1));
  }

  function openEvent(item) {
    open('event', { eventId: item.id });
  }

  function browseEvents() {
    setPages([]);
    setTab('Explore');
  }

  function openTicket(bookingId) {
    open('ticket', { bookingId });
  }

  function markNoticesRead(ids) {
    update((current) => ({
      ...current,
      notifications: current.notifications.map((item) => ids.includes(item.id) ? { ...item, read: true } : item),
      readReminders: [...new Set([...current.readReminders, ...ids.filter((id) => id.startsWith('reminder-'))])],
    }));
  }

  function toggleSave(eventId) {
    update((current) => ({
      ...current,
      savedIds: current.savedIds.includes(eventId)
        ? current.savedIds.filter((id) => id !== eventId)
        : [...current.savedIds, eventId],
    }));
  }

  function renderEvent(event, compact = false) {
    return (
      <EventCard
        key={event.id}
        event={event}
        compact={compact}
        saved={data.savedIds.includes(event.id)}
        onOpen={() => openEvent(event)}
        onSave={() => toggleSave(event.id)}
      />
    );
  }

  function renderPage() {
    if (!ready) return <Page title="Eventora"><Copy>Loading your events…</Copy></Page>;
    if (!role) return <RoleScreen onSelect={selectRole} />;
    if (role === 'organizer' && !page) {
      return <OrganizerScreen data={data} events={events} onBack={switchRole} onSave={saveEvent} onStatus={setEventStatus} onScan={checkIn}
        onOpenSettings={() => open('settings')} />;
    }
    switch (page?.name) {
      case 'event': {
        const booking = bookings.find((item) => item.eventId === event.id && item.status === 'Confirmed')
          ?? (event.status === 'Cancelled' ? bookings.find((item) => item.eventId === event.id) : undefined);
        function book() {
          if (booking) {
            openTicket(booking.id);
            return;
          }
          const next = { name: 'reservation', eventId: event.id, requestId: randomUUID() };
          if (data.signedIn || event.price > 0) open(next.name, next);
          else open(data.profile.email ? 'signIn' : 'signUp', { next });
        }
        return <EventDetailsScreen key={event.id} event={event} onBack={goBack}
          saved={data.savedIds.includes(event.id)} onSave={() => toggleSave(event.id)}
          remaining={remainingPlaces(event, data.bookings)} unavailable={registrationStatus(event, data.bookings)}
          attendeeCount={reservedPlaces(event, data.bookings)}
          booking={booking} onBook={book} onReport={() => open('report', { eventId: event.id })} />;
      }
      case 'signIn':
      case 'signUp': {
        const signUp = page.name === 'signUp';
        return <AccountScreen key={page.name} signUp={signUp} role={role} profile={data.profile} onBack={goBack}
          onSwitch={() => replace(signUp ? 'signIn' : 'signUp', { next: page.next, entry: page.entry })}
          onContinue={({ name, email, city, organization }) => {
            update((current) => {
              if (signUp && current.profile.email) throw new Error('This device already has a demo account. Use Log in.');
              if (!signUp && current.profile.email !== email) throw new Error('That email does not match a demo account on this device.');
              return { ...current, signedIn: true, profile: signUp ? { ...current.profile, name, email, city, organization } : current.profile };
            });
            if (page.next) replace(page.next.name, page.next);
            else setPages((current) => current.slice(0, -1));
          }} />;
      }
      case 'reservation':
        return <ReservationScreen key={page.requestId} event={event} events={events} bookings={bookings}
          remaining={remainingPlaces(event, data.bookings)} profile={data.profile} onBack={goBack}
          onConfirm={(names) => replace('ticket', { bookingId: reserve(event.id, names, page.requestId), confirmed: true })} />;
      case 'ticket': {
        const booking = bookings.find((item) => item.id === page.bookingId);
        const bookedEvent = events.find((item) => item.id === booking.eventId);
        return <TicketScreen key={booking.id} event={bookedEvent} booking={booking} confirmed={page.confirmed}
          onCancel={cancel} onBack={goBack} onEvent={() => openEvent(bookedEvent)}
          onCalendar={() => open('calendar', { date: bookedEvent.startDate })} />;
      }
      case 'registrations':
        return <ReservationsList bookings={bookings} events={events} onBack={goBack} onOpen={openTicket} onBrowse={browseEvents}
          onSignIn={!data.signedIn && data.profile.name ? () => open(data.profile.email ? 'signIn' : 'signUp') : undefined} />;
      case 'calendar':
        return <CalendarScreen bookings={bookings} events={events} view={page} onChange={(view) => replace('calendar', view)}
          onBack={goBack} onOpen={openTicket} onBrowse={browseEvents} />;
      case 'saved': {
        const saved = [...data.savedIds].reverse().map((id) => events.find((item) => item.id === id)).filter(Boolean);
        return <SavedEventsScreen events={saved} renderEvent={renderEvent} onBack={goBack} onBrowse={browseEvents} />;
      }
      case 'settings':
      case 'editProfile':
      case 'interests':
        return <SettingsScreen key={page.name} mode={page.name} profile={data.profile} signedIn={data.signedIn} onBack={goBack}
          onSave={(profile) => { update((current) => ({ ...current, profile })); goBack(); }}
          onSignOut={signOut} />;
      case 'notifications':
        return <NotificationsScreen data={data} events={events} onBack={goBack}
          onSettings={() => open('settings')} onRead={markNoticesRead}
          onOpen={({ bookingId, eventId }) => bookingId ? openTicket(bookingId) : open('event', { eventId })} />;
      case 'report':
        return <ReportScreen event={event} onBack={goBack} onSubmit={(reportCategory, note) => {
          const report = { id: randomUUID(), eventId: event.id, category: reportCategory, note, status: 'Open' };
          update((current) => ({ ...current, reports: [report, ...current.reports] }));
        }} />;
      default:
        if (isDiscovery) {
          return <DiscoveryScreen home={tab === 'Home'} openExplore={() => setTab('Explore')} openNotifications={() => open('notifications')} openMenu={() => setMenuOpen(true)}
            renderEvent={renderEvent} search={search} setSearch={setSearch} category={category} setCategory={setCategory}
            filters={filters} setFilters={setFilters} events={publicEvents} city={data.profile.city} interests={data.profile.interests}
            nextEvent={nextEvent} />;
        }
        if (tab === 'Map') return <MapScreen events={publicEvents} renderEvent={renderEvent} onOpen={openEvent} city={data.profile.city} />;
        return <ProfileScreen signedIn={data.signedIn} profile={data.profile} onOpen={open} onBack={() => setTab('Home')} />;
    }
  }

  if (launching) {
    return (
      <View style={styles.background}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.shell}>
          <LaunchScreen ready={ready && fontsReady} onLayout={hideNativeSplash} onFinish={() => setLaunching(false)} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.background}>
      <StatusBar barStyle={!role || purpleTop ? 'light-content' : 'dark-content'} />
      <View style={styles.shell}>
        <SafeAreaView edges={role ? ['top'] : ['top', 'bottom']} style={[styles.safeTop, purpleTop && styles.purpleTop, !role && styles.welcomeSafeArea]}>
          <View style={styles.content}>
            {!!storageWarning && <Copy alert>{storageWarning}</Copy>}
            {renderPage()}
          </View>
        </SafeAreaView>
        {page || role !== 'attendee' ? (
          role && <SafeAreaView edges={['bottom']} />
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
      {menuOpen && (
        <SideMenu profile={data.profile} signedIn={data.signedIn} onSignOut={signOut}
          onClose={() => setMenuOpen(false)}
          onProfile={() => { setMenuOpen(false); setTab('Profile'); }}
          onOpen={(name) => { setMenuOpen(false); open(name); }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#EFEDFA', alignItems: 'center' },
  shell: { flex: 1, width: '100%', maxWidth: 520, backgroundColor: colors.white },
  safeTop: { flex: 1, backgroundColor: colors.white },
  purpleTop: { backgroundColor: colors.purple },
  welcomeSafeArea: { backgroundColor: '#121031' },
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
});

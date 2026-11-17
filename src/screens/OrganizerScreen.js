// Controls organizer tabs and opens event management, attendance, and check-in screens.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Action, Copy, EmptyState, Field, HeaderAction, Page, Panel, SectionHeading } from '../components/FlowUI';
import SideMenu from '../components/SideMenu';
import AttendanceProgress from '../components/AttendanceProgress';
import { CheckInEvents, OrganizerTicketCheckIn } from './OrganizerCheckIn';
import AttendanceDashboard from '../components/AttendanceDashboard';
import OrganizerEventEditor from './OrganizerEventEditor';
import useOrganizerBack from '../hooks/useOrganizerBack';
import CalendarScreen from './CalendarScreen';
import OrganizerEventsScreen from './OrganizerEventsScreen';
import OrganizerEventHub from './OrganizerEventHub';
import { OrganizerOverview, OrganizerOverviewHeader } from './OrganizerOverview';
import { OrganizerNotificationsScreen, OrganizerNotificationSettings } from './OrganizerNotificationsScreen';
import { EditOrganizerProfile, OrganizerAccountProfile } from './OrganizerProfileScreen';
import { SettingsScreen } from './ProfileScreen';
import { isMapPoint } from '../data/venueSearch';
import { exportAttendanceCsv } from '../data/attendanceExport';
import { getOrganizerEvents } from '../data/attendance';
import { matchesOrganizerEventFilter, organizerEventCounts, publicEventStatuses } from '../data/organizerEvents';
import { organizerInbox, organizerPreferences, updateOrganizerPreferences } from '../data/organizerNotifications';
import { editableOrganizerProfile, saveOrganizerProfile } from '../data/organizerProfiles';
import { eventTime } from '../data/reservations';
import { colors, headingFont, iconSizes, spacing, touchTargets, typography } from '../theme';

const workspaceTabs = [
  { label: 'Overview', icon: 'home' },
  { label: 'Events', icon: 'calendar' },
  { label: 'Attendance', icon: 'people' },
  { label: 'Check-in', icon: 'qr-code' },
  { label: 'Profile', icon: 'person' },
];

const organizerTools = [
  { name: 'Calendar', label: 'Event calendar', icon: 'calendar-number-outline' },
  { name: 'Notifications', label: 'Notifications', icon: 'notifications-outline' },
  { name: 'Notification settings', label: 'Notification settings', icon: 'options-outline' },
  { name: 'Settings', label: 'Settings', icon: 'settings-outline' },
  { name: 'Switch role', label: 'Switch role', icon: 'swap-horizontal-outline' },
];

export function OrganizerScreen({ data, events, onSave, onStatus, onScan, onBack, onSignOut, update, commit, storageWarning }) {
  const [editor, setEditor] = useState(null);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [group, setGroup] = useState('All');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('Upcoming first');
  const [menuOpen, setMenuOpen] = useState(false);
  const [calendarView, setCalendarView] = useState({});
  const [notificationBack, setNotificationBack] = useState('Overview');
  const [toolBack, setToolBack] = useState('Overview');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [attendanceView, setAttendanceView] = useState({});
  // Collect events this organizer can manage for their workspace.
  const myEvents = useMemo(() => {
    if (!data.signedIn) return [];
    const createdEventIds = new Set(data.createdEvents.map((event) => event.id));
    const candidates = events.filter((event) => event.organizerEmail || createdEventIds.has(event.id));
    return getOrganizerEvents(candidates, data.profile);
  }, [data.createdEvents, data.profile, data.signedIn, events]);
  const organizerProfile = editableOrganizerProfile(data);
  const organization = organizerProfile.organization || data.organizerApplication?.organization;
  const preferences = organizerPreferences(data);
  const notices = organizerInbox(data, myEvents, preferences);
  const unreadCount = notices.filter((notice) => !notice.read).length;
  const notificationLabel = unreadCount ? `Open notifications, ${unreadCount} unread` : 'Open notifications';

  // Open a specific management section for the selected event.
  function openEvent(event, screen = 'overview') {
    setSelected({ id: event.id, screen });
  }

  function openEventList(filter) {
    setGroup(filter === 'Live' ? 'Published' : filter);
    setQuery('');
    setTab('Events');
  }

  function openMenu() {
    Keyboard.dismiss();
    setMenuOpen(true);
  }

  function openTool(name) {
    Keyboard.dismiss();
    setMenuOpen(false);
    if (name === 'Switch role') return onBack();
    if (name === 'Notification settings') setNotificationBack(tab);
    if (['Calendar', 'Notifications', 'Settings'].includes(name)) setToolBack(tab);
    setTab(name);
  }

  function updatePreferences(change) {
    update((current) => updateOrganizerPreferences(current, change));
  }

  function backFromTool() {
    if (editingProfile) setEditingProfile(false);
    else if (selected) setSelected(null);
    else if (tab === 'Overview') onBack();
    else if (tab === 'Notification settings') setTab(notificationBack);
    else if (['Calendar', 'Notifications', 'Settings'].includes(tab)) setTab(toolBack);
    else setTab('Overview');
  }

  const selectedEvent = selected && myEvents.find((event) => event.id === selected.id);
  useOrganizerBack(backFromTool, !menuOpen && !editor && !selectedEvent && !editingProfile);

  if (editingProfile) {
    return <EditOrganizerProfile profile={organizerProfile} onBack={backFromTool}
      onSave={async (draft) => {
        await commit((current) => saveOrganizerProfile(current, draft));
        setProfileSaved(true);
        setEditingProfile(false);
      }} />;
  }
  if (editor) return <OrganizerEventEditor event={editor} bookings={data.bookings} knownVenues={events.filter(isMapPoint)} onBack={() => setEditor(null)} onSave={async (draft, publish) => {
    await onSave(draft, editor.id, publish);
    if (!editor.id || publish) openEventList(publish ? 'Live' : 'Drafts');
    setEditor(null);
  }} />;
  if (selected) {
    if (!selectedEvent) return <Page title="Event management" onBack={backFromTool}>
      <EmptyState icon="calendar-outline" title="Event unavailable"
        description={storageWarning ? 'Reopen the app to try loading your saved events.' : 'This event could not be found in your organizer workspace.'} />
    </Page>;
    return <ManageEvent key={selectedEvent.id} event={selectedEvent} initialScreen={selected.screen} bookings={data.bookings}
      onBack={() => setSelected(null)} onEdit={() => setEditor(selectedEvent)} onScan={onScan}
      onStatus={async (eventId, status, reason) => {
        await onStatus(eventId, status, reason);
        if (!matchesOrganizerEventFilter({ ...selectedEvent, status }, group)) setGroup('All');
      }} />;
  }
  if (tab === 'Calendar') {
    return <CalendarScreen organizer events={myEvents} view={calendarView} onChange={setCalendarView}
      onBack={backFromTool} onOpen={openEvent} onBrowse={() => openEventList('All')} />;
  }
  if (tab === 'Settings') {
    return <SettingsScreen profile={data.profile} signedIn={data.signedIn} onBack={backFromTool}
      onSave={(profile) => { update((current) => ({ ...current, profile })); backFromTool(); }} onSignOut={onSignOut} />;
  }
  if (tab === 'Notifications') {
    return <OrganizerNotificationsScreen notices={notices} onBack={backFromTool} onOpenEvent={openEvent}
      onSettings={() => openTool('Notification settings')} onRead={(ids) => updatePreferences((current) => ({
        ...current, readIds: [...new Set([...(current.readIds ?? []), ...ids])],
      }))} />;
  }
  if (tab === 'Notification settings') {
    return <OrganizerNotificationSettings preferences={preferences} onBack={backFromTool}
      onChange={(key, value) => updatePreferences((current) =>
        current.muted && key !== 'muted' ? current : { ...current, [key]: value })} />;
  }
  return (
    <View style={styles.workspace}>
      <Page key={tab} title={tab === 'Events' ? 'My Events' : tab} showsVerticalScrollIndicator={tab !== 'Overview'}
        leading={<HeaderAction label="Open organizer menu" icon="menu" onPress={openMenu} />}
        actions={<HeaderAction label={notificationLabel} icon="notifications-outline" badge={unreadCount}
          onPress={() => openTool('Notifications')} />}
        banner={tab === 'Overview' && (
          <OrganizerOverviewHeader profile={organizerProfile} organization={organization} onMenu={openMenu}
            notificationLabel={notificationLabel} unreadCount={unreadCount} onNotifications={() => openTool('Notifications')} />
        )}>
        {tab === 'Overview' && (
          <OrganizerOverview events={myEvents} bookings={data.bookings} notices={notices}
            onCreate={() => setEditor({})} onManage={openEvent} onEvents={openEventList}
            onAttendance={() => setTab('Attendance')} onCheckIn={() => setTab('Check-in')} />
        )}
        {tab === 'Events' && (
          <OrganizerEventsScreen events={myEvents} bookings={data.bookings} storageWarning={storageWarning}
            filter={group} query={query} sort={sort} onFilter={setGroup} onQuery={setQuery} onSort={setSort}
            onCreate={() => setEditor({})} onManage={openEvent} onEdit={setEditor}
            onPublish={async (event) => {
              await onStatus(event.id, 'Published');
              if (!matchesOrganizerEventFilter({ ...event, status: 'Published' }, group)) openEventList('Published');
            }} />
        )}
        {(tab === 'Attendance' || tab === 'Attendees') && (
          <AttendanceDashboard
            events={myEvents.filter((e) => e.status !== 'Draft').length > 0 ? myEvents.filter((e) => e.status !== 'Draft') : myEvents}
            bookings={data.bookings}
            view={attendanceView} onViewChange={setAttendanceView}
            onCheckIn={onScan}
            onOpenScanner={(evt) => openEvent(evt, 'checkIn')}
          />
        )}
        {tab === 'Check-in' && <CheckInEvents events={myEvents} bookings={data.bookings}
          onOpen={(event) => openEvent(event, 'checkIn')} onBrowse={() => openEventList('All')} />}
        {tab === 'Profile' && <OrganizerAccountProfile profile={organizerProfile} saved={profileSaved}
          onEdit={() => { setProfileSaved(false); setEditingProfile(true); }}
          onSettings={() => openTool('Settings')} onNotifications={() => openTool('Notification settings')} onSignOut={onSignOut} />}
      </Page>
      <OrganizerTabBar selected={tab} onSelect={setTab} />
      {menuOpen && <SideMenu profile={{ ...data.profile, name: organizerProfile.name }} picture={organizerProfile.picture}
        signedIn={data.signedIn} tools={organizerTools}
        onOpen={openTool} onClose={() => setMenuOpen(false)} onSignOut={onSignOut} />}
    </View>
  );
}

// Render the workspace tabs and support keyboard navigation.
function OrganizerTabBar({ selected, onSelect }) {
  const buttons = useRef([]);

  function select(label) {
    Keyboard.dismiss();
    onSelect(label);
  }

  function handleKeyDown(event, index) {
    const last = workspaceTabs.length - 1;
    const destinations = {
      ArrowLeft: index === 0 ? last : index - 1,
      ArrowRight: index === last ? 0 : index + 1,
      Home: 0,
      End: last,
      ' ': index,
    };
    const next = destinations[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(workspaceTabs[next].label);
    buttons.current[next]?.focus();
  }

  return (
    <View accessibilityRole="tablist" accessibilityLabel="Organizer navigation" style={styles.tabBar}>
      {workspaceTabs.map(({ label, icon }, index) => {
        const active = selected === label;
        return (
          <Pressable key={label} ref={(button) => { buttons.current[index] = button; }}
            accessibilityRole="tab" accessibilityLabel={label} aria-selected={active}
            {...(Platform.OS === 'web' && { tabIndex: active ? 0 : -1, onKeyDown: (event) => handleKeyDown(event, index) })}
            onPress={() => select(label)} style={({ focused }) => [styles.tab, focused && styles.tabFocus]}>
            <Ionicons name={active ? icon : `${icon}-outline`} size={iconSizes.lg}
              color={active ? colors.primary : colors.textSecondary} />
            <Text numberOfLines={2} style={styles.tabLabel}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function AttendanceCounts({ items }) {
  return (
    <View style={styles.countStrip}>
      {items.map(([label, value]) => (
        <View key={label} style={styles.stripItem}>
          <Text style={styles.count}>{value}</Text>
          <Text style={styles.rowMeta}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const eventConfirmations = {
  close: { title: 'Close registration', status: 'Closed', text: 'New reservations will close. Existing tickets stay valid for check-in.' },
  cancel: { title: 'Cancel event', status: 'Cancelled' },
  archive: { title: 'Archive event', status: 'Archived', text: 'This event will move to Archived and its listing will be removed from discovery.' },
};

// Control the event details, attendance, and check-in views for a single event.
function ManageEvent({ event, bookings, initialScreen, onBack, onEdit, onStatus, onScan }) {
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [screen, setScreen] = useState(initialScreen);
  const [section, setSection] = useState('Overview');
  const [attendanceView, setAttendanceView] = useState({});
  const [scannerFromAttendance, setScannerFromAttendance] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const updatingRef = useRef(false);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    setNow(Date.now());
    const clock = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(clock);
  }, [screen]);
  const related = useMemo(() => bookings.filter((booking) => booking.eventId === event.id), [bookings, event.id]);
  const counts = useMemo(() => organizerEventCounts([event], related).get(event.id), [event, related]);
  const { places: reserved, checkedIn } = counts;
  const publicEvent = publicEventStatuses.includes(event.status);
  const ended = eventTime(event, event.endTime) <= now;
  const canViewSummary = ended && (publicEvent || (event.status === 'Archived' && event.archivedFrom !== 'Cancelled'));
  const cancelled = related.reduce((total, booking) => total + (booking.status === 'Cancelled' ? booking.tickets.length : 0), 0);
  const attendanceRate = reserved ? Math.round(100 * checkedIn / reserved) : null;

  function back() {
    if (updatingRef.current) return;
    setMessage('');
    if (screen === 'checkIn' && scannerFromAttendance) {
      setScannerFromAttendance(false);
      setScreen('attendees');
    } else if (screen === initialScreen || screen === 'overview') onBack();
    else setScreen('overview');
  }
  useOrganizerBack(back, screen !== 'checkIn');

  async function update(status) {
    if (updatingRef.current) return;
    updatingRef.current = true;
    setUpdating(true);
    setMessage('');
    try {
      await onStatus(event.id, status, reason);
      setReason('');
      setMessage('');
      setScreen('overview');
    } catch (failure) {
      setMessage(failure.message);
    } finally {
      updatingRef.current = false;
      setUpdating(false);
    }
  }

  // Pass the current attendance totals to the CSV exporter.
  async function exportSummary() {
    setExporting(true);
    setMessage('');
    try {
      await exportAttendanceCsv(event, { reserved, checkedIn, cancelled, attendanceRate });
    } catch (failure) {
      setMessage(failure.message || 'The CSV could not be exported. Try again.');
    } finally {
      setExporting(false);
    }
  }

  function openTool(next) {
    setMessage('');
    setScreen(next);
  }

  if (screen === 'summary') {
    return (
      <Page title="Event summary" onBack={back}>
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>{event.title}</Text>
          <Copy>{event.date} · {event.venue}</Copy>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.rowTitle}>Attendance rate</Text>
          <Text style={styles.summaryRate}>{attendanceRate === null ? '—' : `${attendanceRate}%`}</Text>
          <Copy>{reserved ? `${checkedIn} of ${reserved} confirmed places checked in` : 'There were no confirmed reservations.'}</Copy>
          {attendanceRate !== null && <AttendanceProgress value={attendanceRate} />}
        </View>
        <AttendanceCounts items={[[ 'Reserved', reserved ], [ 'No-shows', reserved - checkedIn ], [ 'Cancelled', cancelled ]]} />
        {!!message && <Copy alert>{message}</Copy>}
        <Action label={exporting ? 'Preparing CSV…' : 'Export summary CSV'} icon="download-outline" onPress={exportSummary} disabled={exporting} />
      </Page>
    );
  }

  if (screen === 'attendees') {
    return (
      <Page title="Attendance" onBack={back}>
        <AttendanceDashboard
          events={[event]}
          bookings={bookings}
          view={attendanceView} onViewChange={setAttendanceView}
          onCheckIn={onScan}
          onOpenScanner={() => { setScannerFromAttendance(true); openTool('checkIn'); }}
        />
      </Page>
    );
  }

  if (screen === 'checkIn') return <OrganizerTicketCheckIn event={event} counts={counts} onBack={back} onValidate={onScan} />;

  const confirmation = eventConfirmations[screen];
  if (confirmation) {
    const cancelling = screen === 'cancel';
    return (
      <Page title={confirmation.title} onBack={back}>
        <Panel title={event.title}>
          <Copy>{cancelling ? `${reserved} reserved places. Cancelling invalidates tickets and adds an in-app update for affected attendees.` : confirmation.text}</Copy>
        </Panel>
        {cancelling && <Field label="Cancellation reason" value={reason} onChangeText={setReason} editable={!updating} multiline maxLength={240} />}
        {!!message && <Copy alert>{message}</Copy>}
        <Action label={cancelling ? 'Confirm event cancellation' : `Confirm ${confirmation.title.toLowerCase()}`}
          variant={screen === 'close' ? 'primary' : 'danger'} disabled={cancelling && !reason.trim()} loading={updating}
          onPress={() => update(confirmation.status)} />
      </Page>
    );
  }

  return <OrganizerEventHub event={event} related={related} counts={counts} now={now}
    section={section} onSection={setSection} canViewSummary={canViewSummary} message={message} publishing={updating}
    onBack={back} onEdit={onEdit} onOpen={openTool} onPublish={() => update('Published')} />;
}

const styles = StyleSheet.create({
  workspace: { flex: 1, minWidth: 0, minHeight: 0, backgroundColor: colors.surface },
  section: { gap: spacing.xs },
  sectionTitle: { color: colors.ink, fontFamily: headingFont, fontSize: 18 },
  rowTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  rowMeta: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  pressed: { backgroundColor: colors.lavender },
  tabBar: { flexDirection: 'row', flexShrink: 0, padding: spacing.xxs, backgroundColor: colors.surface },
  tab: { flex: 1, minWidth: 0, minHeight: touchTargets.standard, alignItems: 'center',
    justifyContent: 'center', gap: spacing.xxs, paddingVertical: spacing.xxs },
  tabFocus: Platform.OS === 'web'
    ? { outlineColor: colors.primary, outlineWidth: 2, outlineStyle: 'solid', outlineOffset: -2 }
    : {},
  tabLabel: { ...typography.caption, alignSelf: 'stretch', textAlign: 'center', color: colors.textSecondary },
  countStrip: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderColor: colors.line, borderRadius: 15, padding: 12, gap: 8 },
  stripItem: { flexGrow: 1, flexBasis: '28%', minWidth: 65, gap: 3 },
  count: { color: colors.purpleDark, fontFamily: headingFont, fontSize: 24 },
  summaryCard: { backgroundColor: '#F5F4FF', padding: 20, borderRadius: 20, gap: 8 },
  summaryRate: { color: colors.purpleDark, fontFamily: headingFont, fontSize: 48 },
});

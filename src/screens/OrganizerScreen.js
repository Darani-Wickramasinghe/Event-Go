import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { BackHandler, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Action, Choices, Copy, Field, Page, Panel } from '../components/FlowUI';
import TicketScanner from '../components/TicketScanner';
import EventCoverPicker from '../components/EventCoverPicker';
import VenuePickerScreen from './VenuePickerScreen';
import { categories, eventCoverSource, formatPrice } from '../data/events';
import { eventFromDraft } from '../data/eventOperations';
import { isMapPoint } from '../data/venueSearch';
import { eventTime, remainingPlaces, reservedPlaces, sriLankaDate } from '../data/reservations';
import { colors, headingFont } from '../theme';

const eventGroups = {
  All: null,
  Live: ['Published', 'Rescheduled', 'Closed'],
  Drafts: ['Draft'],
  Completed: ['Completed'],
  Cancelled: ['Cancelled'],
  Archived: ['Archived'],
};

const workspaceTabs = [
  { label: 'Overview', icon: 'grid-outline' },
  { label: 'Events', icon: 'calendar-outline' },
  { label: 'Attendees', icon: 'people-outline' },
  { label: 'Check-in', icon: 'qr-code-outline' },
];

function organizerEventStatus(event) {
  return eventGroups.Live.includes(event.status) && eventTime(event, event.endTime) <= Date.now()
    ? 'Completed'
    : event.status;
}

export function OrganizerScreen({ data, events, onSave, onStatus, onScan, onBack, onOpenSettings }) {
  const [editor, setEditor] = useState(null);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [group, setGroup] = useState('All');
  const [query, setQuery] = useState('');
  const visibleEvents = events.filter((event) => (!eventGroups[group] || eventGroups[group].includes(organizerEventStatus(event)))
    && event.title.toLowerCase().includes(query.trim().toLowerCase()));
  const live = events.filter((event) => eventGroups.Live.includes(organizerEventStatus(event)));
  const upcoming = [...live].sort((first, second) => eventTime(first) - eventTime(second));
  const attendeeEvents = events.filter((event) => event.status !== 'Draft');
  const organization = data.profile.organization || data.organizerApplication?.organization || 'Organizer dashboard';

  function openEvent(event, screen = 'overview') {
    setSelected({ id: event.id, screen });
  }

  useOrganizerBack(tab === 'Overview' ? onBack : () => setTab('Overview'), !editor && !selected);

  if (editor) return <EventEditor event={editor} bookings={data.bookings} knownVenues={events.filter(isMapPoint)} onBack={() => setEditor(null)} onSave={(draft, publish) => {
    onSave(draft, editor.id, publish);
    if (!editor.id || publish) { setGroup(publish ? 'Live' : 'Drafts'); setQuery(''); setTab('Events'); }
    setEditor(null);
  }} />;
  if (selected) {
    const event = events.find((item) => item.id === selected.id);
    return <ManageEvent key={event.id} event={event} initialScreen={selected.screen} bookings={data.bookings}
      onBack={() => setSelected(null)} onEdit={() => setEditor(event)} onStatus={onStatus} onScan={onScan} />;
  }
  return (
    <View style={styles.workspace}>
      <Page key={tab} title={tab === 'Overview' ? 'Organizer dashboard' : tab} onBack={tab === 'Overview' ? onBack : () => setTab('Overview')}>
        {tab === 'Overview' && (
          <>
            <View style={styles.hero}>
              <Ionicons name="business-outline" size={24} color={colors.white} />
              <Text accessibilityRole="header" style={styles.heroTitle}>{organization}</Text>
            </View>
            <DashboardSummary events={events} bookings={data.bookings} />
            <Action label="Create event draft" icon="add" onPress={() => setEditor({})} />
            <Section title="Coming up">
              {upcoming.slice(0, 3).map((event) => <EventRow key={event.id} event={event} onPress={() => openEvent(event)} />)}
              {!upcoming.length && <Copy>Published events will appear here.</Copy>}
            </Section>
            <Section title="Workspace">
              <NavRow label="Settings" icon="settings-outline" onPress={onOpenSettings} />
            </Section>
          </>
        )}
        {tab === 'Events' && (
          <>
            <Action label="Create event draft" icon="add" onPress={() => setEditor({})} />
            <Field label="Search my events" value={query} onChangeText={setQuery} placeholder="Event name" />
            <Choices label="Event status" options={Object.keys(eventGroups)} selected={[group]} onSelect={setGroup} />
            {visibleEvents.map((event) => (
              <EventRow key={event.id} event={event} onPress={() => openEvent(event)}
                detail={`${reservedPlaces(event, data.bookings)} reserved`} />
            ))}
            {!visibleEvents.length && <Copy>No events in this view.</Copy>}
          </>
        )}
        {tab === 'Attendees' && (
          <Section title="Choose an event">
            {attendeeEvents.map((event) => (
              <EventRow key={event.id} event={event} onPress={() => openEvent(event, 'attendees')}
                detail={`${reservedPlaces(event, data.bookings)} reserved`} />
            ))}
            {!attendeeEvents.length && <Copy>Attendee lists appear after an event is published.</Copy>}
          </Section>
        )}
        {tab === 'Check-in' && (
          <Section title="Choose an event to check in">
            {upcoming.map((event) => <EventRow key={event.id} event={event} onPress={() => openEvent(event, 'checkIn')} />)}
            {!upcoming.length && <Copy>No live events available for check-in.</Copy>}
          </Section>
        )}
      </Page>
      <View style={styles.tabBar}>
        {workspaceTabs.map(({ label, icon }) => (
          <Pressable key={label} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: tab === label }}
            onPress={() => setTab(label)} style={[styles.tab, tab === label && styles.activeTab]}>
            <Ionicons name={icon} size={21} color={tab === label ? colors.purpleDark : colors.muted} />
            <Text style={[styles.tabLabel, tab === label && styles.activeLabel]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function useOrganizerBack(onBack, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => subscription.remove();
  }, [onBack, enabled]);
}

function Section({ title, children }) {
  return <View style={styles.section}><Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function EventRow({ event, detail, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Manage ${event.title}`} onPress={onPress}
      style={({ pressed }) => [styles.eventRow, pressed && styles.pressed]}>
      <Image source={event.image} style={styles.thumbnail} />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{event.title}</Text>
        <Text style={styles.rowMeta}>{event.date}</Text>
        <Text style={styles.statusText}>{organizerEventStatus(event)}{detail ? ` · ${detail}` : ''}</Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color={colors.muted} />
    </Pressable>
  );
}

function NavRow({ label, icon, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.navRow}>
      <Ionicons name={icon} size={21} color={colors.purpleDark} />
      <Text style={[styles.rowTitle, styles.rowBody]}>{label}</Text>
      <Ionicons name="chevron-forward" size={17} color={colors.muted} />
    </Pressable>
  );
}

function DashboardSummary({ events, bookings }) {
  const metrics = [
    ['Live events', events.filter((event) => eventGroups.Live.includes(organizerEventStatus(event))).length],
    ['Drafts', events.filter((event) => event.status === 'Draft').length],
    ['Reserved places', bookings.filter((booking) => booking.status === 'Confirmed').reduce((total, booking) => total + booking.tickets.length, 0)],
    ['Checked in', bookings.flatMap((booking) => booking.tickets).filter((ticket) => ticket.checkedInAt).length],
  ];
  return (
    <Section title="Overview">
      <View style={styles.metrics}>
        {metrics.map(([label, count]) => (
          <View key={label} style={styles.metric}>
            <Text style={styles.count}>{count}</Text>
            <Text style={styles.rowMeta}>{label}</Text>
          </View>
        ))}
      </View>
    </Section>
  );
}

function EventEditor({ event, bookings, knownVenues, onSave, onBack }) {
  const [draft, setDraft] = useState({
    title: event.title ?? '', city: event.city ?? '', venue: event.venue ?? '',
    category: event.category ?? 'Music', setting: event.setting ?? 'Indoor', description: event.description ?? '',
    startDate: event.startDate ?? sriLankaDate(), startTime: event.startTime ?? '10:00', endTime: event.endTime ?? '12:00',
    capacity: String(event.capacity ?? ''), price: String(event.price ?? 0),
    latitude: String(event.latitude ?? ''), longitude: String(event.longitude ?? ''),
    reason: '',
    eligibility: event.eligibility ?? '', accessibility: event.accessibility ?? '',
    coverImage: event.coverImage ?? null,
  });
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [pickingVenue, setPickingVenue] = useState(false);
  const [preparingCover, setPreparingCover] = useState(false);
  const cover = eventCoverSource(draft.coverImage, event.defaultImage, draft.category);
  const steps = ['Details', 'Schedule', 'Admission', 'Preview'];
  const previous = step > 0 ? () => { setError(''); setStep(step - 1); } : onBack;
  const closePicker = () => setPickingVenue(false);
  useOrganizerBack(pickingVenue ? closePicker : previous);
  const point = draft.latitude !== '' && draft.longitude !== ''
    ? { latitude: Number(draft.latitude), longitude: Number(draft.longitude) }
    : null;

  function next() {
    setError('');
    if (step === 0 && (!draft.title.trim() || !draft.description.trim())) {
      setError('Enter a title and description to continue.');
      return;
    }
    if (step === 1 && (!draft.venue.trim() || !draft.city.trim())) {
      setError('Enter a venue and city to continue.');
      return;
    }
    if (step > 0) {
      try {
        eventFromDraft(step === 1 ? { ...draft, capacity: '', price: '0' } : draft, event.id, bookings);
      } catch (failure) {
        setError(failure.message);
        return;
      }
    }
    setStep(step + 1);
  }

  function save(publish = false) {
    try {
      onSave(draft, publish);
    } catch (failure) {
      setError(failure.message);
    }
  }

  if (pickingVenue) {
    return <VenuePickerScreen venue={draft.venue} city={draft.city} point={point} knownVenues={knownVenues} onBack={closePicker}
      onSelect={(location) => {
        setDraft((current) => ({ ...current, ...location }));
        setError('');
        closePicker();
      }} />;
  }

  if (step === 3) {
    return (
      <Page title="Preview listing" onBack={previous}>
        <EditorProgress step={step} steps={steps} />
        <Image source={cover} accessibilityRole="image" accessibilityLabel="Listing cover preview" resizeMode="cover" style={styles.eventCover} />
        <Panel title={draft.title.trim() || 'Untitled event'}>
          <Copy>{draft.category} · {draft.setting}</Copy>
          <Copy>{draft.startDate} · {draft.startTime}–{draft.endTime} · Sri Lanka time</Copy>
          <Copy>{draft.venue}, {draft.city}</Copy>
          <Copy>{draft.description}</Copy>
          {!!draft.eligibility && <Copy>Eligibility · {draft.eligibility}</Copy>}
          {!!draft.accessibility && <Copy>Accessibility · {draft.accessibility}</Copy>}
          <Copy>{draft.price ? formatPrice(Number(draft.price)) : 'Free'} · {draft.capacity || 'Unlimited'} places</Copy>
        </Panel>
        {!!error && <Copy alert>{error}</Copy>}
        {(!event.id || event.status === 'Draft') && <Action label="Publish event" onPress={() => save(true)} />}
        <Action label={!event.id || event.status === 'Draft' ? 'Save draft' : 'Save event changes'}
          secondary={!event.id || event.status === 'Draft'} onPress={() => save()} />
        <Action label="Back to editing" secondary onPress={previous} />
      </Page>
    );
  }

  return (
    <Page key={step} title={event.id ? 'Edit event' : 'New event draft'} onBack={previous}>
      <EditorProgress step={step} steps={steps} />
      {step === 0 && (
        <>
          <Field label="Event title" value={draft.title} maxLength={90} onChangeText={(title) => setDraft({ ...draft, title })} />
          <Choices label="Category" options={categories.slice(1).map((category) => category.label)} selected={[draft.category]} onSelect={(category) => setDraft({ ...draft, category })} />
          <Choices label="Venue setting" options={['Indoor', 'Outdoor']} selected={[draft.setting]} onSelect={(setting) => setDraft({ ...draft, setting })} />
          <Field label="Description" multiline maxLength={700} value={draft.description} onChangeText={(description) => setDraft({ ...draft, description })} />
          <EventCoverPicker image={cover} hasCustomCover={!!draft.coverImage}
            onBusyChange={setPreparingCover} onChange={(coverImage) => setDraft((current) => ({ ...current, coverImage }))} />
        </>
      )}
      {step === 1 && (
        <Panel title="Venue location">
          <Copy>{point ? [draft.venue, draft.city].filter(Boolean).join(', ') : 'Search for a venue or drop a pin on the map.'}</Copy>
          <Action label={point ? 'Change venue on map' : 'Choose venue on map'} icon="location-outline" secondary onPress={() => setPickingVenue(true)} />
          {!point && !!draft.venue && !!draft.city && <Copy>Saved venue: {draft.venue}, {draft.city}</Copy>}
        </Panel>
      )}
      {step === 1 && [
        ['Date (YYYY-MM-DD)', 'startDate', 'YYYY-MM-DD'],
        ['Start time (HH:MM)', 'startTime', '10:00'], ['End time (HH:MM)', 'endTime', '12:00'],
      ].map(([label, key, placeholder]) => (
        <Field key={key} label={label} placeholder={placeholder} maxLength={100} value={draft[key]} onChangeText={(value) => setDraft({ ...draft, [key]: value })} />
      ))}
      {step === 2 && (
        <>
          <Field label="Capacity (blank for unlimited)" value={draft.capacity} keyboardType="number-pad" onChangeText={(capacity) => setDraft({ ...draft, capacity })} />
          <Field label="Price (LKR)" value={draft.price} keyboardType="number-pad" onChangeText={(price) => setDraft({ ...draft, price })} />
          <Field label="Eligibility (optional)" value={draft.eligibility} maxLength={200} onChangeText={(eligibility) => setDraft({ ...draft, eligibility })} />
          <Field label="Accessibility (optional)" value={draft.accessibility} maxLength={200} onChangeText={(accessibility) => setDraft({ ...draft, accessibility })} />
          {['Published', 'Rescheduled', 'Closed'].includes(event.status) && (
            <Field label="Reason for schedule or venue changes" value={draft.reason} maxLength={240} onChangeText={(reason) => setDraft({ ...draft, reason })} />
          )}
        </>
      )}
      {!!error && <Copy alert>{error}</Copy>}
      <Action label={step === 2 ? 'Preview listing' : 'Continue'} icon="arrow-forward" disabled={preparingCover} onPress={next} />
    </Page>
  );
}

function EditorProgress({ step, steps }) {
  return <View style={styles.progress}>
    <Text style={styles.statusText}>Step {step + 1} of {steps.length}</Text>
    <Text accessibilityRole="header" style={styles.sectionTitle}>{steps[step]}</Text>
    <View style={styles.progressTrack}>
      {steps.map((label, index) => <View key={label} style={[styles.progressSegment, index <= step && styles.progressActive]} />)}
    </View>
  </View>;
}

function ManageEvent({ event, bookings, initialScreen, onBack, onEdit, onStatus, onScan }) {
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [code, setCode] = useState('');
  const [screen, setScreen] = useState(initialScreen);
  const [attendeeQuery, setAttendeeQuery] = useState('');
  const [attendeeStatus, setAttendeeStatus] = useState('All');
  const related = bookings.filter((booking) => booking.eventId === event.id);
  const reserved = reservedPlaces(event, related);
  const cancelled = related.filter((booking) => booking.status === 'Cancelled').reduce((total, item) => total + item.tickets.length, 0);
  const checkedIn = related.flatMap((booking) => booking.tickets).filter((ticket) => ticket.checkedInAt).length;
  const remaining = remainingPlaces(event, related);
  const publicEvent = ['Published', 'Rescheduled', 'Closed'].includes(event.status);
  const ended = eventTime(event, event.endTime) <= Date.now();
  const attendees = related.flatMap((booking) => booking.tickets.map((ticket) => ({
    ...ticket, status: booking.status === 'Cancelled' ? 'Cancelled' : ticket.checkedInAt ? 'Checked in' : 'Reserved',
  })));
  const visibleAttendees = attendees.filter((ticket) => (attendeeStatus === 'All' || ticket.status === attendeeStatus)
    && ticket.name.toLowerCase().includes(attendeeQuery.trim().toLowerCase()));

  function back() {
    if (screen === initialScreen) onBack();
    else { setMessage(''); setScreen('overview'); }
  }
  useOrganizerBack(back);

  function update(status) {
    try {
      onStatus(event.id, status, reason);
      setReason('');
      setMessage('');
      setScreen('overview');
    } catch (failure) {
      setMessage(failure.message);
    }
  }

  if (screen === 'attendees') {
    return (
      <Page title="Attendees" onBack={back}>
        <Panel title={event.title}><Copy>{reserved} reserved · {cancelled} cancelled · {checkedIn} checked in</Copy></Panel>
        <Field label="Search attendees" value={attendeeQuery} onChangeText={setAttendeeQuery} placeholder="Attendee name" />
        <Choices label="Ticket status" options={['All', 'Reserved', 'Checked in', 'Cancelled']} selected={[attendeeStatus]} onSelect={setAttendeeStatus} />
        {visibleAttendees.map((ticket) => (
          <View key={ticket.code} style={styles.navRow}>
            <Ionicons name="person-circle-outline" size={25} color={colors.purpleDark} />
            <Text style={[styles.rowTitle, styles.rowBody]}>{ticket.name}</Text>
            <Text style={styles.statusText}>{ticket.status}</Text>
          </View>
        ))}
        {visibleAttendees.length === 0 && <Copy>{attendees.length ? 'No attendees match this search.' : 'No reservations for this event yet.'}</Copy>}
      </Page>
    );
  }

  if (screen === 'checkIn') {
    return (
      <Page title="Ticket check-in" onBack={back}>
        <View style={styles.hero}>
          <Ionicons name="qr-code-outline" size={30} color={colors.white} />
          <Text accessibilityRole="header" style={styles.heroTitle}>{event.title}</Text>
          <Text style={styles.heroCopy}>{checkedIn} checked in · {reserved} reserved</Text>
        </View>
        <TicketScanner onScan={scan} onError={setMessage} />
        <Field label="Ticket code" value={code} autoCapitalize="none" onChangeText={setCode} maxLength={80} />
        <Action label="Validate ticket" disabled={!code.trim()} onPress={() => scan(code)} />
        {!!message && <Copy alert={message !== 'Ticket checked in.'}>{message}</Copy>}
      </Page>
    );
  }

  if (screen === 'close' || screen === 'cancel') {
    const cancelling = screen === 'cancel';
    return (
      <Page title={cancelling ? 'Cancel event' : 'Close registration'} onBack={back}>
        <Panel title={event.title}>
          <Copy>{cancelling ? `${reserved} reserved places. Cancelling invalidates tickets and adds an in-app update for affected attendees.` : 'New reservations will close. Existing tickets stay valid for check-in.'}</Copy>
        </Panel>
        {cancelling && <Field label="Cancellation reason" value={reason} onChangeText={setReason} multiline maxLength={240} />}
        {!!message && <Copy alert>{message}</Copy>}
        <Action label={cancelling ? 'Confirm event cancellation' : 'Confirm close registration'}
          disabled={cancelling && !reason.trim()} onPress={() => update(cancelling ? 'Cancelled' : 'Closed')} />
      </Page>
    );
  }

  function scan(value) {
    try {
      onScan(event.id, value.trim());
      setCode('');
      setMessage('Ticket checked in.');
    } catch (failure) {
      setMessage(failure.message);
    }
  }

  return (
    <Page title={event.title} onBack={onBack}>
      <Image source={event.image} style={styles.eventCover} />
      <Section title={organizerEventStatus(event)}>
        <Copy>{event.date} · {event.venue}</Copy>
        {!!event.reason && <Copy>{event.reason}</Copy>}
        <Copy>{reserved} reserved · {cancelled} cancelled · {checkedIn} checked in</Copy>
        <Copy>{remaining === null ? 'Unlimited capacity' : `${remaining} places remaining`}</Copy>
      </Section>
      <NavRow label="View attendees" icon="people-outline" onPress={() => setScreen('attendees')} />
      {(!ended || !publicEvent) && ['Draft', 'Published', 'Rescheduled', 'Closed'].includes(event.status) && <NavRow label="Edit event" icon="create-outline" onPress={onEdit} />}
      {event.status === 'Draft' && <Action label="Publish event" onPress={() => update('Published')} />}
      {publicEvent && !ended && (
        <>
          <Action label="Open ticket check-in" icon="qr-code-outline" onPress={() => { setMessage(''); setScreen('checkIn'); }} />
          <Panel title="Registration">
            {event.status !== 'Closed' && <Action label="Close registration" secondary onPress={() => { setMessage(''); setScreen('close'); }} />}
            <Action label="Cancel event" secondary onPress={() => { setMessage(''); setScreen('cancel'); }} />
          </Panel>
        </>
      )}
      {(event.status === 'Cancelled' || (publicEvent && ended)) && <Action label="Archive event" secondary onPress={() => update('Archived')} />}
      {!!message && <Copy alert={message !== 'Ticket checked in.'}>{message}</Copy>}
    </Page>
  );
}

const styles = StyleSheet.create({
  workspace: { flex: 1, backgroundColor: colors.white },
  hero: { backgroundColor: colors.purpleDark, borderRadius: 20, padding: 20, gap: 9 },
  heroTitle: { color: colors.white, fontSize: 25, fontFamily: headingFont },
  heroCopy: { color: colors.white, fontSize: 14, lineHeight: 20 },
  section: { gap: 9 },
  sectionTitle: { color: colors.ink, fontFamily: headingFont, fontSize: 18 },
  eventRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 82, paddingVertical: 10,
    borderBottomWidth: 1, borderColor: colors.line,
  },
  thumbnail: { width: 57, height: 57, borderRadius: 10, backgroundColor: colors.lavender },
  rowBody: { flex: 1, gap: 4, minWidth: 0 },
  rowTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  rowMeta: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  statusText: { color: colors.purpleDark, fontSize: 12, fontWeight: '700' },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.line },
  pressed: { backgroundColor: colors.lavender },
  tabBar: { flexDirection: 'row', padding: 7, gap: 3, borderTopWidth: 1, borderColor: colors.line },
  tab: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 12 },
  activeTab: { backgroundColor: colors.lavender },
  tabLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  activeLabel: { color: colors.purpleDark },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#F5F4FF', borderRadius: 15, padding: 14, rowGap: 14 },
  metric: { width: '50%', paddingRight: 8, gap: 2 },
  count: { color: colors.purpleDark, fontFamily: headingFont, fontSize: 24 },
  progress: { gap: 8 },
  progressTrack: { flexDirection: 'row', gap: 6 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line },
  progressActive: { backgroundColor: colors.action },
  eventCover: { width: '100%', height: 150, borderRadius: 16, backgroundColor: colors.lavender },
});

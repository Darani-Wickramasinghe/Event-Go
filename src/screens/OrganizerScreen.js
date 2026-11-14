import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { BackHandler, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Action, Choices, Copy, Field, Page, Panel } from '../components/FlowUI';
import TicketScanner from '../components/TicketScanner';
import EventCoverPicker from '../components/EventCoverPicker';
import DateField from '../components/DateField';
import VenuePickerScreen from './VenuePickerScreen';
import { categories, eventCoverSource, formatPrice } from '../data/events';
import { eventFromDraft } from '../data/eventOperations';
import { isMapPoint } from '../data/venueSearch';
import { exportAttendanceCsv } from '../data/attendanceExport';
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
  const attendeeEvents = [
    ...upcoming,
    ...events.filter((event) => event.status !== 'Draft' && !live.includes(event))
      .sort((first, second) => eventTime(second) - eventTime(first)),
  ];
  const today = sriLankaDate();
  const todayEvents = upcoming.filter((event) => event.startDate === today);
  const laterEvents = upcoming.filter((event) => event.startDate !== today);
  const nextEvent = upcoming[0];
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
      onBack={() => setSelected(null)} onEdit={() => setEditor(event)} onScan={onScan}
      onStatus={(eventId, status, reason) => {
        onStatus(eventId, status, reason);
        if (eventGroups[group] && !eventGroups[group].includes(status)) setGroup('All');
      }} />;
  }
  return (
    <View style={styles.workspace}>
      <Page key={tab} title={tab === 'Overview' ? 'Organizer dashboard' : tab} onBack={tab === 'Overview' ? onBack : () => setTab('Overview')}>
        {tab === 'Overview' && (
          <>
            <View style={styles.hero}>
              <View pointerEvents="none" style={styles.heroOrbit} />
              <Ionicons name="business-outline" size={23} color="#CFC9FF" />
              <Text accessibilityRole="header" style={styles.heroTitle}>{organization}</Text>
              <Pressable accessibilityRole="button" onPress={() => setEditor({})}
                style={({ pressed }) => [styles.heroAction, pressed && styles.pressed]}>
                <Ionicons name="add" size={21} color={colors.purpleDark} />
                <Text style={styles.heroActionLabel}>Create event draft</Text>
              </Pressable>
            </View>
            <DashboardSummary events={events} bookings={data.bookings} />
            <Section title="Next event">
              {nextEvent ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`Manage ${nextEvent.title}`} onPress={() => openEvent(nextEvent)}
                  style={({ pressed }) => [styles.featuredEvent, pressed && styles.pressed]}>
                  <Image source={nextEvent.image} style={styles.featuredImage} />
                  <View style={styles.featuredBody}>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle}>{nextEvent.title}</Text>
                      <Text style={styles.rowMeta}>{nextEvent.date} · {nextEvent.venue}</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={20} color={colors.purpleDark} />
                  </View>
                </Pressable>
              ) : <Copy>Your next published event will appear here.</Copy>}
            </Section>
            <NavRow label="Settings" icon="settings-outline" onPress={onOpenSettings} />
          </>
        )}
        {tab === 'Events' && (
          <>
            <Action label="Create event draft" icon="add" onPress={() => setEditor({})} />
            <Field label="Search my events" value={query} onChangeText={setQuery} placeholder="Event name" />
            <Choices label="Event status" options={Object.keys(eventGroups)} selected={[group]} onSelect={setGroup} />
            {visibleEvents.map((event) => (
              <EventRow key={event.id} event={event} onPress={() => openEvent(event)}
                reserved={reservedPlaces(event, data.bookings)} />
            ))}
            {!visibleEvents.length && <Copy>No events in this view.</Copy>}
          </>
        )}
        {tab === 'Attendees' && (
          <Section title="Attendee lists">
            {attendeeEvents.map((event) => (
              <EventToolRow key={event.id} event={event} icon="people-outline"
                detail={`${reservedPlaces(event, data.bookings)} reserved · ${event.date}`}
                onPress={() => openEvent(event, 'attendees')} />
            ))}
            {!attendeeEvents.length && <Copy>Attendee lists appear after an event is published.</Copy>}
          </Section>
        )}
        {tab === 'Check-in' && (
          <>
            <Section title="Today">
              {todayEvents.map((event) => (
                <EventToolRow key={event.id} event={event} icon="qr-code-outline" detail={`${event.startTime} · ${event.venue}`}
                  onPress={() => openEvent(event, 'checkIn')} />
              ))}
              {!todayEvents.length && <Copy>No events to check in today.</Copy>}
            </Section>
            {!!laterEvents.length && (
              <Section title="Upcoming events">
                {laterEvents.map((event) => (
                  <EventToolRow key={event.id} event={event} icon="qr-code-outline" detail={event.date}
                    onPress={() => openEvent(event, 'checkIn')} />
                ))}
              </Section>
            )}
          </>
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

const statusTone = {
  Published: 'green',
  'Checked in': 'green',
  Draft: 'neutral',
  Archived: 'neutral',
  Cancelled: 'red',
  Closed: 'amber',
  Rescheduled: 'amber',
};

function StatusPill({ label }) {
  const tone = styles[statusTone[label] ?? 'purple'];
  return <Text style={[styles.statusPill, tone]}>{label}</Text>;
}

function EventRow({ event, reserved, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Manage ${event.title}`} onPress={onPress}
      style={({ pressed }) => [styles.eventRow, pressed && styles.pressed]}>
      <Image source={event.image} style={styles.thumbnail} />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{event.title}</Text>
        <Text style={styles.rowMeta}>{event.date} · {event.venue}</Text>
        <View style={styles.eventMeta}>
          <StatusPill label={organizerEventStatus(event)} />
          {event.status !== 'Draft' && <Text style={styles.rowMeta}>{reserved} reserved</Text>}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={17} color={colors.muted} />
    </Pressable>
  );
}

function EventToolRow({ event, icon, detail, onPress }) {
  const isCheckIn = icon === 'qr-code-outline';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Manage ${event.title}`} onPress={onPress}
      style={({ pressed }) => [isCheckIn ? styles.gateRow : styles.navRow, pressed && styles.pressed]}>
      <View style={[styles.toolIcon, isCheckIn && styles.gateIcon]}>
        <Ionicons name={icon} size={22} color={isCheckIn ? '#006451' : colors.purpleDark} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{event.title}</Text>
        <Text style={styles.rowMeta}>{detail}</Text>
      </View>
      <Ionicons name={isCheckIn ? 'arrow-forward' : 'chevron-forward'} size={18} color={colors.muted} />
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
    ['calendar-outline', 'Live events', events.filter((event) => eventGroups.Live.includes(organizerEventStatus(event))).length],
    ['document-text-outline', 'Drafts', events.filter((event) => event.status === 'Draft').length],
    ['ticket-outline', 'Reserved places', bookings.filter((booking) => booking.status === 'Confirmed').reduce((total, booking) => total + booking.tickets.length, 0)],
    ['checkmark-circle-outline', 'Checked in', bookings.filter((booking) => booking.status === 'Confirmed').flatMap((booking) => booking.tickets).filter((ticket) => ticket.checkedInAt).length],
  ];
  return (
    <View style={styles.metrics}>
      {metrics.map(([icon, label, count]) => (
        <View key={label} style={styles.metric}>
          <Ionicons name={icon} size={19} color={colors.purpleDark} />
          <Text style={styles.count}>{count}</Text>
          <Text style={styles.rowMeta}>{label}</Text>
        </View>
      ))}
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
  const [dateOpen, setDateOpen] = useState(false);
  const [preparingCover, setPreparingCover] = useState(false);
  const cover = eventCoverSource(draft.coverImage, event.defaultImage, draft.category);
  const steps = ['Details', 'Schedule', 'Admission', 'Preview'];
  const previous = step > 0 ? () => {
    if (dateOpen) setDateOpen(false);
    else { setError(''); setStep(step - 1); }
  } : onBack;
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
    setDateOpen(false);
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
        <View style={styles.section}>
          <Text style={styles.statusText}>{draft.category} · {draft.setting}</Text>
          <Text accessibilityRole="header" style={styles.sectionTitle}>{draft.title.trim() || 'Untitled event'}</Text>
          <ListingFact icon="calendar-outline">{draft.startDate} · {draft.startTime}–{draft.endTime} · Sri Lanka time</ListingFact>
          <ListingFact icon="location-outline">{draft.venue}, {draft.city}</ListingFact>
          <ListingFact icon="ticket-outline">{formatPrice(Number(draft.price))} · {draft.capacity || 'Unlimited'} places</ListingFact>
        </View>
        <Section title="About this event">
          <Copy>{draft.description}</Copy>
          {!!draft.eligibility && <Copy>Eligibility · {draft.eligibility}</Copy>}
          {!!draft.accessibility && <Copy>Accessibility · {draft.accessibility}</Copy>}
        </Section>
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
      {step === 1 && <DateField label="Event date" value={draft.startDate} expanded={dateOpen}
        onToggle={() => setDateOpen(!dateOpen)}
        onChange={(startDate) => { setDraft((current) => ({ ...current, startDate })); setError(''); setDateOpen(false); }} />}
      {step === 1 && [
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

function ListingFact({ icon, children }) {
  return (
    <View style={styles.listingFact}>
      <Ionicons name={icon} size={17} color={colors.purpleDark} />
      <Text style={[styles.rowBody, styles.rowMeta]}>{children}</Text>
    </View>
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
  const [summaryBack, setSummaryBack] = useState('overview');
  const [attendeeQuery, setAttendeeQuery] = useState('');
  const [attendeeStatus, setAttendeeStatus] = useState('All');
  const [exporting, setExporting] = useState(false);
  const related = bookings.filter((booking) => booking.eventId === event.id);
  const reserved = reservedPlaces(event, related);
  const remaining = remainingPlaces(event, related);
  const publicEvent = ['Published', 'Rescheduled', 'Closed'].includes(event.status);
  const ended = eventTime(event, event.endTime) <= Date.now();
  const canViewSummary = ended && (publicEvent || (event.status === 'Archived' && event.archivedFrom !== 'Cancelled'));
  const attendees = related.flatMap((booking) => booking.tickets.map((ticket) => ({
    ...ticket, status: booking.status === 'Cancelled' ? 'Cancelled' : ticket.checkedInAt ? 'Checked in' : 'Reserved',
  })));
  const cancelled = attendees.filter((ticket) => ticket.status === 'Cancelled').length;
  const checkedIn = attendees.filter((ticket) => ticket.status === 'Checked in').length;
  const attendanceRate = reserved ? Math.round(100 * checkedIn / reserved) : null;
  const attendeeCounts = [['Reserved', reserved], ['Checked in', checkedIn], ['Cancelled', cancelled]];
  const visibleAttendees = attendees.filter((ticket) => (attendeeStatus === 'All' || ticket.status === attendeeStatus)
    && ticket.name.toLowerCase().includes(attendeeQuery.trim().toLowerCase()));

  function back() {
    if (screen === 'summary') { setMessage(''); setScreen(summaryBack); }
    else if (screen === initialScreen) onBack();
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

  function openSummary() {
    setSummaryBack(screen);
    setMessage('');
    setScreen('summary');
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
      <Page title="Attendees" onBack={back}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>{event.title}</Text>
        <AttendanceCounts items={attendeeCounts} />
        {canViewSummary && <NavRow label="Event summary" icon="stats-chart-outline" onPress={openSummary} />}
        <Field label="Search attendees" value={attendeeQuery} onChangeText={setAttendeeQuery} placeholder="Attendee name" />
        <Choices label="Ticket status" options={['All', 'Reserved', 'Checked in', 'Cancelled']} selected={[attendeeStatus]} onSelect={setAttendeeStatus} />
        {visibleAttendees.map((ticket) => (
          <View key={ticket.code} style={styles.navRow}>
            <Ionicons name="person-circle-outline" size={25} color={colors.purpleDark} />
            <Text style={[styles.rowTitle, styles.rowBody]}>{ticket.name}</Text>
            <StatusPill label={ticket.status} />
          </View>
        ))}
        {visibleAttendees.length === 0 && <Copy>{attendees.length ? 'No attendees match this search.' : 'No reservations for this event yet.'}</Copy>}
      </Page>
    );
  }

  if (screen === 'checkIn') {
    return (
      <Page title="Ticket check-in" onBack={back}>
        <View style={styles.gatePanel}>
          <Ionicons name="qr-code-outline" size={28} color="#006451" />
          <Text accessibilityRole="header" style={styles.sectionTitle}>{event.title}</Text>
          <Text style={styles.rowTitle}>{checkedIn} of {reserved} checked in</Text>
          <AttendanceProgress value={attendanceRate ?? 0} />
          <TicketScanner onScan={scan} onError={setMessage} />
        </View>
        {!!message && (
          <Text accessibilityLiveRegion="polite" accessibilityRole={message === 'Ticket checked in.' ? undefined : 'alert'}
            style={[styles.feedback, message === 'Ticket checked in.' ? styles.green : styles.red]}>{message}</Text>
        )}
        <Section title="Enter a code manually">
          <Field label="Ticket code" value={code} autoCapitalize="none" autoCorrect={false} onChangeText={setCode}
            onSubmitEditing={() => { if (code.trim()) scan(code); }} maxLength={80} />
          <Action label="Validate ticket" disabled={!code.trim()} onPress={() => scan(code)} />
        </Section>
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
      <View style={styles.section}>
        <StatusPill label={organizerEventStatus(event)} />
        <Copy>{event.date} · {event.venue}</Copy>
        {!!event.reason && <Copy>{event.reason}</Copy>}
        {publicEvent && !ended && <Copy>{remaining === null ? 'Unlimited capacity' : `${remaining} places remaining`}</Copy>}
      </View>
      {event.status !== 'Draft' && <AttendanceCounts items={attendeeCounts} />}
      {canViewSummary && <Action label="Event summary" icon="stats-chart-outline" onPress={openSummary} />}
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

function AttendanceProgress({ value }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Attendance rate" accessibilityValue={{ min: 0, max: 100, now: value }}
      style={styles.attendanceTrack}>
      <View style={[styles.attendanceFill, { width: `${value}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  workspace: { flex: 1, backgroundColor: colors.white },
  hero: { backgroundColor: '#2B206F', borderRadius: 24, padding: 22, gap: 12, overflow: 'hidden' },
  heroOrbit: { position: 'absolute', width: 224, height: 224, borderRadius: 112, top: -101, right: -68,
    borderWidth: 24, borderColor: '#FFFFFF16' },
  heroTitle: { color: colors.white, fontSize: 28, fontFamily: headingFont },
  heroAction: { minHeight: 46, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 13, marginTop: 6, backgroundColor: colors.white, borderRadius: 12 },
  heroActionLabel: { color: colors.purpleDark, fontSize: 14, fontWeight: '700' },
  featuredEvent: { borderRadius: 17, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
  featuredImage: { width: '100%', height: 128 },
  featuredBody: { padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  section: { gap: 9 },
  sectionTitle: { color: colors.ink, fontFamily: headingFont, fontSize: 18 },
  eventRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 82, paddingVertical: 10,
    borderBottomWidth: 1, borderColor: colors.line,
  },
  thumbnail: { width: 65, height: 65, borderRadius: 12, backgroundColor: colors.lavender },
  rowBody: { flex: 1, gap: 4, minWidth: 0 },
  rowTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  rowMeta: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  statusText: { color: colors.purpleDark, fontSize: 12, fontWeight: '700' },
  eventMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 7, rowGap: 4 },
  listingFact: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statusPill: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, fontSize: 12, fontWeight: '700' },
  purple: { backgroundColor: colors.lavender, color: colors.purpleDark },
  green: { backgroundColor: colors.mint, color: '#006451' },
  amber: { backgroundColor: '#FFF0DA', color: '#844500' },
  red: { backgroundColor: '#FCE9EC', color: '#9E2638' },
  neutral: { backgroundColor: '#F0EFF4', color: '#55576C' },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.line },
  toolIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lavender },
  gateIcon: { backgroundColor: colors.mint },
  gateRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 70, padding: 12,
    borderRadius: 14, borderWidth: 1, borderColor: '#DCEFEA', backgroundColor: '#F6FCFA' },
  gatePanel: { backgroundColor: '#F1FBF8', borderRadius: 18, padding: 16, gap: 12 },
  feedback: { padding: 13, borderRadius: 12, fontSize: 15, fontWeight: '700' },
  pressed: { backgroundColor: colors.lavender },
  tabBar: { flexDirection: 'row', padding: 7, gap: 3, borderTopWidth: 1, borderColor: colors.line },
  tab: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 12 },
  activeTab: { backgroundColor: colors.lavender },
  tabLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  activeLabel: { color: colors.purpleDark },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { flexGrow: 1, flexBasis: '45%', gap: 3, borderRadius: 15, backgroundColor: '#F5F4FF', padding: 13 },
  countStrip: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderColor: colors.line, borderRadius: 15, padding: 12, gap: 8 },
  stripItem: { flexGrow: 1, flexBasis: '28%', minWidth: 65, gap: 3 },
  count: { color: colors.purpleDark, fontFamily: headingFont, fontSize: 24 },
  summaryCard: { backgroundColor: '#F5F4FF', padding: 20, borderRadius: 20, gap: 8 },
  summaryRate: { color: colors.purpleDark, fontFamily: headingFont, fontSize: 48 },
  attendanceTrack: { height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: '#D5D9E7' },
  attendanceFill: { height: '100%', borderRadius: 4, backgroundColor: '#08795F' },
  progress: { gap: 8 },
  progressTrack: { flexDirection: 'row', gap: 6 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line },
  progressActive: { backgroundColor: colors.action },
  eventCover: { width: '100%', height: 150, borderRadius: 16, backgroundColor: colors.lavender },
});

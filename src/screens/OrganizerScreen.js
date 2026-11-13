import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Action, Choices, Copy, Field, Page, Panel } from '../components/FlowUI';
import TicketScanner from '../components/TicketScanner';
import { categories, formatPrice } from '../data/events';
import { eventTime, remainingPlaces, reservedPlaces, sriLankaDate } from '../data/reservations';
import { colors, headingFont } from '../theme';

const eventGroups = {
  All: null,
  Live: ['Published', 'Rescheduled', 'Closed'],
  Drafts: ['Draft', 'Rejected'],
  'In review': ['Submitted'],
  Completed: ['Completed'],
  Cancelled: ['Cancelled'],
  Archived: ['Archived'],
};

function organizerEventStatus(event) {
  return eventGroups.Live.includes(event.status) && eventTime(event, event.endTime) <= Date.now()
    ? 'Completed'
    : event.status;
}

export function OrganizerScreen({ data, events, onApply, onSave, onStatus, onScan, onBack }) {
  const [editor, setEditor] = useState(null);
  const [selected, setSelected] = useState(null);
  const [group, setGroup] = useState('All');
  const [query, setQuery] = useState('');
  const visibleEvents = events.filter((event) => (!eventGroups[group] || eventGroups[group].includes(organizerEventStatus(event)))
    && event.title.toLowerCase().includes(query.trim().toLowerCase()));
  if (data.organizerAccess !== 'Approved') {
    return <OrganizerAccess status={data.organizerAccess} application={data.organizerApplication} onApply={onApply} onBack={onBack} />;
  }
  if (editor) return <EventEditor event={editor} onBack={() => setEditor(null)} onSave={(draft) => { onSave(draft, editor.id); setEditor(null); }} />;
  if (selected) {
    const event = events.find((item) => item.id === selected);
    return <ManageEvent event={event} bookings={data.bookings} onBack={() => setSelected(null)} onEdit={() => setEditor(event)} onStatus={onStatus} onScan={onScan} />;
  }
  return (
    <Page title="Organizer dashboard" onBack={onBack}>
      <DashboardSummary events={events} bookings={data.bookings} />
      <Action label="Create event draft" icon="add" onPress={() => setEditor({})} />
      <Field label="Search my events" value={query} onChangeText={setQuery} placeholder="Event name" />
      <Choices label="My events" options={Object.keys(eventGroups)} selected={[group]} onSelect={setGroup} />
      {visibleEvents.map((event) => (
        <Panel key={event.id} title={event.title}>
          <Copy>{event.date} · {organizerEventStatus(event)}</Copy>
          <Copy>{reservedPlaces(event, data.bookings)} reserved places</Copy>
          <Action label={`Manage ${event.title}`} secondary onPress={() => setSelected(event.id)} />
        </Panel>
      ))}
      {visibleEvents.length === 0 && <Copy>No events in this view.</Copy>}
    </Page>
  );
}

function OrganizerAccess({ status, application, onApply, onBack }) {
  const [applying, setApplying] = useState(false);
  const [organization, setOrganization] = useState(application?.organization ?? '');
  const [description, setDescription] = useState(application?.description ?? '');
  return (
    <Page title={applying && status !== 'Pending' ? 'Organizer application' : 'Organizer dashboard'} onBack={applying && status !== 'Pending' ? () => setApplying(false) : onBack}>
      <Panel title={`Organizer access · ${status}`}>
        {status === 'Pending' ? <Copy>{application?.organization ? `${application.organization} · ` : ''}Your application is awaiting review in the Admin workspace.</Copy>
          : <Copy>{status === 'Suspended' ? 'Organizer access is suspended.' : 'Apply to publish events and manage registrations.'}</Copy>}
      </Panel>
      {applying && status !== 'Pending' ? (
        <>
          <Field label="Organization name" value={organization} onChangeText={setOrganization} maxLength={80} />
          <Field label="Tell us about your events" value={description} onChangeText={setDescription} multiline maxLength={350} />
          <Action label="Submit application" disabled={!organization.trim() || !description.trim()} onPress={() => {
            onApply({ organization: organization.trim(), description: description.trim() });
            setApplying(false);
          }} />
        </>
      ) : ['Not requested', 'Rejected'].includes(status) && <Action label="Request organizer access" onPress={() => setApplying(true)} />}
    </Page>
  );
}

function DashboardSummary({ events, bookings }) {
  const metrics = [
    ['Live events', events.filter((event) => eventGroups.Live.includes(organizerEventStatus(event))).length],
    ['Awaiting review', events.filter((event) => event.status === 'Submitted').length],
    ['Reserved places', bookings.filter((booking) => booking.status === 'Confirmed').reduce((total, booking) => total + booking.tickets.length, 0)],
    ['Checked in', bookings.flatMap((booking) => booking.tickets).filter((ticket) => ticket.checkedInAt).length],
  ];
  return (
    <Panel title="Overview">
      <View style={styles.metrics}>
        {metrics.map(([label, count]) => (
          <View key={label} style={styles.metric}>
            <Text style={styles.count}>{count}</Text>
            <Copy>{label}</Copy>
          </View>
        ))}
      </View>
    </Panel>
  );
}

function EventEditor({ event, onSave, onBack }) {
  const [draft, setDraft] = useState({
    title: event.title ?? '', city: event.city ?? '', venue: event.venue ?? '',
    category: event.category ?? 'Music', setting: event.setting ?? 'Indoor', description: event.description ?? '',
    startDate: event.startDate ?? sriLankaDate(), startTime: event.startTime ?? '10:00', endTime: event.endTime ?? '12:00',
    capacity: String(event.capacity ?? ''), price: String(event.price ?? 0),
    latitude: String(event.latitude ?? ''), longitude: String(event.longitude ?? ''),
    reason: '',
    eligibility: event.eligibility ?? '', accessibility: event.accessibility ?? '',
  });
  const [error, setError] = useState('');
  const [review, setReview] = useState(false);

  function save() {
    try {
      onSave(draft);
    } catch (failure) {
      setError(failure.message);
    }
  }

  if (review) {
    return (
      <Page title="Preview listing" onBack={() => setReview(false)}>
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
        <Action label={event.id ? 'Save event changes' : 'Save draft'} onPress={save} />
        <Action label="Back to editing" secondary onPress={() => { setError(''); setReview(false); }} />
      </Page>
    );
  }

  return (
    <Page title={event.id ? 'Edit event' : 'New event draft'} onBack={onBack}>
      <Field label="Event title" value={draft.title} maxLength={90} onChangeText={(title) => setDraft({ ...draft, title })} />
      <Choices label="Category" options={categories.slice(1).map((category) => category.label)} selected={[draft.category]} onSelect={(category) => setDraft({ ...draft, category })} />
      <Choices label="Venue setting" options={['Indoor', 'Outdoor']} selected={[draft.setting]} onSelect={(setting) => setDraft({ ...draft, setting })} />
      {[
        ['City', 'city', 'Kelaniya'], ['Venue', 'venue', 'Venue name or address'],
        ['Latitude (optional)', 'latitude', '6.9737'], ['Longitude (optional)', 'longitude', '79.9153'],
        ['Date (YYYY-MM-DD)', 'startDate', 'YYYY-MM-DD'],
        ['Start time (HH:MM)', 'startTime', '10:00'], ['End time (HH:MM)', 'endTime', '12:00'],
        ['Capacity (blank for unlimited)', 'capacity', 'Unlimited'], ['Price (LKR)', 'price', '0'],
      ].map(([label, key, placeholder]) => (
        <Field key={key} label={label} placeholder={placeholder} maxLength={100} value={draft[key]} onChangeText={(value) => setDraft({ ...draft, [key]: value })} />
      ))}
      <Field label="Description" multiline maxLength={700} value={draft.description} onChangeText={(description) => setDraft({ ...draft, description })} />
      <Field label="Eligibility (optional)" value={draft.eligibility} maxLength={200} onChangeText={(eligibility) => setDraft({ ...draft, eligibility })} />
      <Field label="Accessibility (optional)" value={draft.accessibility} maxLength={200} onChangeText={(accessibility) => setDraft({ ...draft, accessibility })} />
      {['Published', 'Rescheduled', 'Closed'].includes(event.status) && (
        <Field label="Reason for schedule or venue changes" value={draft.reason} maxLength={240} onChangeText={(reason) => setDraft({ ...draft, reason })} />
      )}
      {!!error && <Copy alert>{error}</Copy>}
      <Action label="Preview listing" secondary onPress={() => { setError(''); setReview(true); }} />
      <Action label={event.id ? 'Save event changes' : 'Save draft'} onPress={save} />
    </Page>
  );
}

function ManageEvent({ event, bookings, onBack, onEdit, onStatus, onScan }) {
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [code, setCode] = useState('');
  const [screen, setScreen] = useState('overview');
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
      <Page title="Attendees" onBack={() => setScreen('overview')}>
        <Panel title={event.title}><Copy>{reserved} reserved · {cancelled} cancelled · {checkedIn} checked in</Copy></Panel>
        <Field label="Search attendees" value={attendeeQuery} onChangeText={setAttendeeQuery} placeholder="Attendee name" />
        <Choices label="Ticket status" options={['All', 'Reserved', 'Checked in', 'Cancelled']} selected={[attendeeStatus]} onSelect={setAttendeeStatus} />
        {visibleAttendees.map((ticket) => <Panel key={ticket.code} title={ticket.name}><Copy>{ticket.status}</Copy></Panel>)}
        {visibleAttendees.length === 0 && <Copy>{attendees.length ? 'No attendees match this search.' : 'No reservations for this event yet.'}</Copy>}
      </Page>
    );
  }

  if (screen === 'checkIn') {
    return (
      <Page title="Ticket check-in" onBack={() => setScreen('overview')}>
        <Panel title={event.title}><Copy>{checkedIn} checked in · {reserved} reserved</Copy></Panel>
        <TicketScanner onScan={scan} onError={setMessage} />
        <Field label="Ticket code" value={code} autoCapitalize="none" onChangeText={setCode} maxLength={80} />
        <Action label="Validate ticket" disabled={!code.trim()} onPress={() => scan(code)} />
        {!!message && <Copy alert={message !== 'Ticket checked in.'}>{message}</Copy>}
      </Page>
    );
  }

  if (screen === 'cancel') {
    return (
      <Page title="Cancel event" onBack={() => { setMessage(''); setScreen('overview'); }}>
        <Panel title={event.title}><Copy>{reserved} reserved places. Cancelling invalidates tickets and adds an in-app update for affected attendees.</Copy></Panel>
        <Field label="Cancellation reason" value={reason} onChangeText={setReason} multiline maxLength={240} />
        {!!message && <Copy alert>{message}</Copy>}
        <Action label="Confirm event cancellation" disabled={!reason.trim()} onPress={() => update('Cancelled')} />
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
      <Panel title={organizerEventStatus(event)}>
        <Copy>{event.date} · {event.venue}</Copy>
        {!!event.reason && <Copy>{event.reason}</Copy>}
        <Copy>{reserved} reserved · {cancelled} cancelled · {checkedIn} checked in</Copy>
        <Copy>{remaining === null ? 'Unlimited capacity' : `${remaining} places remaining`}</Copy>
      </Panel>
      <Action label="View attendees" icon="people-outline" secondary onPress={() => setScreen('attendees')} />
      {(!ended || !publicEvent) && ['Draft', 'Rejected', 'Published', 'Rescheduled', 'Closed'].includes(event.status) && <Action label="Edit event" secondary onPress={onEdit} />}
      {['Draft', 'Rejected'].includes(event.status) && <Action label="Submit for review" onPress={() => update('Submitted')} />}
      {event.status === 'Submitted' && <Copy>Awaiting review in the Admin workspace.</Copy>}
      {publicEvent && !ended && (
        <>
          <Action label="Open ticket check-in" icon="qr-code-outline" onPress={() => { setMessage(''); setScreen('checkIn'); }} />
          <Panel title="Registration">
            {event.status !== 'Closed' && <Action label="Close registration" secondary onPress={() => update('Closed')} />}
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
  metrics: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
  metric: { width: '50%', paddingRight: 8 },
  count: { color: colors.purpleDark, fontFamily: headingFont, fontSize: 25 },
});

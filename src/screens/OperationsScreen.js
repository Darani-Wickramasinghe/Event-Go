import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Action, Choices, Copy, Field, Page, Panel } from '../components/FlowUI';
import TicketScanner from '../components/TicketScanner';
import { categories } from '../data/events';
import { remainingPlaces, reservedPlaces, sriLankaDate } from '../data/reservations';
import { colors, headingFont } from '../theme';

const eventGroups = {
  All: null,
  Live: ['Published', 'Rescheduled', 'Closed'],
  Drafts: ['Draft', 'Rejected'],
  'In review': ['Submitted'],
  Cancelled: ['Cancelled'],
};

export function OrganizerScreen({ data, events, onApply, onSave, onStatus, onScan, onBack }) {
  const [editor, setEditor] = useState(null);
  const [selected, setSelected] = useState(null);
  const [group, setGroup] = useState('All');
  const visibleEvents = events.filter((event) => !eventGroups[group] || eventGroups[group].includes(event.status));
  if (editor) return <EventEditor event={editor} onBack={() => setEditor(null)} onSave={(draft) => { onSave(draft, editor.id); setEditor(null); }} />;
  if (selected) {
    const event = events.find((item) => item.id === selected);
    return <ManageEvent event={event} bookings={data.bookings} onBack={() => setSelected(null)} onEdit={() => setEditor(event)} onStatus={onStatus} onScan={onScan} />;
  }
  return (
    <Page title="Organizer dashboard" onBack={onBack}>
      {data.organizerAccess === 'Approved' ? (
        <>
          <DashboardSummary events={events} bookings={data.bookings} />
          <Action label="Create event draft" icon="add" onPress={() => setEditor({})} />
          <Choices label="My events" options={Object.keys(eventGroups)} selected={[group]} onSelect={setGroup} />
          {visibleEvents.map((event) => (
            <Panel key={event.id} title={event.title}>
              <Copy>{event.date} · {event.status}</Copy>
              <Copy>{reservedPlaces(event, data.bookings)} reserved places</Copy>
              <Action label={`Manage ${event.title}`} secondary onPress={() => setSelected(event.id)} />
            </Panel>
          ))}
          {visibleEvents.length === 0 && <Copy>No events in this view.</Copy>}
        </>
      ) : (
        <Panel title={`Organizer access · ${data.organizerAccess}`}>
          <Copy>Apply here, then review the application in the Admin workspace to try publishing and check-in.</Copy>
          <Action label="Request organizer access" onPress={onApply} disabled={data.organizerAccess === 'Pending'} />
        </Panel>
      )}
    </Page>
  );
}

function DashboardSummary({ events, bookings }) {
  const metrics = [
    ['Live events', events.filter((event) => eventGroups.Live.includes(event.status)).length],
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
  });
  const [error, setError] = useState('');

  function save() {
    try {
      onSave(draft);
    } catch (failure) {
      setError(failure.message);
    }
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
      {['Published', 'Rescheduled', 'Closed'].includes(event.status) && (
        <Field label="Reason for schedule or venue changes" value={draft.reason} maxLength={240} onChangeText={(reason) => setDraft({ ...draft, reason })} />
      )}
      {!!error && <Copy alert>{error}</Copy>}
      <Action label={event.id ? 'Save event changes' : 'Save draft'} onPress={save} />
    </Page>
  );
}

function ManageEvent({ event, bookings, onBack, onEdit, onStatus, onScan }) {
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [code, setCode] = useState('');
  const [showAttendees, setShowAttendees] = useState(false);
  const related = bookings.filter((booking) => booking.eventId === event.id);
  const reserved = reservedPlaces(event, related);
  const cancelled = related.filter((booking) => booking.status === 'Cancelled').reduce((total, item) => total + item.tickets.length, 0);
  const checkedIn = related.flatMap((booking) => booking.tickets).filter((ticket) => ticket.checkedInAt).length;
  const remaining = remainingPlaces(event, related);
  const publicEvent = ['Published', 'Rescheduled', 'Closed'].includes(event.status);

  function update(status) {
    try {
      onStatus(event.id, status, reason);
      setReason('');
      setMessage('');
    } catch (failure) {
      setMessage(failure.message);
    }
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
      <Panel title={event.status}>
        <Copy>{event.date} · {event.venue}</Copy>
        {!!event.reason && <Copy>{event.reason}</Copy>}
        <Copy>{reserved} reserved · {cancelled} cancelled · {checkedIn} checked in</Copy>
        <Copy>{remaining === null ? 'Unlimited capacity' : `${remaining} places remaining`}</Copy>
      </Panel>
      <Action label={showAttendees ? 'Hide attendees' : 'View attendees'} icon="people-outline" secondary onPress={() => setShowAttendees(!showAttendees)} />
      {showAttendees && (
        <Panel title="Attendees">
          {related.length === 0 && <Copy>No reservations for this event yet.</Copy>}
          {related.flatMap((booking) => booking.tickets.map((ticket) => (
            <Copy key={ticket.code}>{ticket.name} · {booking.status === 'Cancelled' ? 'Cancelled' : ticket.checkedInAt ? 'Checked in' : 'Reserved'}</Copy>
          )))}
        </Panel>
      )}
      {['Draft', 'Rejected', 'Published', 'Rescheduled', 'Closed'].includes(event.status) && <Action label="Edit event" secondary onPress={onEdit} />}
      {['Draft', 'Rejected'].includes(event.status) && <Action label="Submit for review" onPress={() => update('Submitted')} />}
      {publicEvent && (
        <>
          <Panel title="Registration">
            {event.status !== 'Closed' && <Action label="Close registration" secondary onPress={() => update('Closed')} />}
            <Field label="Cancellation reason" value={reason} onChangeText={setReason} maxLength={240} />
            <Action label="Cancel event" secondary disabled={!reason.trim()} onPress={() => update('Cancelled')} />
          </Panel>
          <Panel title="Check in a ticket">
            <Copy>Scan the demo QR or enter its code.</Copy>
            <TicketScanner onScan={scan} onError={setMessage} />
            <Field label="Ticket code" value={code} autoCapitalize="none" onChangeText={setCode} maxLength={80} />
            <Action label="Validate ticket" disabled={!code.trim()} onPress={() => scan(code)} />
          </Panel>
        </>
      )}
      {!!message && <Copy alert={message !== 'Ticket checked in.'}>{message}</Copy>}
    </Page>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
  metric: { width: '50%', paddingRight: 8 },
  count: { color: colors.purpleDark, fontFamily: headingFont, fontSize: 25 },
});

export function AdminScreen({ data, events, onAccess, onStatus, onReport, onBack }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const submissions = events.filter((event) => event.status === 'Submitted');
  function moderate(event, status) {
    try {
      onStatus(event.id, status, reason);
      setReason('');
      setError('');
    } catch (failure) {
      setError(failure.message);
    }
  }
  return (
    <Page title="Admin workspace" onBack={onBack}>
      <Panel title="Organizer access">
        <Copy>{data.organizerAccess}</Copy>
        {data.organizerAccess === 'Pending' && <Action label="Approve organizer" onPress={() => onAccess('Approved')} />}
        {data.organizerAccess === 'Pending' && <Action label="Reject application" secondary onPress={() => onAccess('Rejected')} />}
        {data.organizerAccess === 'Approved' && <Action label="Suspend organizer" secondary onPress={() => onAccess('Suspended')} />}
      </Panel>
      <Panel title="Event submissions">
        {submissions.length === 0 && <Copy>No drafts awaiting review.</Copy>}
        {submissions.length > 0 && <Field label="Moderation reason" value={reason} onChangeText={setReason} maxLength={240} />}
        {submissions.map((event) => (
          <Panel key={event.id} title={event.title}>
            <Copy>{event.date} · {event.venue}</Copy>
            <Copy>{event.description}</Copy>
            <Action label={`Publish ${event.title}`} onPress={() => moderate(event, 'Published')} />
            <Action label={`Reject ${event.title}`} secondary disabled={!reason.trim()} onPress={() => moderate(event, 'Rejected')} />
          </Panel>
        ))}
        {!!error && <Copy alert>{error}</Copy>}
      </Panel>
      <Panel title="Event reports">
        {data.reports.length === 0 && <Copy>No reports yet.</Copy>}
        {data.reports.map((report) => (
          <ReportReview key={report.id} report={report} event={events.find((event) => event.id === report.eventId)} onReport={onReport} />
        ))}
      </Panel>
      <Panel title="Recent actions">
        {data.audit.length === 0 && <Copy>No actions recorded.</Copy>}
        {data.audit.slice(0, 8).map((entry, index) => <Copy key={index}>{entry}</Copy>)}
      </Panel>
    </Page>
  );
}

function ReportReview({ report, event, onReport }) {
  const [note, setNote] = useState('');
  return (
    <Panel title={event?.title ?? 'Event report'}>
      <Copy>{report.category} · {report.status}</Copy>
      {!!report.note && <Copy>{report.note}</Copy>}
      {!!report.resolution && <Copy>{report.resolution}</Copy>}
      {report.status === 'Open' && <Action label="Start review" secondary onPress={() => onReport(report.id, 'Reviewing', '')} />}
      {report.status === 'Reviewing' && (
        <>
          <Field label="Resolution note" value={note} onChangeText={setNote} maxLength={240} />
          <Action label="Resolve report" disabled={!note.trim()} onPress={() => onReport(report.id, 'Resolved', note.trim())} />
        </>
      )}
    </Panel>
  );
}

export function ReportScreen({ event, onBack, onSubmit }) {
  const [category, setCategory] = useState('Misleading details');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  return (
    <Page title="Report event" onBack={onBack}>
      <Panel title={event.title}>
        {submitted && <Copy>Report submitted for moderator review.</Copy>}
      </Panel>
      {submitted ? <Action label="Return to event" onPress={onBack} /> : (
        <>
          <Choices label="Reason" options={['Misleading details', 'Inappropriate content', 'Suspected fraud']} selected={[category]} onSelect={setCategory} />
          <Field label="Details (optional)" value={note} onChangeText={setNote} multiline maxLength={500} />
          <Action label="Submit report" onPress={() => { onSubmit(category, note.trim()); setSubmitted(true); }} />
        </>
      )}
    </Page>
  );
}

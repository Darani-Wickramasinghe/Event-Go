import { useState } from 'react';
import { Action, Choices, Copy, Field, Page, Panel } from '../components/FlowUI';

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
        {data.organizerApplication && <Copy>{data.organizerApplication.organization} · {data.organizerApplication.description}</Copy>}
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

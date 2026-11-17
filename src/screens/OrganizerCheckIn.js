// Lists events available for check-in and validates camera scans or typed ticket codes.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';
import { Action, Badge, Copy, EmptyState, Field, Page, Panel, SectionHeading } from '../components/FlowUI';
import AttendanceProgress from '../components/AttendanceProgress';
import { OrganizerEventBadge, OrganizerEventFact } from '../components/OrganizerEventMedia';
import TicketScanner from '../components/TicketScanner';
import useOrganizerBack from '../hooks/useOrganizerBack';
import { organizerEventCounts, canCheckInOrganizerEvent } from '../data/organizerEvents';
import { eventTime, sriLankaDate } from '../data/reservations';
import { colors, iconSizes, radii, semanticColors, spacing, typography } from '../theme';

export function CheckInEvents({ events, bookings, onOpen, onBrowse }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(clock);
  }, []);
  const today = sriLankaDate(now);
  // Restrict the check-in list to events that are still eligible.
  const eligible = useMemo(() => events.filter((event) => event.startDate >= today &&
    canCheckInOrganizerEvent(event, now) && Number.isFinite(eventTime(event)))
    .sort((first, second) => eventTime(first) - eventTime(second)), [events, now, today]);
  const counts = useMemo(() => organizerEventCounts(eligible, bookings), [eligible, bookings]);
  const todayEvents = eligible.filter((event) => event.startDate === today);
  const upcoming = eligible.filter((event) => event.startDate > today);

  function card(event) {
    const { checkedIn, places } = counts.get(event.id);
    return <Panel key={event.id} elevated>
      <OrganizerEventBadge status={event.status} />
      <SectionHeading>{event.title}</SectionHeading>
      <OrganizerEventFact icon="calendar-outline">{event.date || `${event.startDate} · ${event.startTime}`}</OrganizerEventFact>
      <OrganizerEventFact icon="people-outline">{checkedIn} of {places} confirmed tickets checked in</OrganizerEventFact>
      <Action label="Scan tickets" accessibilityLabel={`Scan tickets for ${event.title}`} icon="scan-outline" onPress={() => onOpen(event)} />
    </Panel>;
  }

  return (
    <>
      <SectionHeading>Today</SectionHeading>
      {todayEvents.length ? todayEvents.map(card) : <EmptyState icon="calendar-outline" title="No check-ins scheduled today"
        description={upcoming.length ? 'Select an upcoming event below to open its scanner.' : 'Published events with an active schedule will appear here.'} />}
      <SectionHeading>Upcoming events</SectionHeading>
      {upcoming.length ? upcoming.map(card) : <EmptyState icon="ticket-outline" title="No upcoming check-ins">
        <Action label="Browse my events" secondary onPress={onBrowse} />
      </EmptyState>}
    </>
  );
}

export function OrganizerTicketCheckIn({ event, counts, onBack, onValidate }) {
  const [code, setCode] = useState('');
  const [manual, setManual] = useState(false);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [startRequest, setStartRequest] = useState(0);
  const validating = useRef(false);
  const lock = useRef(false);
  const rate = counts.places ? Math.round(100 * counts.checkedIn / counts.places) : 0;

  // Pass the code to the check-in action and show the accepted ticket or error.
  async function validate(value) {
    if (validating.current || lock.current) return;
    validating.current = true;
    lock.current = true;
    setBusy(true);
    setResult(null);
    Keyboard.dismiss();
    try {
      const ticket = await onValidate(event.id, value);
      setResult({ ticket });
      setCode('');
    } catch (error) {
      setResult({ error: error.message || 'Check-in failed. Try again.' });
    } finally {
      validating.current = false;
      setBusy(false);
    }
  }

  function reset() {
    lock.current = false;
    setResult(null);
  }

  // Clear the previous result and request a fresh camera scan.
  function resetAndScan() {
    reset();
    setManual(false);
    setStartRequest((value) => value + 1);
  }

  function back() {
    if (!validating.current) onBack();
  }
  useOrganizerBack(back);

  return (
    <Page title="Ticket check-in" onBack={back}>
      <Panel elevated>
        <SectionHeading>{event.title}</SectionHeading>
        <Copy>{counts.checkedIn} of {counts.places} checked in</Copy>
        <AttendanceProgress value={rate} />
      </Panel>
      {result?.ticket ? (
        <Panel style={styles.success}>
          <Ionicons name="checkmark-circle" color={semanticColors.success.text} size={iconSizes.xl} />
          <SectionHeading>Ticket accepted</SectionHeading>
          <Text accessibilityLiveRegion="polite" aria-live="polite" style={styles.name}>{result.ticket.name}</Text>
          <Copy>{event.title}</Copy>
          <Copy>Ticket {result.ticket.code}</Copy>
          <Badge label="Checked in" tone="success" />
          <Action label="Scan next ticket" icon="scan-outline" onPress={resetAndScan} />
          <Action label="Enter next ticket code" secondary onPress={() => { reset(); setManual(true); }} />
        </Panel>
      ) : (
        <>
          {result?.error && <Panel style={styles.error}>
            <View style={styles.resultTitle}>
              <Ionicons name="alert-circle-outline" color={semanticColors.error.text} size={iconSizes.lg} />
              <SectionHeading>{result.camera ? 'Camera access' : 'Ticket rejected'}</SectionHeading>
            </View>
            <Copy alert>{result.error}</Copy>
            {!result.camera && <Action label="Try again" secondary onPress={reset} />}
          </Panel>}
          {manual ? <Panel title="Enter a code manually">
            <Field label="Ticket code" placeholder="Enter the code shown on the ticket" value={code}
              autoCapitalize="none" autoCorrect={false} maxLength={150} editable={!busy}
              onChangeText={(value) => { setCode(value); reset(); }} />
            <Action label="Validate ticket" icon="checkmark-outline" loading={busy} disabled={!code.trim() || (!!result && !result.camera)}
              onPress={() => validate(code.trim())} />
            <Action label="Use camera instead" secondary disabled={busy} onPress={resetAndScan} />
          </Panel> : <Panel title="Scan a reservation QR code">
            <Copy>Position the QR code inside the frame. Keep the full code visible until it is read.</Copy>
            <TicketScanner onScan={validate} onStart={reset} startRequest={startRequest} disabled={busy}
              onError={(error) => setResult({ error, camera: true })} />
            {busy && <Copy>Validating and saving check-in…</Copy>}
            <Action label="Enter ticket code manually" icon="keypad-outline" secondary disabled={busy}
              onPress={() => { setStartRequest(0); reset(); setManual(true); }} />
          </Panel>}
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  success: { backgroundColor: semanticColors.success.surface, borderColor: semanticColors.success.border, borderRadius: radii.lg },
  error: { backgroundColor: semanticColors.error.surface, borderColor: semanticColors.error.border },
  resultTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { ...typography.label, color: colors.text },
});

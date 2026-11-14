import qrGenerator from 'qrcode-generator';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Action, Choices, Copy, Page, Panel } from '../components/FlowUI';
import { agendaEntries } from '../data/agenda';
import { bookingStatus, cancellationReason } from '../data/reservations';

export function ReservationsList({ bookings, events, onBack, onOpen, onBrowse, onSignIn }) {
  const [filter, setFilter] = useState('All');
  const entries = agendaEntries(bookings, events);
  const matches = entries.filter(({ period, status }) => filter === 'All' || filter === period || filter === status);

  return (
    <Page title="My Registrations & Tickets" onBack={onBack}>
      {entries.length > 0 && <Choices label="Show reservations" options={['All', 'Upcoming', 'Today', 'Past', 'Cancelled', 'Rescheduled']} selected={[filter]} onSelect={setFilter} />}
      {matches.map((entry) => <ReservationCard key={entry.booking.id} entry={entry} onOpen={onOpen} />)}
      {entries.length === 0 ? (
        <Panel title="No reservations yet">
          <Copy>Reserve a free place to find your ticket here.</Copy>
          <Action label="Browse events" onPress={onBrowse} />
          {onSignIn && <Action label="Reopen demo profile" secondary onPress={onSignIn} />}
        </Panel>
      ) : matches.length === 0 && <Copy>No reservations match this filter.</Copy>}
    </Page>
  );
}

export function ReservationCard({ entry, onOpen }) {
  const { booking, event, status } = entry;
  return (
    <Panel title={event.title}>
      <Copy>{event.date} · {event.venue}</Copy>
      <Copy>{status} · {booking.tickets.length} {booking.tickets.length === 1 ? 'place' : 'places'}</Copy>
      <Action label={`View reservation for ${event.title}`} secondary onPress={() => onOpen(booking.id)} />
    </Panel>
  );
}

export function TicketScreen({ booking, event, confirmed, onBack, onEvent, onCancel, onCalendar }) {
  const [index, setIndex] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const ticket = booking.tickets[index];
  const status = bookingStatus(event, booking);
  const blocked = cancellationReason(event, booking);

  function cancel() {
    try {
      onCancel(booking.id);
      setCancelling(false);
    } catch (failure) {
      setError(failure.message);
    }
  }

  return (
    <Page title={confirmed && status === 'Confirmed' ? 'Booking confirmed' : 'Reservation'} onBack={onBack}>
      <Panel title={event.title}>
        <Copy>{event.date} · Sri Lanka time</Copy>
        <Copy>{event.venue}, {event.city}</Copy>
        <Copy>{status} · {booking.tickets.length} {booking.tickets.length === 1 ? 'place' : 'places'}</Copy>
      </Panel>
      {booking.tickets.length > 1 && (
        <Choices label="Ticket" options={booking.tickets.map((_, position) => String(position + 1))} selected={[String(index + 1)]} onSelect={(value) => setIndex(Number(value) - 1)} />
      )}
      <Panel title={ticket.name}>
        {['Confirmed', 'Rescheduled', 'Checked in'].includes(status) && !ticket.checkedInAt && (
          <>
            <TicketCode code={ticket.code} />
            <Copy>Demo ticket code · {ticket.code}</Copy>
          </>
        )}
        {(ticket.checkedInAt || status === 'Cancelled' || status === 'Past registration' || status === 'Attended') && (
          <Copy>{status === 'Cancelled' ? 'Ticket cancelled' : ticket.checkedInAt ? 'Checked in' : 'Ticket expired'}</Copy>
        )}
      </Panel>
      <Action label="View event details" secondary onPress={onEvent} />
      <Action label="Open calendar" secondary onPress={onCalendar} />
      {booking.status === 'Confirmed' && (
        cancelling ? (
          <Panel title="Cancel this reservation?">
            <Copy>All places in this reservation will be released and its tickets will expire.</Copy>
            <Action label="Confirm cancellation" onPress={cancel} />
            <Action label="Keep reservation" secondary onPress={() => setCancelling(false)} />
          </Panel>
        ) : (
          <>
            <Action label="Cancel reservation" secondary onPress={() => setCancelling(true)} disabled={!!blocked} />
            <Copy>{blocked || `Cancel before ${event.date}, Sri Lanka time.`}</Copy>
          </>
        )
      )}
      {!!error && <Copy alert>{error}</Copy>}
    </Page>
  );
}

function TicketCode({ code }) {
  const rows = useMemo(() => {
    const qr = qrGenerator(0, 'M');
    qr.addData(code);
    qr.make();
    const size = qr.getModuleCount();
    return Array.from({ length: size }, (_, row) => (
      Array.from({ length: size }, (_, column) => qr.isDark(row, column))
    ));
  }, [code]);

  return (
    <View accessibilityRole="image" accessibilityLabel="Admission QR code" style={styles.qr}>
      {rows.map((row, index) => (
        <View key={index} style={styles.row}>
          {row.map((dark, column) => <View key={column} style={[styles.module, dark && styles.dark]} />)}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  qr: { alignSelf: 'center', backgroundColor: '#fff', padding: 20 },
  row: { flexDirection: 'row' },
  module: { width: 5, height: 5, backgroundColor: '#fff' },
  dark: { backgroundColor: '#111' },
});

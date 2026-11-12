import qrGenerator from 'qrcode-generator';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Action, Choices, Copy, Page, Panel } from '../components/FlowUI';
import { bookingStatus, cancellationReason, sriLankaDate } from '../data/reservations';

export function ReservationsList({ bookings, events, calendar, onBack, onOpen }) {
  const [filter, setFilter] = useState(calendar ? 'Upcoming' : 'All');
  const options = ['Upcoming', 'Today', 'Past', 'Cancelled', 'Rescheduled'];
  const today = sriLankaDate();
  const entries = bookings.flatMap((booking) => {
    const event = events.find((item) => item.id === booking.eventId);
    if (!event) return [];
    const status = bookingStatus(event, booking);
    const past = status === 'Attended' || status === 'Past registration';
    const period = status === 'Cancelled' ? 'Cancelled' : past ? 'Past' : event.startDate === today ? 'Today' : 'Upcoming';
    const matches = filter === 'All' || filter === period || (filter === 'Rescheduled' && status === 'Rescheduled');
    return matches ? [{ booking, event, status }] : [];
  }).sort((first, second) => first.event.startDate.localeCompare(second.event.startDate));

  return (
    <Page title={calendar ? 'Calendar' : 'My Registrations & Tickets'} onBack={onBack}>
      <Choices label="Show reservations" options={calendar ? options : ['All', ...options]} selected={[filter]} onSelect={setFilter} />
      {entries.length === 0 && <Copy>No reservations in this view.</Copy>}
      {entries.map(({ booking, event, status }) => (
        <Panel key={booking.id} title={event.title}>
          <Copy>{event.date} · {event.venue}</Copy>
          <Copy>{status} · {booking.tickets.length} {booking.tickets.length === 1 ? 'place' : 'places'}</Copy>
          <Action label={`View reservation for ${event.title}`} secondary onPress={() => onOpen(booking.id)} />
        </Panel>
      ))}
    </Page>
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

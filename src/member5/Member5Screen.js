import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme';
import { attendanceLabel, attendanceSummary, checkInTicket } from './attendance';
import { CHECK_RESULT, EVENT_STATUS } from './contract';
import { MOCK_NOW, mockBookings, mockEvents, mockNotices, mockTickets } from './mockData';
import { buildEventChangeNotices, buildReminders, markRead, unreadCount } from './notifications';

const SCAN_TEXT = {
  [CHECK_RESULT.ADMITTED]: 'Admitted',
  [CHECK_RESULT.ALREADY_USED]: 'Already used',
  [CHECK_RESULT.CANCELLED]: 'Ticket cancelled',
  [CHECK_RESULT.WRONG_EVENT]: 'Ticket is for a different event',
  [CHECK_RESULT.INVALID]: 'Ticket not found',
};

export default function Member5Screen() {
  const [tab, setTab] = useState('checkin');
  const [events, setEvents] = useState(mockEvents);
  const [tickets, setTickets] = useState(mockTickets);
  const [notices, setNotices] = useState(mockNotices);
  const [prefs, setPrefs] = useState({ reminderHours: 24 });
  const [eventId, setEventId] = useState('e1');
  const [code, setCode] = useState('');
  const [outcome, setOutcome] = useState(null);

  const summary = attendanceSummary(tickets, eventId);

  function scan() {
    const result = checkInTicket(tickets, code, eventId, new Date());
    setTickets(result.tickets);
    setOutcome(result.outcome);
  }

  function cancelEvent() {
    const before = events.find((item) => item.id === eventId);
    const after = { ...before, status: EVENT_STATUS.CANCELLED };
    setNotices((current) => [...buildEventChangeNotices({ before, after, bookings: mockBookings, existing: current }), ...current]);
    setEvents((current) => current.map((item) => (item.id === eventId ? after : item)));
  }

  function chooseReminder(hours) {
    const next = { reminderHours: hours };
    setPrefs(next);
    setNotices((current) => [...buildReminders({ events, bookings: mockBookings, prefs: next, existing: current, now: MOCK_NOW }), ...current]);
  }

  return (
    <View style={styles.page}>
      <Text style={styles.title}>Attendance and notifications</Text>
      <View style={styles.tabs}>
        {[['checkin', 'Check-in'], ['history', 'History'], ['inbox', `Inbox (${unreadCount(notices)})`]].map(([key, label]) => (
          <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.tabOn]}>
            <Text style={[styles.tabText, tab === key && styles.tabTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {tab === 'checkin' && (
          <>
            <Text style={styles.label}>Event being scanned</Text>
            <View style={styles.row}>
              {events.map((item) => (
                <Pressable key={item.id} onPress={() => setEventId(item.id)} style={[styles.chip, eventId === item.id && styles.chipOn]}>
                  <Text style={[styles.chipText, eventId === item.id && styles.chipTextOn]}>{item.title}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Ticket code</Text>
            <TextInput value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="e.g. EVT-TECH-001" style={styles.input} />
            <Pressable onPress={scan} style={styles.button}><Text style={styles.buttonText}>Check in ticket</Text></Pressable>
            {outcome && (
              <View style={[styles.result, outcome.result === CHECK_RESULT.ADMITTED ? styles.good : styles.bad]}>
                <Text style={styles.resultTitle}>{SCAN_TEXT[outcome.result]}</Text>
                {outcome.usedAt && <Text style={styles.copy}>Used at {new Date(outcome.usedAt).toUTCString()}</Text>}
                {outcome.ticket && <Text style={styles.copy}>{outcome.ticket.attendeeName}</Text>}
              </View>
            )}
            <Text style={styles.summary}>
              Reserved {summary.reserved} · Checked in {summary.checkedIn} · Not arrived {summary.notArrived} · Cancelled {summary.cancelled}
            </Text>
            <Text style={styles.hint}>Demo codes: {tickets.map((item) => item.token).join(', ')}</Text>
          </>
        )}

        {tab === 'history' && tickets.map((ticket) => {
          const event = events.find((item) => item.id === ticket.eventId);
          return (
            <View key={ticket.id} style={styles.card}>
              <Text style={styles.cardTitle}>{event.title}</Text>
              <Text style={styles.copy}>{ticket.attendeeName} · {ticket.token}</Text>
              <Text style={styles.status}>{attendanceLabel(ticket, event, MOCK_NOW)}</Text>
            </View>
          );
        })}

        {tab === 'inbox' && (
          <>
            <Text style={styles.label}>Remind me before events</Text>
            <View style={styles.row}>
              {[1, 24, 48].map((hours) => (
                <Pressable key={hours} onPress={() => chooseReminder(hours)} style={[styles.chip, prefs.reminderHours === hours && styles.chipOn]}>
                  <Text style={[styles.chipText, prefs.reminderHours === hours && styles.chipTextOn]}>{hours} hour{hours > 1 ? 's' : ''}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={cancelEvent} style={styles.ghost}><Text style={styles.ghostText}>Test: organizer cancels the selected event</Text></Pressable>
            {notices.map((item) => (
              <Pressable key={item.id} onPress={() => setNotices((current) => markRead(current, [item.id]))} style={styles.card}>
                <Text style={[styles.cardTitle, !item.read && styles.unread]}>{item.read ? '' : '● '}{item.message}</Text>
                <Text style={styles.copy}>{item.type}</Text>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white, paddingTop: Platform.OS === 'web' ? 16 : 48 },
  title: { color: colors.ink, fontSize: 22, fontWeight: '800', paddingHorizontal: 20, marginBottom: 12 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 8 },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.lavender },
  tabOn: { backgroundColor: colors.purple },
  tabText: { color: colors.purpleDark, fontWeight: '700' },
  tabTextOn: { color: colors.white },
  body: { padding: 20, gap: 10 },
  label: { color: colors.muted, fontWeight: '700', marginTop: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.line },
  chipOn: { backgroundColor: colors.lavender, borderColor: colors.purple },
  chipText: { color: colors.muted, fontWeight: '600' },
  chipTextOn: { color: colors.purpleDark },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12, color: colors.ink },
  button: { backgroundColor: colors.action, borderRadius: 14, padding: 14, alignItems: 'center' },
  buttonText: { color: colors.white, fontWeight: '800' },
  ghost: { borderWidth: 1, borderColor: colors.purple, borderRadius: 14, padding: 12, alignItems: 'center' },
  ghostText: { color: colors.purpleDark, fontWeight: '700' },
  result: { borderRadius: 14, padding: 14, gap: 2 },
  good: { backgroundColor: colors.mint },
  bad: { backgroundColor: '#FDE8E8' },
  resultTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  summary: { color: colors.ink, fontWeight: '700', marginTop: 8 },
  hint: { color: colors.muted, fontSize: 12 },
  card: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 14, gap: 2 },
  cardTitle: { color: colors.ink, fontWeight: '700' },
  unread: { color: colors.purpleDark },
  copy: { color: colors.muted },
  status: { color: colors.purpleDark, fontWeight: '800', marginTop: 4 },
});

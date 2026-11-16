import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Action, Badge, Choices, Copy, EmptyState, Field, HeaderAction, Panel, SectionHeading } from './FlowUI';
import AttendanceProgress from './AttendanceProgress';
import OrganizerOptionsSheet from './OrganizerOptionsSheet';
import { calculateAttendanceStats, filterAttendees, formatCheckInTime, getEventAttendees } from '../data/attendance';
import { canCheckInOrganizerEvent, organizerEventCounts } from '../data/organizerEvents';
import { colors, iconSizes, radii, spacing, touchTargets, typography } from '../theme';

const pageSize = 24;
const tone = { 'Checked in': 'success', 'Not checked in': 'warning', Cancelled: 'error' };

export default function AttendanceDashboard({ events = [], bookings = [], view, onViewChange, onCheckIn, onOpenScanner }) {
  const { eventId, search = '', filter = 'All', limit = pageSize } = view;
  const [sheet, setSheet] = useState(null);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const checking = useRef(false);
  const event = events.find((item) => item.id === eventId) ?? events[0];
  const attendees = useMemo(() => getEventAttendees(bookings, event?.id), [bookings, event?.id]);
  const stats = useMemo(() => calculateAttendanceStats(attendees), [attendees]);
  const registrations = useMemo(() => event ? organizerEventCounts([event], bookings).get(event.id).registrations : 0, [bookings, event]);
  const visible = useMemo(() => filterAttendees(attendees, search, filter), [attendees, search, filter]);
  const selected = attendees.find((ticket) => ticket.code === sheet);
  const canCheckIn = event && canCheckInOrganizerEvent(event);
  const changeSearch = (value) => onViewChange((current) => ({ ...current, search: value, limit: pageSize }));
  const changeFilter = (value) => onViewChange((current) => ({ ...current, filter: value, limit: pageSize }));

  async function checkIn(attendee) {
    if (checking.current) return;
    checking.current = true;
    setPending(true);
    setFeedback(null);
    try {
      await onCheckIn(event.id, attendee.code);
      setFeedback({ text: `${attendee.name} checked in.` });
    } catch (error) {
      setFeedback({ text: error.message || 'Check-in failed. Try again.', error: true });
    } finally {
      checking.current = false;
      setPending(false);
    }
  }

  if (!event) return <EmptyState icon="calendar-outline" title="No event selected"
    description="Create an event to manage its attendees here." />;

  const filters = ['All', 'Checked in', 'Not checked in'];
  if (attendees.some(({ isCancelled }) => isCancelled)) filters.push('Cancelled');
  const emptyTitle = search.trim() ? 'No matching attendees'
    : !attendees.length ? 'No attendees yet'
    : filter === 'Checked in' ? 'No checked-in attendees'
    : filter === 'Not checked in' ? 'No pending tickets'
    : filter === 'Cancelled' ? 'No cancelled tickets' : 'No eligible tickets';

  return (
    <View style={styles.container}>
      <Panel elevated>
        <SectionHeading>{event.title}</SectionHeading>
        <Copy>{[event.date || event.startDate, event.venue].filter(Boolean).join(' · ') || 'Schedule unavailable'}</Copy>
        {events.length > 1 && <Action label="Change event" icon="calendar-outline" secondary disabled={pending} onPress={() => setSheet('events')} />}
        {canCheckIn && onOpenScanner && <Action label="Open QR code ticket scanner" icon="scan-outline" disabled={pending}
          onPress={() => onOpenScanner(event)} />}
      </Panel>
      <Panel>
        <View style={styles.metrics}>
          {[
            [registrations, 'Confirmed bookings'], [stats.totalRegistered, 'Reserved tickets'],
            [stats.checkedIn, 'Checked in'], [stats.notCheckedIn, 'Pending tickets'],
          ].map(([value, label]) => <View key={label} style={styles.metric}>
            <Text style={styles.value}>{value}</Text><Text style={styles.caption}>{label}</Text>
          </View>)}
        </View>
        <View style={styles.progressHeading}>
          <Text style={styles.label}>Attendance rate</Text>
          {stats.totalRegistered > 0 && <Text style={styles.value}>{stats.percentage}%</Text>}
        </View>
        {stats.totalRegistered > 0 ? <>
          <AttendanceProgress value={stats.percentage} />
          <Copy>{stats.checkedIn} of {stats.totalRegistered} confirmed tickets checked in</Copy>
        </> : <Copy>Attendance is available once tickets are reserved.</Copy>}
      </Panel>
      {feedback && !selected && <Copy alert={feedback.error}>{feedback.text}</Copy>}
      <Field label="Search attendees" placeholder="Name, ticket code or booking email" value={search} onChangeText={changeSearch}
        autoCorrect={false} autoCapitalize="none" leadingIcon="search-outline"
        trailingAction={search ? <HeaderAction label="Clear attendee search" icon="close-circle-outline" onPress={() => changeSearch('')} /> : null} />
      <Choices label="Check-in status" options={filters} selected={[filter]} onSelect={changeFilter} />
      <SectionHeading>Attendees · {visible.length}</SectionHeading>
      {visible.length === 0 && <EmptyState icon="people-outline" title={emptyTitle}
        description={search.trim() ? 'Try another name, ticket code or booking email.' : !attendees.length ? 'Confirmed reservations will appear here.' : undefined}>
        {search && <Action label="Clear search" secondary onPress={() => changeSearch('')} />}
        {!search && filter !== 'All' && <Action label="Show all attendees" secondary onPress={() => changeFilter('All')} />}
      </EmptyState>}
      {visible.slice(0, limit).map((attendee) => (
        <Pressable key={attendee.code} accessibilityRole="button" accessibilityLabel={`Details for ${attendee.name}`}
          onPress={() => { setFeedback(null); setSheet(attendee.code); }}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <View style={styles.avatar}><Text style={styles.initials}>{initials(attendee.name)}</Text></View>
          <View style={styles.attendee}>
            <Text style={styles.label}>{attendee.name}</Text>
            <Text style={styles.caption} numberOfLines={1}>Ticket {attendee.code}</Text>
            <Badge label={attendee.status} tone={tone[attendee.status]} />
            {attendee.status === 'Checked in' && !!formatCheckInTime(attendee.checkedInAt) &&
              <Text style={styles.caption}>Checked in at {formatCheckInTime(attendee.checkedInAt)}</Text>}
          </View>
          <Ionicons name="chevron-forward" size={iconSizes.sm} color={colors.purpleDark} />
        </Pressable>
      ))}
      {visible.length > limit && <Action label="Show more attendees" secondary
        onPress={() => onViewChange((current) => ({ ...current, limit: limit + pageSize }))} />}

      {sheet === 'events' && <OrganizerOptionsSheet title="Select event" onClose={() => setSheet(null)}
        options={events.map((item) => ({
          label: item.title, icon: 'calendar-outline', selected: item.id === event.id,
          onPress: () => { onViewChange({ eventId: item.id }); setFeedback(null); setSheet(null); },
        }))} />}
      {selected && <OrganizerOptionsSheet title={selected.name} onClose={() => { if (!checking.current) setSheet(null); }}>
        <View style={styles.detail}>
          <Badge label={selected.status} tone={tone[selected.status]} />
          <Detail label="Event" value={event.title} />
          <Detail label="Ticket code" value={selected.code} />
          {!!selected.bookingEmail && <Detail label="Booking email" value={selected.bookingEmail} />}
          {Number.isFinite(selected.createdAt) && <Detail label="Registered" value={formatDateTime(selected.createdAt)} />}
          {selected.status === 'Checked in' && Number.isFinite(selected.checkedInAt) &&
            <Detail label="Checked in" value={formatDateTime(selected.checkedInAt)} />}
          {feedback && <Copy alert={feedback.error}>{feedback.text}</Copy>}
          {canCheckIn && onCheckIn && selected.isConfirmed && selected.status === 'Not checked in' &&
            <Action label={`Check in ${selected.name}`} loading={pending} icon="checkmark-outline" onPress={() => checkIn(selected)} />}
        </View>
      </OrganizerOptionsSheet>}
    </View>
  );
}

function Detail({ label, value }) {
  return <View><Text style={styles.label}>{label}</Text><Copy>{value}</Copy></View>;
}

function initials(name) {
  return (name ?? '').trim().split(/\s+/).slice(0, 2).map((word) => Array.from(word)[0]).join('').toUpperCase() || '?';
}

function formatDateTime(timestamp) {
  return new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Colombo' }).format(timestamp);
}

const styles = StyleSheet.create({
  container: { gap: spacing.md, minWidth: 0 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  metric: { flexGrow: 1, flexBasis: '44%', minWidth: 0, padding: spacing.xs, gap: spacing.xxs,
    backgroundColor: colors.background, borderRadius: radii.sm },
  value: { ...typography.section, color: colors.primary },
  label: { ...typography.label, color: colors.text },
  caption: { ...typography.caption, color: colors.textSecondary },
  progressHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, minHeight: touchTargets.standard,
    borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  attendee: { flex: 1, minWidth: 0, gap: spacing.xxs },
  avatar: { width: 40, height: 40, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lavender },
  initials: { ...typography.label, color: colors.purpleDark },
  detail: { paddingVertical: spacing.xs, gap: spacing.sm },
  pressed: { backgroundColor: colors.lavender },
});

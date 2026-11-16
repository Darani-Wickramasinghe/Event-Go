import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Choices, Copy, Field } from './FlowUI';
import {
  calculateAttendanceStats,
  filterAttendees,
  formatCheckInTime,
  getEventAttendees,
} from '../data/attendance';
import { colors, headingFont } from '../theme';

export default function AttendanceDashboard({
  events = [],
  bookings = [],
  initialEventId,
  onCheckIn,
  onOpenScanner,
}) {
  const [selectedEventId, setSelectedEventId] = useState(
    initialEventId ?? (events.length > 0 ? events[0].id : null)
  );
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [checkInFeedback, setCheckInFeedback] = useState('');

  // Fallback to first available organizer event if selected event is not in organizer events
  const selectedEvent = useMemo(() => {
    return events.find((e) => e.id === selectedEventId) ?? events[0] ?? null;
  }, [events, selectedEventId]);

  // Extract attendee tickets for the selected event from existing bookings
  const attendees = useMemo(() => {
    if (!selectedEvent) return [];
    return getEventAttendees(bookings, selectedEvent.id);
  }, [bookings, selectedEvent]);

  // Compute key statistics
  const stats = useMemo(() => {
    return calculateAttendanceStats(attendees);
  }, [attendees]);

  // Filter attendees based on search text and status filter
  const visibleAttendees = useMemo(() => {
    return filterAttendees(attendees, search, statusFilter);
  }, [attendees, search, statusFilter]);

  function handleDirectCheckIn(ticketCode) {
    if (!onCheckIn || !selectedEvent) return;
    try {
      onCheckIn(selectedEvent.id, ticketCode);
      setCheckInFeedback('Attendee successfully checked in.');
      setTimeout(() => setCheckInFeedback(''), 3000);
    } catch (err) {
      setCheckInFeedback(err.message || 'Check-in failed.');
      setTimeout(() => setCheckInFeedback(''), 4000);
    }
  }

  if (!events || events.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="calendar-outline" size={32} color={colors.muted} />
        </View>
        <Text accessibilityRole="header" style={styles.emptyTitle}>
          No Organizer Events
        </Text>
        <Copy>
          You do not have any published or active events to track attendance for.
          Create or publish an event first.
        </Copy>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Event Selector Header */}
      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          Select Event
        </Text>
        <Text style={styles.eventCountLabel}>
          {events.length} {events.length === 1 ? 'event' : 'events'}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.eventChipsScroll}
      >
        {events.map((event) => {
          const isSelected = selectedEvent?.id === event.id;
          return (
            <Pressable
              key={event.id}
              accessibilityRole="button"
              accessibilityLabel={`Select ${event.title}`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => {
                setSelectedEventId(event.id);
                setSearch('');
                setStatusFilter('All');
                setCheckInFeedback('');
              }}
              style={({ pressed }) => [
                styles.eventChip,
                isSelected && styles.eventChipSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.eventChipTitle,
                  isSelected && styles.eventChipTitleSelected,
                ]}
              >
                {event.title}
              </Text>
              <Text
                style={[
                  styles.eventChipDate,
                  isSelected && styles.eventChipDateSelected,
                ]}
              >
                {event.date || event.startDate}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Selected Event Context Card */}
      {selectedEvent && (
        <View style={styles.selectedEventCard}>
          <View style={styles.selectedEventInfo}>
            <Text accessibilityRole="header" style={styles.selectedEventTitle}>
              {selectedEvent.title}
            </Text>
            <Text style={styles.selectedEventMeta}>
              {selectedEvent.date} · {selectedEvent.venue}
            </Text>
          </View>
          {onOpenScanner && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open QR code ticket scanner"
              onPress={() => onOpenScanner(selectedEvent)}
              style={({ pressed }) => [
                styles.scannerButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="qr-code-outline" size={20} color="#006451" />
              <Text style={styles.scannerButtonText}>Scan QR</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Key Counts: Total Registered, Checked-in, Not-checked-in */}
      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, styles.metricCardTotal]}>
          <Ionicons name="ticket-outline" size={22} color={colors.purpleDark} />
          <Text style={styles.metricNumber}>{stats.totalRegistered}</Text>
          <Text style={styles.metricLabel}>Total Registered</Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardCheckedIn]}>
          <Ionicons
            name="checkmark-circle-outline"
            size={22}
            color="#006451"
          />
          <Text style={[styles.metricNumber, styles.greenText]}>
            {stats.checkedIn}
          </Text>
          <Text style={styles.metricLabel}>Checked In</Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardPending]}>
          <Ionicons name="time-outline" size={22} color="#844500" />
          <Text style={[styles.metricNumber, styles.amberText]}>
            {stats.notCheckedIn}
          </Text>
          <Text style={styles.metricLabel}>Not Checked In</Text>
        </View>
      </View>

      {/* Attendance Percentage Card */}
      <View style={styles.percentageCard}>
        <View style={styles.percentageHeader}>
          <View>
            <Text style={styles.percentageSubheader}>Attendance Rate</Text>
            <Text style={styles.percentageValue}>{stats.percentage}%</Text>
          </View>
          <View style={styles.percentageIconBox}>
            <Ionicons
              name="stats-chart-outline"
              size={26}
              color={colors.purpleDark}
            />
          </View>
        </View>
        <Text style={styles.percentageCopy}>
          {stats.totalRegistered > 0
            ? `${stats.checkedIn} of ${stats.totalRegistered} registered attendees checked in`
            : 'No registered attendees yet for this event.'}
        </Text>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Attendance percentage"
          accessibilityValue={{ min: 0, max: 100, now: stats.percentage }}
          style={styles.progressBarTrack}
        >
          <View
            style={[styles.progressBarFill, { width: `${stats.percentage}%` }]}
          />
        </View>
      </View>

      {/* Inline Feedback Notice */}
      {!!checkInFeedback && (
        <View
          style={[
            styles.feedbackBanner,
            checkInFeedback.includes('successfully')
              ? styles.feedbackSuccess
              : styles.feedbackError,
          ]}
        >
          <Ionicons
            name={
              checkInFeedback.includes('successfully')
                ? 'checkmark-circle'
                : 'alert-circle'
            }
            size={18}
            color={
              checkInFeedback.includes('successfully') ? '#006451' : '#9E2638'
            }
          />
          <Text
            style={[
              styles.feedbackText,
              checkInFeedback.includes('successfully')
                ? styles.feedbackTextSuccess
                : styles.feedbackTextError,
            ]}
          >
            {checkInFeedback}
          </Text>
        </View>
      )}

      {/* Search & Filters */}
      <View style={styles.searchSection}>
        <Field
          label="Search attendees"
          value={search}
          onChangeText={setSearch}
          placeholder="Attendee name or ticket code"
        />
        <Choices
          label="Check-in status"
          options={['All', 'Checked in', 'Not checked in']}
          selected={[statusFilter]}
          onSelect={setStatusFilter}
        />
      </View>

      {/* Attendee List Header */}
      <View style={styles.attendeeListHeader}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          Registered Attendees ({visibleAttendees.length})
        </Text>
      </View>

      {/* Attendee Details & Check-in Status */}
      <View style={styles.attendeesList}>
        {visibleAttendees.map((attendee) => {
          const isCheckedIn = attendee.status === 'Checked in';
          return (
            <View key={attendee.code} style={styles.attendeeCard}>
              <View
                style={[
                  styles.attendeeAvatar,
                  isCheckedIn
                    ? styles.avatarCheckedIn
                    : styles.avatarNotCheckedIn,
                ]}
              >
                <Ionicons
                  name={isCheckedIn ? 'checkmark' : 'person-outline'}
                  size={19}
                  color={isCheckedIn ? '#006451' : colors.purpleDark}
                />
              </View>

              <View style={styles.attendeeBody}>
                <Text style={styles.attendeeName}>{attendee.name}</Text>
                <Text style={styles.attendeeCode}>
                  Ticket: {attendee.code.slice(0, 18)}
                  {attendee.code.length > 18 ? '…' : ''}
                </Text>
                {isCheckedIn && attendee.checkedInAt && (
                  <Text style={styles.checkInTime}>
                    Checked in at {formatCheckInTime(attendee.checkedInAt)}
                  </Text>
                )}
              </View>

              <View style={styles.attendeeActionColumn}>
                <View
                  style={[
                    styles.statusPill,
                    isCheckedIn ? styles.pillGreen : styles.pillAmber,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      isCheckedIn
                        ? styles.pillTextGreen
                        : styles.pillTextAmber,
                    ]}
                  >
                    {attendee.status}
                  </Text>
                </View>

                {!isCheckedIn && onCheckIn && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Check in ${attendee.name}`}
                    onPress={() => handleDirectCheckIn(attendee.code)}
                    style={({ pressed }) => [
                      styles.admitButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.admitButtonText}>Check in</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}

        {visibleAttendees.length === 0 && (
          <View style={styles.emptyList}>
            <Ionicons name="people-outline" size={28} color={colors.muted} />
            <Copy>
              {attendees.length === 0
                ? 'No attendees have registered for this event yet.'
                : 'No attendees match your search or filter.'}
            </Copy>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: headingFont,
    fontSize: 18,
  },
  eventCountLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  eventChipsScroll: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  eventChip: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#FAFAFF',
    minWidth: 140,
    maxWidth: 220,
    gap: 3,
  },
  eventChipSelected: {
    backgroundColor: colors.lavender,
    borderColor: colors.action,
  },
  eventChipTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  eventChipTitleSelected: {
    color: colors.purpleDark,
  },
  eventChipDate: {
    color: colors.muted,
    fontSize: 12,
  },
  eventChipDateSelected: {
    color: colors.purpleDark,
    fontWeight: '600',
  },
  selectedEventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F5F4FF',
    borderWidth: 1,
    borderColor: '#E8E5FF',
    gap: 10,
  },
  selectedEventInfo: {
    flex: 1,
    gap: 3,
  },
  selectedEventTitle: {
    color: colors.ink,
    fontFamily: headingFont,
    fontSize: 16,
  },
  selectedEventMeta: {
    color: colors.muted,
    fontSize: 13,
  },
  scannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.mint,
    borderWidth: 1,
    borderColor: '#C3EFE2',
  },
  scannerButtonText: {
    color: '#006451',
    fontSize: 13,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 4,
  },
  metricCardTotal: {
    backgroundColor: '#FAF9FF',
    borderColor: '#ECE8FF',
  },
  metricCardCheckedIn: {
    backgroundColor: '#F3FCF9',
    borderColor: '#D7F5EC',
  },
  metricCardPending: {
    backgroundColor: '#FFFBF3',
    borderColor: '#FFEAC7',
  },
  metricNumber: {
    color: colors.purpleDark,
    fontFamily: headingFont,
    fontSize: 22,
    marginTop: 2,
  },
  greenText: {
    color: '#006451',
  },
  amberText: {
    color: '#844500',
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  percentageCard: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#F5F4FF',
    borderWidth: 1,
    borderColor: '#E6E3FF',
    gap: 8,
  },
  percentageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  percentageSubheader: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  percentageValue: {
    color: colors.purpleDark,
    fontFamily: headingFont,
    fontSize: 38,
    lineHeight: 44,
  },
  percentageIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageCopy: {
    color: colors.muted,
    fontSize: 14,
  },
  progressBarTrack: {
    height: 9,
    borderRadius: 5,
    backgroundColor: '#D9D7ED',
    overflow: 'hidden',
    marginTop: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#08795F',
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  feedbackSuccess: {
    backgroundColor: '#E7FAF3',
    borderWidth: 1,
    borderColor: '#C2EFE0',
  },
  feedbackError: {
    backgroundColor: '#FCE9EC',
    borderWidth: 1,
    borderColor: '#F8CAD2',
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  feedbackTextSuccess: {
    color: '#006451',
  },
  feedbackTextError: {
    color: '#9E2638',
  },
  searchSection: {
    gap: 12,
  },
  attendeeListHeader: {
    marginTop: 6,
  },
  attendeesList: {
    gap: 10,
  },
  attendeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  attendeeAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCheckedIn: {
    backgroundColor: colors.mint,
  },
  avatarNotCheckedIn: {
    backgroundColor: colors.lavender,
  },
  attendeeBody: {
    flex: 1,
    gap: 3,
  },
  attendeeName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  attendeeCode: {
    color: colors.muted,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  checkInTime: {
    color: '#006451',
    fontSize: 11,
    fontWeight: '600',
  },
  attendeeActionColumn: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusPill: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: 'flex-end',
  },
  pillGreen: {
    backgroundColor: colors.mint,
  },
  pillAmber: {
    backgroundColor: '#FFF0DA',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pillTextGreen: {
    color: '#006451',
  },
  pillTextAmber: {
    color: '#844500',
  },
  admitButton: {
    backgroundColor: colors.lavender,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D4CEFF',
  },
  admitButtonText: {
    color: colors.purpleDark,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyList: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FAFAFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FAFAFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: headingFont,
    fontSize: 20,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Action, Copy, EmptyState, HeaderAction, Page, Panel, SectionHeading } from '../components/FlowUI';
import { OrganizerEventBadge, OrganizerEventFact, OrganizerEventImage } from '../components/OrganizerEventMedia';
import OrganizerOptionsSheet from '../components/OrganizerOptionsSheet';
import { formatEventDate, formatPrice } from '../data/events';
import { canCheckInOrganizerEvent, organizerEventStatus, publicEventStatuses, registrationLabel } from '../data/organizerEvents';
import { eventTime, registrationStatus } from '../data/reservations';
import { shareEventLink } from '../services/shareEvent';
import { colors, iconSizes, radii, semanticColors, spacing, touchTargets, typography } from '../theme';

const sections = [
  ['Overview', 'grid-outline'],
  ['Registrations', 'people-outline'],
  ['Tickets', 'ticket-outline'],
  ['Check-in', 'qr-code-outline'],
  ['Analytics', 'stats-chart-outline'],
  ['Settings', 'settings-outline'],
];

export default function OrganizerEventHub({ event, related, counts, now, canViewSummary, section, onSection,
  onBack, onEdit, onPublish, onOpen, message, publishing }) {
  const [menu, setMenu] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(null);
  const tabs = useRef([]);
  const status = organizerEventStatus(event, now);
  const isPublic = publicEventStatuses.includes(event.status);
  const draft = event.status === 'Draft';
  const canCheckIn = canCheckInOrganizerEvent(event, now);
  const canEdit = draft || canCheckIn;
  const canClose = canCheckIn && event.status !== 'Closed';
  const canArchive = event.status === 'Cancelled' || (isPublic && status === 'Completed');
  const priceKnown = Number.isFinite(event.price) && event.price >= 0;
  const capacityKnown = Number.isFinite(event.capacity);
  const capacity = capacityKnown ? event.capacity : event.capacity === null ? 'Unlimited' : 'Unavailable';
  const availability = registrationStatus(event, related, now);
  const hasSchedule = Number.isFinite(eventTime(event));
  const bookingStatus = availability || (priceKnown && event.price > 0 ? 'Paid ticket preview'
    : priceKnown && hasSchedule ? 'Registration open' : 'Registration status unavailable');
  const available = priceKnown && event.price === 0 && hasSchedule && !availability && capacityKnown
    ? Math.max(0, event.capacity - counts.places)
    : priceKnown && event.price === 0 && (capacityKnown || event.capacity === null) && availability ? 0 : null;
  const rate = counts.places ? Math.round(100 * counts.checkedIn / counts.places) : null;
  const description = event.description?.trim();
  const close = () => setMenu(false);

  function navigateSections(event, index) {
    const last = sections.length - 1;
    const next = {
      ArrowLeft: index === 0 ? last : index - 1,
      ArrowRight: index === last ? 0 : index + 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onSection(sections[next][0]);
    tabs.current[next]?.focus();
  }

  async function share() {
    setSharing(true);
    setShareFeedback(null);
    try {
      const result = await shareEventLink(event);
      if (result) setShareFeedback({ text: result });
    } catch (error) {
      if (error.name !== 'AbortError') setShareFeedback({ text: error.message || 'Could not share the event.', error: true });
    } finally {
      setSharing(false);
      close();
    }
  }

  const options = [];
  if (canEdit) options.push({ label: 'Edit event', icon: 'create-outline', onPress: () => { close(); onEdit(); } });
  if (isPublic) options.push({ label: 'Share event', icon: 'share-social-outline', onPress: share, disabled: sharing });
  if (!draft) options.push({ label: 'View registrations', icon: 'people-outline', onPress: () => { close(); onOpen('attendees'); } });
  if (canCheckIn) options.push({ label: 'Open check-in', icon: 'qr-code-outline', onPress: () => { close(); onOpen('checkIn'); } });
  if (draft) options.push({ label: 'Publish draft', icon: 'cloud-upload-outline', onPress: () => { close(); onPublish(); } });

  return (
    <Page title="Event management" onBack={onBack}
      actions={!publishing && <HeaderAction label="Event actions" icon="ellipsis-horizontal" onPress={() => setMenu(true)} />}>
      <Panel elevated style={styles.hero}>
        <OrganizerEventImage source={event.coverImage ? event.image : event.defaultImage} style={styles.cover} iconSize={iconSizes.xl} />
        <View style={styles.heroBody}>
          <View style={styles.badges}>
            <OrganizerEventBadge status={event.status} />
            {status !== event.status && <OrganizerEventBadge status={status} />}
          </View>
          <SectionHeading style={styles.eventTitle}>{event.title}</SectionHeading>
          <OrganizerEventFact icon="calendar-outline">
            {hasSchedule ? `${formatEventDate(event.startDate, event.startTime)} · Sri Lanka time` : 'Schedule unavailable'}
          </OrganizerEventFact>
          <OrganizerEventFact icon="location-outline">
            {[event.venue, event.city].filter(Boolean).join(' · ') || 'Venue unavailable'}
          </OrganizerEventFact>
        </View>
      </Panel>

      <Panel style={styles.metrics}>
        <Metric label="Confirmed bookings" value={counts.registrations} />
        <Metric label="Reserved tickets" value={counts.places} />
        <Metric label="Checked in" value={counts.checkedIn} />
        {capacity !== 'Unavailable' && <Metric label="Capacity" value={capacity} />}
        {available !== null && <Metric label="Available tickets" value={available} />}
      </Panel>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rail} contentContainerStyle={styles.railContent}
        accessibilityRole="tablist" accessibilityLabel="Event management sections">
        {sections.map(([label, icon], index) => (
          <Pressable key={label} accessibilityRole="tab" aria-selected={section === label}
            ref={(node) => { tabs.current[index] = node; }}
            accessibilityLabel={label} onPress={() => onSection(label)}
            {...(Platform.OS === 'web' && { tabIndex: section === label ? 0 : -1, onKeyDown: (event) => navigateSections(event, index) })}
            style={({ pressed, focused }) => [styles.tab, section === label && styles.selectedTab, pressed && styles.pressed,
              focused && styles.focused]}>
            <Ionicons name={icon} size={iconSizes.sm} color={section === label ? colors.surface : colors.purpleDark} />
            <Text style={[styles.tabLabel, section === label && styles.selectedLabel]}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {!!message && <Copy alert>{message}</Copy>}
      {shareFeedback && <Copy alert={shareFeedback.error}>{shareFeedback.text}</Copy>}

      {section === 'Overview' && (
        <Panel title="About this event">
          {description ? <EventDescription description={description} /> : <Copy>No description added.</Copy>}
          {!!event.category && <OrganizerEventFact icon="pricetag-outline">{event.category}</OrganizerEventFact>}
          {!!event.organizer && <OrganizerEventFact icon="person-outline">Organized by {event.organizer}</OrganizerEventFact>}
          <OrganizerEventFact icon="ticket-outline">
            {priceKnown ? `${formatPrice(event.price)} · ${bookingStatus}` : bookingStatus}
          </OrganizerEventFact>
          {!!event.reason && <Copy>{event.reason}</Copy>}
        </Panel>
      )}
      {section === 'Registrations' && <RegistrationPreview related={related} count={counts.registrations}
        onOpen={() => onOpen('attendees')} draft={draft} />}
      {section === 'Tickets' && (
        <Panel title="Ticket information">
          {priceKnown ? <Detail label="Admission" value={formatPrice(event.price)} /> : <Copy>No ticket price is available.</Copy>}
          <Detail label="Registration" value={bookingStatus} />
          {capacity === 'Unavailable' && <Copy>No capacity information is available.</Copy>}
          {priceKnown && event.price > 0 && <Copy>Attendees can preview the paid listing. Checkout is unavailable.</Copy>}
        </Panel>
      )}
      {section === 'Check-in' && (canCheckIn
        ? <Panel title="Ticket check-in">
            <Copy>Scan a reservation QR code or enter its ticket code.</Copy>
            <Action label="Open check-in" icon="qr-code-outline" onPress={() => onOpen('checkIn')} />
          </Panel>
        : <EmptyState icon="qr-code-outline" title="Check-in unavailable"
            description={draft ? 'Publish this draft to enable ticket check-in.' : 'Ticket check-in is closed for this event.'} />)}
      {section === 'Analytics' && (
        <Panel title="Attendance analytics">
          {rate === null ? <Copy>Attendance rate will appear when there are confirmed tickets.</Copy> : (
            <>
              <Detail label="Attendance rate" value={`${rate}%`} />
              <Copy>{counts.checkedIn} of {counts.places} confirmed tickets checked in.</Copy>
            </>
          )}
          {canViewSummary && <Action label="Event summary" icon="stats-chart-outline" secondary onPress={() => onOpen('summary')} />}
        </Panel>
      )}
      {section === 'Settings' && (
        <>
          {(canEdit || canClose) && <Panel title="Event settings">
            {canEdit && <Action label="Edit event" icon="create-outline" secondary disabled={publishing} onPress={onEdit} />}
            {draft && <Action label="Publish draft" icon="cloud-upload-outline" loading={publishing} onPress={onPublish} />}
            {canClose && <Action label="Close registration" secondary onPress={() => onOpen('close')} />}
          </Panel>}
          {(canCheckIn || canArchive) && <Panel title="Event lifecycle" style={styles.dangerPanel}>
            {canCheckIn && <Action label="Cancel event" variant="danger" onPress={() => onOpen('cancel')} />}
            {canArchive && <Action label="Archive event" variant="danger" onPress={() => onOpen('archive')} />}
          </Panel>}
          {!canEdit && !canArchive && <EmptyState icon="settings-outline" title="Event settings unavailable"
            description="This event has no available edits or status changes." />}
        </>
      )}
      {menu && <OrganizerOptionsSheet title="Event actions" detail={event.title} options={options} onClose={close} />}
    </Page>
  );
}

function EventDescription({ description }) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = description.length > 170;
  const excerpt = description.slice(0, 170);
  const preview = excerpt.replace(/\s+\S*$/, '') || excerpt;
  return (
    <>
      <Text style={styles.description}>{!expanded && canExpand ? `${preview}…` : description}</Text>
      {canExpand && <Action label={expanded ? 'Read less' : 'Read more'}
        secondary onPress={() => setExpanded((current) => !current)} />}
    </>
  );
}

function RegistrationPreview({ related, count, onOpen, draft }) {
  if (!count && draft) return <EmptyState icon="people-outline" title="No registrations yet"
    description="Attendees can reserve tickets after this event is published." />;
  const recent = related.filter((booking) => booking.status === 'Confirmed' &&
    Number.isFinite(booking.createdAt) && booking.tickets[0]?.name)
    .sort((first, second) => second.createdAt - first.createdAt).slice(0, 3);
  return (
    <Panel title="Registrations">
      {count
        ? <Copy>{registrationLabel(count)} confirmed</Copy>
        : <Copy>No confirmed registrations yet.</Copy>}
      {recent.length > 0 && <View style={styles.recent}>
        <SectionHeading style={styles.tabLabel}>Recent reservations</SectionHeading>
        {recent.map((booking) => <Detail key={booking.id} label={booking.tickets[0].name}
          value={`${booking.tickets.length} ${booking.tickets.length === 1 ? 'ticket' : 'tickets'}`} />)}
      </View>}
      <Action label="View all registrations" icon="people-outline" onPress={onOpen} />
    </Panel>
  );
}

function Metric({ label, value }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function Detail({ label, value }) {
  return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Copy>{value}</Copy></View>;
}

const styles = StyleSheet.create({
  hero: { padding: 0, gap: 0, overflow: 'hidden' },
  cover: { width: '100%', height: 132, backgroundColor: colors.lavender },
  heroBody: { padding: spacing.md, gap: spacing.xs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxs },
  eventTitle: { ...typography.title },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, padding: spacing.xs },
  metric: { flexBasis: '29%', flexGrow: 1, minWidth: 75, padding: spacing.xs, backgroundColor: colors.background,
    borderRadius: radii.sm, gap: spacing.xxs },
  metricValue: { ...typography.section, color: colors.primary },
  metricLabel: { ...typography.caption, color: colors.textSecondary },
  rail: { flexGrow: 0, minWidth: 0 },
  railContent: { gap: spacing.xs, alignItems: 'center' },
  tab: { minHeight: touchTargets.minimum, flexDirection: 'row', alignItems: 'center',
    gap: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radii.pill,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  selectedTab: { borderColor: colors.primary, backgroundColor: colors.primary },
  focused: Platform.OS === 'web' ? { outlineColor: colors.primary, outlineWidth: 2, outlineStyle: 'solid', outlineOffset: -2 } : {},
  pressed: { opacity: 0.78 },
  tabLabel: { ...typography.label, color: colors.text },
  selectedLabel: { color: colors.surface },
  description: { ...typography.body, color: colors.textSecondary },
  recent: { gap: spacing.xs },
  detail: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.xs },
  detailLabel: { ...typography.label, flexShrink: 1, color: colors.text },
  dangerPanel: { borderColor: semanticColors.error.border },
});

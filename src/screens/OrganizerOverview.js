import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import EventoraLogo from '../components/EventoraLogo';
import { Action, Copy, EmptyState, HeaderAction, Panel, SectionHeading } from '../components/FlowUI';
import { OrganizerEventBadge, OrganizerEventFact, OrganizerEventImage } from '../components/OrganizerEventMedia';
import PurpleHeader from '../components/PurpleHeader';
import { formatEventDate } from '../data/events';
import { organizerAlertTypes } from '../data/organizerNotifications';
import { registrationLabel } from '../data/organizerEvents';
import { buildOrganizerOverview } from '../data/organizerOverview';
import { shareEventLink } from '../services/shareEvent';
import { colors, iconSizes, radii, semanticColors, spacing, touchTargets, typography } from '../theme';

const activityDate = new Intl.DateTimeFormat('en-LK', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Colombo',
});

export function OrganizerOverviewHeader({ profile, organization, onMenu, notificationLabel, unreadCount, onNotifications }) {
  const firstName = profile.name?.trim().split(/\s+/)[0];
  return (
    <PurpleHeader style={styles.header}>
      <View style={styles.brandRow}>
        <HeaderAction inverse label="Open organizer menu" icon="menu" onPress={onMenu} />
        <EventoraLogo style={styles.logo} />
        <View style={styles.headerBell}>
          <HeaderAction inverse label={notificationLabel} icon="notifications-outline" badge={unreadCount} onPress={onNotifications} />
        </View>
      </View>
      <View style={styles.greeting}>
        <Text style={styles.greetingText}>{firstName ? `Hello, ${firstName}` : 'Welcome'}</Text>
        <Text accessibilityRole="header" style={styles.organization}>{organization || 'Organizer dashboard'}</Text>
      </View>
    </PurpleHeader>
  );
}

export function OrganizerOverview({ events, bookings, notices, onCreate, onManage, onEvents, onAttendance, onCheckIn }) {
  const [shareFeedback, setShareFeedback] = useState(null);
  const { totals, counts, upcoming, shareableEvent, nearCapacity, expiredDrafts } = buildOrganizerOverview(events, bookings);
  const [nextEvent, ...moreEvents] = upcoming;
  const recent = notices.filter((notice) => Number.isFinite(notice.createdAt))
    .sort((first, second) => second.createdAt - first.createdAt).slice(0, 3);
  const metrics = [
    { label: 'Published events', count: totals.published, detail: 'Upcoming or active', icon: 'calendar-outline', onPress: () => onEvents('Live') },
    { label: 'Total registrations', count: totals.registrations, detail: 'Confirmed bookings', icon: 'ticket-outline', onPress: onAttendance },
    { label: 'Checked-in attendees', count: totals.checkedIn, detail: 'Scanned tickets', icon: 'person-add-outline', onPress: onAttendance },
    { label: 'Draft events', count: totals.drafts, detail: 'Awaiting publication', icon: 'document-text-outline', onPress: () => onEvents('Drafts') },
  ];

  async function share() {
    setShareFeedback(null);
    try {
      const message = await shareEventLink(shareableEvent);
      if (message) setShareFeedback({ message, error: false });
    } catch (failure) {
      if (failure.name !== 'AbortError') setShareFeedback({ message: 'The event link could not be shared.', error: true });
    }
  }

  return (
    <>
      <OverviewSection title="Next event">
        {nextEvent ? (
          <Panel elevated style={styles.featured}>
            <OrganizerEventImage key={nextEvent.id} source={nextEvent.image} style={styles.cover} iconSize={iconSizes.xl} />
            <View style={styles.featuredInfo}>
              <OrganizerEventBadge status={nextEvent.status} />
              <SectionHeading style={styles.featureTitle}>{nextEvent.title}</SectionHeading>
              <OrganizerEventFact icon="calendar-outline">{formatEventDate(nextEvent.startDate, nextEvent.startTime)}</OrganizerEventFact>
              <OrganizerEventFact icon="location-outline">{[nextEvent.venue, nextEvent.city].filter(Boolean).join(' · ')}</OrganizerEventFact>
            </View>
            <View style={styles.featuredFooter}>
              <View style={styles.featuredRegistrations}>
                <OrganizerEventFact icon="people-outline">{registrationLabel(counts.get(nextEvent.id).registrations)}</OrganizerEventFact>
              </View>
              <Action label="Manage event" icon="arrow-forward-outline" onPress={() => onManage(nextEvent)} />
            </View>
          </Panel>
        ) : (
          <EmptyState icon="calendar-outline" title="No upcoming events" description="Create and publish an event to add it to your schedule.">
            <Action label="Create event" icon="add-outline" onPress={onCreate} />
          </EmptyState>
        )}
      </OverviewSection>

      <OverviewSection title="At a glance">
        <View style={styles.grid}>
          {metrics.map(({ label, count, detail, icon, onPress }) => (
            <Pressable key={label} accessibilityRole="button" accessibilityLabel={`${label}, ${count}, ${detail}`} onPress={onPress}
              style={({ pressed }) => [styles.gridItem, styles.metricCard, pressed && styles.pressed]}>
              <View style={styles.metricTop}>
                <IconBox icon={icon} />
                <Ionicons name="chevron-forward" size={iconSizes.sm} color={colors.textSecondary} />
              </View>
              <Text style={styles.metricValue}>{count}</Text>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.caption}>{detail}</Text>
            </Pressable>
          ))}
        </View>
      </OverviewSection>

      <OverviewSection title="Quick actions">
        <View style={styles.grid}>
          <QuickAction label="Create event" icon="add-outline" onPress={onCreate} />
          <QuickAction label="Scan tickets" icon="qr-code-outline" onPress={onCheckIn} />
          <QuickAction label="View attendees" icon="people-outline" onPress={onAttendance} />
          {shareableEvent && <QuickAction label="Share event" icon="share-social-outline" onPress={share} />}
        </View>
        {shareFeedback && <Copy alert={shareFeedback.error}>{shareFeedback.message}</Copy>}
      </OverviewSection>

      <OverviewSection title="Upcoming events" onViewAll={() => onEvents('All')}>
        {moreEvents.length ? moreEvents.slice(0, 3).map((event) => (
          <Pressable key={event.id} accessibilityRole="button" accessibilityLabel={`Manage ${event.title}`}
            onPress={() => onManage(event)} style={({ pressed }) => [styles.surface, styles.eventRow, pressed && styles.pressed]}>
            <OrganizerEventImage source={event.image} style={styles.thumbnail} />
            <View style={styles.rowContent}>
              <Text style={styles.label}>{event.title}</Text>
              <Text style={styles.caption}>{formatEventDate(event.startDate, event.startTime)}</Text>
              <Text style={styles.caption}>{[event.venue, event.city].filter(Boolean).join(' · ')}</Text>
              <View style={styles.eventMeta}>
                <OrganizerEventBadge status={event.status} />
                <Text style={styles.caption}>{registrationLabel(counts.get(event.id).registrations)}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={iconSizes.sm} color={colors.textSecondary} />
          </Pressable>
        )) : <Copy>No additional upcoming events.</Copy>}
      </OverviewSection>

      {recent.length > 0 && (
        <OverviewSection title="Recent activity">
          <Panel>
            {recent.map((notice) => {
              const type = organizerAlertTypes.find(({ key }) => key === notice.type);
              if (!type) return null;
              return <OverviewRow key={notice.id} icon={type.icon} label={type.title}
                detail={notice.event.title} meta={activityDate.format(notice.createdAt)}
                onPress={() => onManage(notice.event)} />;
            })}
          </Panel>
        </OverviewSection>
      )}

      {(expiredDrafts > 0 || nearCapacity.length > 0) && (
        <OverviewSection title="Attention required">
          <Panel style={styles.attention}>
            {expiredDrafts > 0 && <OverviewRow warning icon="calendar-outline" label="Update draft schedules"
              detail={`${expiredDrafts} ${expiredDrafts === 1 ? 'draft' : 'drafts'} scheduled for times that have passed.`}
              onPress={() => onEvents('Drafts')} />}
            {nearCapacity.slice(0, 2).map((event) => {
              const remaining = Math.max(0, event.capacity - counts.get(event.id).places);
              return <OverviewRow key={event.id} warning icon="people-outline"
                label={remaining ? `${remaining} ${remaining === 1 ? 'place' : 'places'} left` : 'At capacity'}
                detail={event.title} onPress={() => onManage(event)} />;
            })}
          </Panel>
        </OverviewSection>
      )}
    </>
  );
}

function OverviewSection({ title, onViewAll, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <SectionHeading style={styles.sectionTitle}>{title}</SectionHeading>
        {onViewAll && <Pressable accessibilityRole="button" accessibilityLabel="View all events" onPress={onViewAll}
          style={styles.viewAll}><Text style={styles.link}>View all</Text></Pressable>}
      </View>
      {children}
    </View>
  );
}

function IconBox({ icon, warning }) {
  return <View style={[styles.iconBox, warning && styles.warningIcon]}>
    <Ionicons name={icon} size={iconSizes.md} color={warning ? semanticColors.warning.text : colors.primary} />
  </View>;
}

function QuickAction({ label, icon, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => [styles.gridItem, styles.quickAction, pressed && styles.pressed]}>
      <IconBox icon={icon} />
      <Text style={[styles.label, styles.rowContent]}>{label}</Text>
    </Pressable>
  );
}

function OverviewRow({ icon, label, detail, meta, warning, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${detail}`} onPress={onPress}
      style={({ pressed }) => [styles.activityRow, pressed && styles.pressed]}>
      <IconBox icon={icon} warning={warning} />
      <View style={styles.rowContent}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.caption}>{detail}</Text>
        {!!meta && <Text style={styles.caption}>{meta}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={iconSizes.sm} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.xxs, paddingBottom: spacing.md, borderBottomLeftRadius: radii.xl, borderBottomRightRadius: radii.xl },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginLeft: -spacing.xs },
  logo: { width: 108, height: touchTargets.minimum, tintColor: colors.surface },
  headerBell: { marginLeft: 'auto' },
  greeting: { gap: spacing.xxs, marginTop: spacing.xs },
  greetingText: { ...typography.label, color: colors.surface },
  organization: { ...typography.title, color: colors.surface },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sectionTitle: { flex: 1, minWidth: 0 },
  viewAll: { minHeight: touchTargets.minimum, justifyContent: 'center', alignItems: 'flex-end' },
  link: { ...typography.label, color: colors.primary },
  featured: { padding: 0, gap: 0, overflow: 'hidden' },
  featuredInfo: { padding: spacing.md, gap: spacing.xs },
  featureTitle: { fontSize: 22, lineHeight: 28 },
  featuredFooter: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderColor: colors.border },
  featuredRegistrations: { flexBasis: '35%', flexGrow: 1, minWidth: 0 },
  cover: { width: '100%', height: 156, backgroundColor: colors.lavender },
  thumbnail: { width: 58, height: 62, flexShrink: 0, borderRadius: radii.sm, backgroundColor: colors.lavender },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  gridItem: { flexBasis: '46%', flexGrow: 1, minWidth: 0, padding: spacing.sm, borderWidth: 1,
    borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface },
  metricCard: { gap: spacing.xxs },
  metricTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metricValue: { ...typography.title, color: colors.text },
  label: { ...typography.label, color: colors.text },
  caption: { ...typography.caption, color: colors.textSecondary },
  iconBox: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    borderRadius: radii.sm, backgroundColor: colors.lavender },
  quickAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: touchTargets.standard },
  surface: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm },
  rowContent: { flex: 1, minWidth: 0, gap: spacing.xxs },
  eventMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xxs },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: touchTargets.standard },
  attention: { backgroundColor: semanticColors.warning.surface, borderColor: semanticColors.warning.border },
  warningIcon: { backgroundColor: colors.surface },
  pressed: { opacity: 0.72 },
});

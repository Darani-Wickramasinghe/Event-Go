// Shows the organizer's searchable event list and each listing's actions.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import OrganizerOptionsSheet from '../components/OrganizerOptionsSheet';
import { Action, Copy, EmptyState, Field, HeaderAction, Panel, SectionHeading } from '../components/FlowUI';
import { OrganizerEventBadge, OrganizerEventFact, OrganizerEventImage } from '../components/OrganizerEventMedia';
import { formatEventDate } from '../data/events';
import {
  organizerEventCounts, organizerEventFilters, organizerEventResults, organizerEventSorts,
  organizerEventStatus, publicEventStatuses, registrationLabel,
} from '../data/organizerEvents';
import { eventTime } from '../data/reservations';
import { shareEventLink } from '../services/shareEvent';
import { colors, iconSizes, radii, spacing, touchTargets, typography } from '../theme';

export default function OrganizerEventsScreen({ events, bookings, filter, query, sort, onFilter, onQuery, onSort,
  onCreate, onManage, onEdit, onPublish, storageWarning }) {
  const [now, setNow] = useState(Date.now);
  const [menu, setMenu] = useState(null);
  const [feedback, setFeedback] = useState(null);
  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(clock);
  }, []);

  const results = useMemo(() => organizerEventResults(events, { filter, query, sort }, now), [events, filter, query, sort, now]);
  const counts = useMemo(() => organizerEventCounts(events, bookings), [events, bookings]);
  const hasQuery = !!query.trim();

  function resetFilters() {
    onQuery('');
    onFilter('All');
  }

  function openMenu(next) {
    Keyboard.dismiss();
    setFeedback(null);
    setMenu(next);
  }

  async function runAction(action, keepOpen = false) {
    if (!keepOpen) setMenu(null);
    try {
      const message = await action();
      if (message) setFeedback({ message, error: false });
    } catch (failure) {
      if (failure.name !== 'AbortError') setFeedback({ message: failure.message || 'The action could not be completed.', error: true });
    } finally {
      if (keepOpen) setMenu(null);
    }
  }

  return (
    <>
      <View style={styles.toolbar}>
        <View style={styles.titleBlock}>
          <Text style={styles.total}>{events.length} {events.length === 1 ? 'event' : 'events'} total</Text>
        </View>
        <Action label="Create event" icon="add-outline" onPress={onCreate} />
      </View>
      <Field label="Search my events" leadingIcon="search-outline" value={query} onChangeText={onQuery} placeholder="Search by event title"
        returnKeyType="search" onSubmitEditing={Keyboard.dismiss} autoCorrect={false}
        trailingAction={query ? <HeaderAction label="Clear search" icon="close-circle-outline" onPress={() => onQuery('')} /> : null} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
        style={styles.filterRail} contentContainerStyle={styles.chips}>
        {organizerEventFilters.map((item) => (
          <Pressable key={item} accessibilityRole="button" accessibilityLabel={item} aria-pressed={filter === item}
            onPress={() => onFilter(item)} style={[styles.chip, filter === item && styles.activeChip]}>
            <Text style={[styles.chipLabel, filter === item && styles.activeLabel]}>{item}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.toolbar}>
        <Text accessibilityLiveRegion="polite" aria-live="polite" style={[styles.resultCount, styles.titleBlock]}>
          {results.length} {results.length === 1 ? 'result' : 'results'}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Sort events: ${sort}`} onPress={() => openMenu({ sort: true })}
          style={({ pressed }) => [styles.sortButton, pressed && styles.pressed]}>
          <Ionicons name="swap-vertical-outline" size={iconSizes.sm} color={colors.primary} />
          <Text style={styles.sortLabel}>{sort}</Text>
          <Ionicons name="chevron-down" size={iconSizes.sm} color={colors.primary} />
        </Pressable>
      </View>

      {feedback && <Copy alert={feedback.error}>{feedback.message}</Copy>}
      {results.map((event) => <ListingCard key={event.id} event={event} status={organizerEventStatus(event, now)}
        counts={counts.get(event.id)} onManage={() => onManage(event)} onOptions={() => openMenu({ event })} />)}
      {results.length === 0 && <EventsEmptyState hasEvents={events.length > 0} hasQuery={hasQuery} filter={filter}
        storageWarning={storageWarning} onCreate={onCreate} onClear={() => onQuery('')} onReset={resetFilters} />}

      {menu?.sort && <OrganizerOptionsSheet title="Sort events" onClose={() => setMenu(null)}
        options={organizerEventSorts.map((value) => ({
          label: value, icon: value === sort ? 'checkmark-circle-outline' : 'ellipse-outline',
          selected: value === sort, onPress: () => runAction(() => onSort(value)),
        }))} />}
      {menu?.event && <EventActions event={menu.event} now={now} onClose={() => setMenu(null)}
        onManage={onManage} onEdit={onEdit} onPublish={onPublish} onAction={runAction} />}
    </>
  );
}

function ListingCard({ event, status, counts, onManage, onOptions }) {
  const date = Number.isFinite(eventTime(event)) ? formatEventDate(event.startDate, event.startTime) : 'Schedule unavailable';
  const venue = [event.venue, event.city].filter(Boolean).join(' · ') || 'Venue unavailable';
  const capacity = Number.isFinite(event.capacity) ? ` of ${event.capacity}` : '';
  const places = capacity
    ? `${counts.places}${capacity} places reserved`
    : `${counts.places} ${counts.places === 1 ? 'place' : 'places'} reserved`;

  return (
    <Panel elevated style={styles.card}>
      <OrganizerEventImage source={event.coverImage ? event.image : event.defaultImage} style={styles.cover} iconSize={iconSizes.xl} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeading}>
          <View style={styles.titleBlock}>
            <OrganizerEventBadge status={status} />
            <SectionHeading>{event.title}</SectionHeading>
          </View>
          <HeaderAction label={`Actions for ${event.title}`} icon="ellipsis-horizontal" onPress={onOptions} />
        </View>
        <OrganizerEventFact icon="calendar-outline">{date}</OrganizerEventFact>
        <OrganizerEventFact icon="location-outline">{venue}</OrganizerEventFact>
      </View>
      <View style={styles.cardFooter}>
        <View style={styles.registration}>
          <Text style={styles.chipLabel}>{registrationLabel(counts.registrations)}</Text>
          <Text style={styles.caption}>{places}</Text>
        </View>
        <Action label="Manage event" accessibilityLabel={`Manage ${event.title}`} icon="arrow-forward-outline"
          onPress={onManage} />
      </View>
    </Panel>
  );
}

function EventsEmptyState({ hasEvents, hasQuery, filter, storageWarning, onCreate, onClear, onReset }) {
  if (!hasEvents) {
    return storageWarning
      ? <EmptyState icon="alert-circle-outline" title="Saved events unavailable" description="Reopen the app to try loading your saved events again." />
      : <EmptyState icon="calendar-outline" title="No events yet" description="Create a draft to start planning your first event.">
          <Action label="Create event" icon="add-outline" onPress={onCreate} />
        </EmptyState>;
  }
  if (hasQuery) {
    return <EmptyState icon="search-outline" title="No matching events" description="Try a different title or clear your search.">
      <Action label="Clear search" secondary onPress={onClear} />
    </EmptyState>;
  }
  const title = filter === 'Drafts' ? 'No drafts' : `No ${filter.toLowerCase()} events`;
  return <EmptyState icon="filter-outline" title={title} description="Choose another filter to see your events.">
    <Action label="Reset filters" secondary onPress={onReset} />
  </EmptyState>;
}

function EventActions({ event, now, onClose, onManage, onEdit, onPublish, onAction }) {
  const draft = event.status === 'Draft';
  const published = publicEventStatuses.includes(event.status);
  const current = published && organizerEventStatus(event, now) !== 'Completed';
  const options = [];
  if (draft || current) options.push({ label: 'Edit event', icon: 'create-outline', onPress: () => onEdit(event) });
  if (published) options.push({ label: 'Share event', icon: 'share-social-outline', keepOpen: true, onPress: () => shareEventLink(event) });
  if (!draft) options.push({ label: 'View registrations', icon: 'people-outline', onPress: () => onManage(event, 'attendees') });
  if (draft) options.push({ label: 'Publish draft', icon: 'cloud-upload-outline', onPress: async () => {
    await onPublish(event);
    return 'Event published.';
  } });
  if (current) options.push({ label: 'Cancel event', icon: 'close-circle-outline', destructive: true, onPress: () => onManage(event, 'cancel') });

  return <OrganizerOptionsSheet title="Event actions" detail={event.title} onClose={onClose}
    options={options.map((option) => ({ ...option, onPress: () => onAction(option.onPress, option.keepOpen) }))} />;
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  titleBlock: { flex: 1, minWidth: 0, gap: spacing.xxs },
  total: { ...typography.section, color: colors.text },
  filterRail: { flexGrow: 0, minWidth: 0 },
  chips: { alignItems: 'center', gap: spacing.xs },
  chip: { minHeight: touchTargets.minimum, justifyContent: 'center', paddingHorizontal: spacing.md,
    borderColor: colors.border, borderWidth: 1, borderRadius: radii.pill, backgroundColor: colors.surface },
  activeChip: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipLabel: { ...typography.label, color: colors.text },
  activeLabel: { color: colors.surface },
  resultCount: { ...typography.label, color: colors.textSecondary },
  sortButton: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, minHeight: touchTargets.minimum,
    paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs, borderRadius: radii.md },
  sortLabel: { ...typography.label, flexShrink: 1, color: colors.primary },
  card: { padding: 0, gap: 0, overflow: 'hidden' },
  cover: { width: '100%', height: 140, backgroundColor: colors.lavender },
  cardContent: { padding: spacing.md, gap: spacing.xs },
  cardHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xxs },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderColor: colors.border },
  registration: { flexBasis: '35%', flexGrow: 1, minWidth: 0, gap: spacing.xxs },
  caption: { ...typography.caption, color: colors.textSecondary },
  pressed: { backgroundColor: colors.lavender },
});

import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, StyleSheet, Text, View } from 'react-native';
import { Action, Choices, Copy, Field, HeaderAction, Page, Panel, SectionHeading } from '../components/FlowUI';
import DateField from '../components/DateField';
import PhotoPicker from '../components/PhotoPicker';
import { OrganizerEventBadge, OrganizerEventFact, OrganizerEventImage } from '../components/OrganizerEventMedia';
import OrganizerOptionsSheet from '../components/OrganizerOptionsSheet';
import useOrganizerBack from '../hooks/useOrganizerBack';
import { formatCalendarDate } from '../data/agenda';
import { categories, eventCoverSource, formatPrice } from '../data/events';
import { eventFromDraft } from '../data/eventOperations';
import { publicEventStatuses } from '../data/organizerEvents';
import { sriLankaDate } from '../data/reservations';
import { colors, radii, spacing, typography } from '../theme';
import VenuePickerScreen from './VenuePickerScreen';

const steps = ['Basic details', 'Schedule', 'Tickets', 'Review'];

function initialDraft(event) {
  return {
    title: event.title ?? '', city: event.city ?? '', venue: event.venue ?? '',
    category: event.category ?? 'Music', setting: event.setting ?? 'Indoor', description: event.description ?? '',
    startDate: event.startDate ?? sriLankaDate(), startTime: event.startTime ?? '10:00', endTime: event.endTime ?? '12:00',
    capacity: String(event.capacity ?? ''), price: String(event.price ?? 0),
    latitude: String(event.latitude ?? ''), longitude: String(event.longitude ?? ''),
    reason: '', eligibility: event.eligibility ?? '', accessibility: event.accessibility ?? '', coverImage: event.coverImage ?? null,
  };
}

export default function OrganizerEventEditor({ event, bookings, knownVenues, onSave, onBack }) {
  const [initial] = useState(() => initialDraft(event));
  const [draft, setDraft] = useState(initial);
  const [admission, setAdmission] = useState(Number(initial.price) > 0 ? 'Paid' : 'Free');
  const [step, setStep] = useState(0);
  const [pickingVenue, setPickingVenue] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [timePicker, setTimePicker] = useState(null);
  const [preparingCover, setPreparingCover] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [saving, setSaving] = useState(null);
  const savingRef = useRef(false);
  const [error, setError] = useState('');
  const dirty = Object.keys(initial).some((field) => initial[field] !== draft[field]);
  const canPublish = !event.id || event.status === 'Draft';
  const cover = eventCoverSource(draft.coverImage, event.defaultImage, draft.category);
  const point = draft.latitude !== '' && draft.longitude !== ''
    ? { latitude: Number(draft.latitude), longitude: Number(draft.longitude) } : null;

  useEffect(() => {
    if (Platform.OS !== 'web' || !dirty) return;
    const protect = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [dirty]);

  function change(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
    setError('');
  }

  function previous() {
    if (savingRef.current || preparingCover) return;
    Keyboard.dismiss();
    if (pickingVenue) setPickingVenue(false);
    else if (dateOpen) setDateOpen(false);
    else if (step > 0) { setError(''); setStep((current) => current - 1); }
    else if (dirty) setDiscard(true);
    else onBack();
  }
  useOrganizerBack(previous);

  function next() {
    try {
      if (!step && (!draft.title.trim() || !draft.description.trim())) throw new Error('Enter an event title and description.');
      if (step === 1) eventFromDraft({ ...draft, capacity: '', price: '0' }, event.id, bookings);
      if (step === 2) {
        if (admission === 'Paid' && !(Number(draft.price) > 0)) throw new Error('Enter a price above zero for paid admission.');
        eventFromDraft(draft, event.id, bookings);
      }
      Keyboard.dismiss();
      setError('');
      setDateOpen(false);
      setStep((current) => current + 1);
    } catch (failure) {
      setError(failure.message);
    }
  }

  async function save(mode) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(mode);
    setError('');
    try {
      await onSave(draft, mode === 'publish');
    } catch (failure) {
      setError(failure.message || 'The event could not be saved. Try again.');
    } finally {
      savingRef.current = false;
      setSaving(null);
    }
  }

  if (pickingVenue) return <VenuePickerScreen venue={draft.venue} city={draft.city} point={point} knownVenues={knownVenues}
    onBack={previous} onSelect={(location) => {
      setDraft((current) => ({ ...current, ...location }));
      setError('');
      setPickingVenue(false);
    }} />;

  const footer = (
    <>
      {!!error && <Copy alert>{error}</Copy>}
      {step < 3 ? <Action label={step === 2 ? 'Preview listing' : 'Continue'} icon="arrow-forward-outline"
        disabled={preparingCover} onPress={next} /> : <>
        {canPublish && <Action label="Publish event" icon="cloud-upload-outline"
          loading={saving === 'publish'} disabled={!!saving} onPress={() => save('publish')} />}
        <Action label={canPublish ? 'Save draft' : 'Save event changes'} secondary={canPublish}
          loading={saving === 'save'} disabled={!!saving} onPress={() => save('save')} />
      </>}
    </>
  );

  return (
    <Page key={step} title={step === 3 ? 'Preview listing' : event.id ? 'Edit event' : 'New event draft'} onBack={previous} footer={footer}>
      <View style={styles.progress}>
        <Text style={styles.stepCount}>Step {step + 1} of {steps.length}</Text>
        <SectionHeading>{steps[step]}</SectionHeading>
        <View style={styles.track} accessibilityRole="progressbar" accessibilityLabel="Event form progress"
          accessibilityValue={{ min: 0, max: steps.length, now: step + 1 }}>
          {steps.map((label, index) => <View key={label} style={[styles.segment, index <= step && styles.active]} />)}
        </View>
      </View>
      {step === 0 && <>
        <Field label="Event title" placeholder="e.g. Community design workshop" value={draft.title} maxLength={90} onChangeText={(value) => change('title', value)} />
        <Choices label="Category" options={categories.slice(1).map(({ label }) => label)} selected={[draft.category]} onSelect={(value) => change('category', value)} />
        <Choices label="Venue setting" options={['Indoor', 'Outdoor']} selected={[draft.setting]} onSelect={(value) => change('setting', value)} />
        <Field label="Description" placeholder="Tell attendees what to expect" multiline maxLength={700}
          value={draft.description} onChangeText={(value) => change('description', value)} />
        <PhotoPicker image={cover} hasCustomImage={!!draft.coverImage} onBusyChange={setPreparingCover}
          onChange={(value) => change('coverImage', value)} />
      </>}
      {step === 1 && <>
        <DateField label="Event date" value={draft.startDate} expanded={dateOpen} onToggle={() => setDateOpen(!dateOpen)}
          onChange={(value) => { change('startDate', value); setDateOpen(false); }} />
        <View style={styles.timeRow}>
          {[['Start time', 'startTime', '10:00'], ['End time', 'endTime', '12:00']].map(([label, field, placeholder]) => (
            <View key={field} style={styles.time}>
              <Field label={`${label} (HH:MM)`} placeholder={placeholder} maxLength={5} value={draft[field]}
                onChangeText={(value) => change(field, value)} trailingAction={<HeaderAction
                  label={`Pick ${label.toLowerCase()}`} icon="time-outline" onPress={() => {
                    Keyboard.dismiss();
                    setTimePicker({ field, label });
                  }} />} />
            </View>
          ))}
        </View>
        <Copy>Use 24-hour Sri Lanka time. Both times must be on the event date.</Copy>
        <Panel title="Venue location">
          <Copy>{[draft.venue, draft.city].filter(Boolean).join(', ') || 'Search for a venue or drop a pin on the map.'}</Copy>
          <Action label={point ? 'Change venue on map' : 'Choose venue on map'} secondary icon="location-outline"
            onPress={() => { Keyboard.dismiss(); setDateOpen(false); setPickingVenue(true); }} />
        </Panel>
        {publicEventStatuses.includes(event.status) && <Field label="Reason for schedule or venue changes"
          value={draft.reason} maxLength={240} onChangeText={(value) => change('reason', value)} />}
      </>}
      {step === 2 && <>
        <Choices label="Admission" options={['Free', 'Paid']} selected={[admission]} onSelect={(value) => {
          if (value === admission) return;
          setAdmission(value);
          change('price', value === 'Free' ? '0' : '');
        }} />
        {admission === 'Paid'
          ? <Field label="Price (LKR)" value={draft.price} keyboardType="number-pad"
              hint="Attendees can preview paid tickets. Checkout is unavailable."
              onChangeText={(value) => change('price', value)} />
          : <Copy>Attendees can reserve free tickets when registration is open.</Copy>}
        <Field label="Capacity (blank for unlimited)" value={draft.capacity} keyboardType="number-pad" onChangeText={(value) => change('capacity', value)} />
        <Field label="Eligibility (optional)" value={draft.eligibility} maxLength={200} onChangeText={(value) => change('eligibility', value)} />
        <Field label="Accessibility (optional)" value={draft.accessibility} maxLength={200} onChangeText={(value) => change('accessibility', value)} />
      </>}
      {step === 3 && <>
        <Panel elevated>
          <OrganizerEventImage source={cover} style={styles.cover} />
          <OrganizerEventBadge status={event.status || 'Draft'} />
          <SectionHeading>{draft.title.trim()}</SectionHeading>
          <Copy>{draft.category} · {draft.setting}</Copy>
          <OrganizerEventFact icon="calendar-outline">
            {formatCalendarDate(draft.startDate, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            {' · '}{draft.startTime}–{draft.endTime} · Sri Lanka time
          </OrganizerEventFact>
          <OrganizerEventFact icon="location-outline">{draft.venue}, {draft.city}</OrganizerEventFact>
          <OrganizerEventFact icon="ticket-outline">{formatPrice(Number(draft.price))} · {draft.capacity || 'Unlimited'} places</OrganizerEventFact>
          <Copy>{draft.description}</Copy>
          {!!draft.eligibility && <Copy>Eligibility · {draft.eligibility}</Copy>}
          {!!draft.accessibility && <Copy>Accessibility · {draft.accessibility}</Copy>}
        </Panel>
        <Action label="Back to editing" secondary disabled={!!saving} onPress={previous} />
      </>}
      {discard && <OrganizerOptionsSheet title="Discard changes?" detail="Changes you entered in this form will be lost."
        onClose={() => setDiscard(false)} options={[
          { label: 'Keep editing', icon: 'create-outline', onPress: () => setDiscard(false) },
          { label: 'Discard changes', icon: 'trash-outline', destructive: true, onPress: onBack },
        ]} />}
      {timePicker && <TimePicker label={timePicker.label} value={draft[timePicker.field]} onClose={() => setTimePicker(null)}
        onSelect={(value) => { change(timePicker.field, value); setTimePicker(null); }} />}
    </Page>
  );
}

function TimePicker({ label, value, onClose, onSelect }) {
  const [initialHour = '', initialMinute = ''] = value.split(':');
  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(initialMinute);
  const valid = /^\d{1,2}$/.test(hour) && Number(hour) <= 23 && /^\d{1,2}$/.test(minute) && Number(minute) <= 59;
  return (
    <OrganizerOptionsSheet title={label} detail="Choose a time using the 24-hour clock." onClose={onClose}>
      <View style={styles.pickerContent}>
        <View style={styles.timeRow}>
          <View style={styles.time}><Field label="Hour (0–23)" value={hour} onChangeText={setHour}
            keyboardType="number-pad" maxLength={2} /></View>
          <View style={styles.time}><Field label="Minute (0–59)" value={minute} onChangeText={setMinute}
            keyboardType="number-pad" maxLength={2} /></View>
        </View>
        <Choices label="Quick minutes" options={['00', '15', '30', '45']} selected={[minute]} onSelect={setMinute} />
        <Action label="Use this time" icon="checkmark-outline" disabled={!valid}
          onPress={() => onSelect(`${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`)} />
      </View>
    </OrganizerOptionsSheet>
  );
}

const styles = StyleSheet.create({
  progress: { gap: spacing.xxs },
  stepCount: { ...typography.caption, color: colors.purpleDark },
  track: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xxs },
  segment: { flex: 1, height: 4, borderRadius: radii.pill, backgroundColor: colors.border },
  active: { backgroundColor: colors.primary },
  timeRow: { flexDirection: 'row', gap: spacing.sm },
  time: { flex: 1, minWidth: 0 },
  pickerContent: { gap: spacing.sm, paddingVertical: spacing.xs },
  cover: { height: 144, width: '100%', borderRadius: radii.md, overflow: 'hidden', backgroundColor: colors.lavender },
});

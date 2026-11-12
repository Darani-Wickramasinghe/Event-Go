import { useState } from 'react';
import { Action, Choices, Copy, Field, Page, Panel } from '../components/FlowUI';
import { formatPrice } from '../data/events';
import { bookingLimit, eventTime } from '../data/reservations';

export default function ReservationScreen({ event, events, bookings, remaining, profile, onBack, onConfirm }) {
  const paid = event.price > 0;
  const [names, setNames] = useState([profile.name]);
  const [quantity, setQuantity] = useState('1');
  const [type, setType] = useState('General');
  const [step, setStep] = useState('details');
  const [error, setError] = useState('');
  const types = { General: event.price, Premium: event.price * 1.5 };
  const available = paid ? bookingLimit : Math.min(remaining ?? bookingLimit, bookingLimit);
  const conflict = bookings.some((booking) => {
    if (booking.status !== 'Confirmed') return false;
    const booked = events.find((item) => item.id === booking.eventId);
    return booked && booked.id !== event.id
      && eventTime(event) < eventTime(booked, booked.endTime)
      && eventTime(booked) < eventTime(event, event.endTime);
  });

  function review() {
    if (!paid && Array.from({ length: Number(quantity) }, (_, index) => names[index]).some((name) => !name?.trim())) {
      setError('Enter a name for each attendee.');
      return;
    }
    setError('');
    setStep('review');
  }

  function confirm() {
    try {
      onConfirm(names.slice(0, Number(quantity)));
    } catch (failure) {
      setError(failure.message);
    }
  }

  return (
    <Page title={paid ? 'Ticket preview' : step === 'review' ? 'Review reservation' : 'Reserve free places'} onBack={step === 'details' ? onBack : () => { setStep('details'); setError(''); }}>
      <Panel title={event.title}>
        <Copy>{event.date} · Sri Lanka time</Copy>
        <Copy>{event.venue}, {event.city}</Copy>
        {!paid && <Copy>{remaining === null ? 'Free admission' : `${remaining} free places available`}</Copy>}
      </Panel>
      {step === 'details' ? (
        <>
          {paid && <Choices label="Ticket type" options={Object.keys(types)} selected={[type]} onSelect={setType} />}
          <Choices label="Number of places" options={Array.from({ length: available }, (_, index) => String(index + 1))} selected={[quantity]} onSelect={setQuantity} />
          {!paid && Array.from({ length: Number(quantity) }, (_, index) => (
            <Field
              key={index}
              label={`Attendee ${index + 1} name`}
              value={names[index] ?? ''}
              onChangeText={(value) => setNames((current) => Object.assign([...current], { [index]: value }))}
              autoCapitalize="words"
              maxLength={70}
            />
          ))}
          <Copy>Total · {formatPrice(types[type] * Number(quantity))}</Copy>
          <Action label={paid ? 'Review ticket preview' : 'Review reservation'} onPress={review} />
        </>
      ) : (
        <>
          {paid ? (
            <Panel title="Online payment coming soon">
              <Copy>{quantity} × {type} · {formatPrice(types[type] * Number(quantity))}</Copy>
            </Panel>
          ) : (
            <>
              <Panel title={`${quantity} ${quantity === '1' ? 'place' : 'places'} · Free`}>
                {names.slice(0, Number(quantity)).map((name, index) => <Copy key={index}>{name.trim()}</Copy>)}
                {conflict && <Copy alert>This event overlaps another confirmed reservation.</Copy>}
              </Panel>
              <Action label="Confirm reservation" icon="checkmark" onPress={confirm} />
            </>
          )}
          <Action label={paid ? 'Return to event' : 'Edit reservation'} secondary onPress={paid ? onBack : () => { setStep('details'); setError(''); }} />
        </>
      )}
      {!!error && <Copy alert>{error}</Copy>}
    </Page>
  );
}

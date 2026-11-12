import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { sriLankaDate } from './reservations';

const storageKey = 'eventora-demo-v1';

const initialState = {
  signedIn: false,
  demoDate: sriLankaDate(),
  profile: { name: '', interests: [], city: 'Kelaniya', reminders: false },
  savedIds: [],
  bookings: [],
  eventEdits: {},
  createdEvents: [],
  notifications: [],
  reports: [],
  organizerAccess: 'Not requested',
  audit: [],
};

export function useDemoStore() {
  const current = useRef(initialState);
  const pendingWrite = useRef(Promise.resolve());
  const [data, setData] = useState(initialState);
  const [ready, setReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState('');

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey).then((saved) => {
      if (!active || !saved) return;
      current.current = { ...initialState, ...JSON.parse(saved) };
      setData(current.current);
    }).catch(() => {
      if (active) setStorageWarning('Saved demo data could not be loaded.');
    }).finally(() => {
      if (active) setReady(true);
    });
    return () => { active = false; };
  }, []);

  function update(change) {
    const next = change(current.current);
    current.current = next;
    setData(next);
    pendingWrite.current = pendingWrite.current
      .then(() => AsyncStorage.setItem(storageKey, JSON.stringify(next)))
      .then(() => setStorageWarning(''))
      .catch(() => setStorageWarning('Changes could not be saved on this device.'));
    return next;
  }

  return { data, ready, update, storageWarning };
}

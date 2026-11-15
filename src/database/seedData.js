import { categories, events as rawEvents } from '../data/events';

export const initialSeedEvents = rawEvents;
export const initialCategories = categories;

export const defaultDemoProfile = {
  id: 'demo-user',
  name: 'Demo Attendee',
  email: 'attendee@eventora.lk',
  role: 'Attendee',
  organization: 'Kelaniya Computing Society',
  city: 'Kelaniya',
  interests: ['IT', 'Music'],
  reminders: false,
  reminderHours: 24,
};

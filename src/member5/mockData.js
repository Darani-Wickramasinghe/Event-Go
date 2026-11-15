import { BOOKING_STATUS, EVENT_STATUS, TICKET_STATUS } from './contract';

// Fixed "today" so demos and tests behave the same every time.
export const MOCK_NOW = new Date('2026-11-20T09:00:00Z');

export const mockEvents = [
  { id: 'e1', title: 'Tech Connect', venue: 'Kelaniya Campus Hall', start: '2026-11-21T04:00:00Z', end: '2026-11-21T07:00:00Z', status: EVENT_STATUS.PUBLISHED },
  { id: 'e2', title: 'Live Music Evening', venue: 'Colombo Arena', start: '2026-11-25T13:00:00Z', end: '2026-11-25T16:00:00Z', status: EVENT_STATUS.PUBLISHED },
  { id: 'e3', title: 'Startup Meetup', venue: 'Kandy Hub', start: '2026-11-10T04:00:00Z', end: '2026-11-10T07:00:00Z', status: EVENT_STATUS.PUBLISHED },
  { id: 'e4', title: 'Art Walk', venue: 'Galle Fort', start: '2026-11-21T05:00:00Z', end: '2026-11-21T08:00:00Z', status: EVENT_STATUS.PUBLISHED },
];

export const mockBookings = [
  { id: 'b1', userId: 'u1', eventId: 'e1', status: BOOKING_STATUS.CONFIRMED, places: 2 },
  { id: 'b2', userId: 'u1', eventId: 'e2', status: BOOKING_STATUS.CONFIRMED, places: 1 },
  { id: 'b3', userId: 'u1', eventId: 'e3', status: BOOKING_STATUS.CONFIRMED, places: 1 },
  { id: 'b4', userId: 'u2', eventId: 'e1', status: BOOKING_STATUS.CONFIRMED, places: 1 },
];

export const mockTickets = [
  { id: 't1', token: 'EVT-TECH-001', bookingId: 'b1', eventId: 'e1', attendeeName: 'Nimal', status: TICKET_STATUS.VALID, checkedInAt: null },
  { id: 't2', token: 'EVT-TECH-002', bookingId: 'b1', eventId: 'e1', attendeeName: 'Kamal', status: TICKET_STATUS.CHECKED_IN, checkedInAt: '2026-11-20T08:30:00.000Z' },
  { id: 't3', token: 'EVT-TECH-003', bookingId: 'b4', eventId: 'e1', attendeeName: 'Sara', status: TICKET_STATUS.CANCELLED, checkedInAt: null },
  { id: 't4', token: 'EVT-MUSIC-001', bookingId: 'b2', eventId: 'e2', attendeeName: 'Nimal', status: TICKET_STATUS.VALID, checkedInAt: null },
  { id: 't5', token: 'EVT-PAST-001', bookingId: 'b3', eventId: 'e3', attendeeName: 'Nimal', status: TICKET_STATUS.VALID, checkedInAt: null },
];

export const mockNotices = [
  { id: 'welcome-1', userId: 'u1', bookingId: 'b1', eventId: 'e1', type: 'reminder', message: 'Welcome to Eventora notifications.', read: false, createdAt: '2026-11-19T09:00:00.000Z' },
];

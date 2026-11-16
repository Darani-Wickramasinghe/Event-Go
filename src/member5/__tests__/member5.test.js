import { attendanceLabel, attendanceSummary, checkInTicket, validateTicket } from '../attendance.js';
import { CHECK_RESULT, EVENT_STATUS } from '../contract.js';
import { MOCK_NOW, mockBookings, mockEvents, mockTickets } from '../mockData.js';
import { buildEventChangeNotices, buildReminders, findConflicts, markRead, unreadCount } from '../notifications.js';

const tech = mockEvents.find((item) => item.id === 'e1');

describe('Attendance (AT-11, AT-12, AT-13)', () => {
  test('valid ticket is admitted and recorded once', () => {
    const first = checkInTicket(mockTickets, 'EVT-TECH-001', 'e1', MOCK_NOW);
    expect(first.outcome.result).toBe(CHECK_RESULT.ADMITTED);
    const second = checkInTicket(first.tickets, 'EVT-TECH-001', 'e1', MOCK_NOW);
    expect(second.outcome.result).toBe(CHECK_RESULT.ALREADY_USED);
    expect(second.outcome.usedAt).toBe(MOCK_NOW.toISOString());
    expect(attendanceSummary(second.tickets, 'e1').checkedIn).toBe(2);
  });

  test('already used ticket is rejected with the time', () => {
    const out = validateTicket(mockTickets, 'EVT-TECH-002', 'e1');
    expect(out.result).toBe(CHECK_RESULT.ALREADY_USED);
    expect(out.usedAt).toBe('2026-11-20T08:30:00.000Z');
  });

  test('cancelled, wrong-event and unknown tickets are rejected and change nothing', () => {
    expect(validateTicket(mockTickets, 'EVT-TECH-003', 'e1').result).toBe(CHECK_RESULT.CANCELLED);
    expect(validateTicket(mockTickets, 'EVT-MUSIC-001', 'e1').result).toBe(CHECK_RESULT.WRONG_EVENT);
    expect(validateTicket(mockTickets, 'NOPE', 'e1').result).toBe(CHECK_RESULT.INVALID);
    const result = checkInTicket(mockTickets, 'EVT-TECH-003', 'e1', MOCK_NOW);
    expect(result.tickets).toBe(mockTickets);
  });

  test('"Attended" only after a scan; otherwise "Past registration"', () => {
    const past = mockEvents.find((item) => item.id === 'e3');
    const unscanned = mockTickets.find((item) => item.id === 't5');
    const scanned = mockTickets.find((item) => item.id === 't2');
    expect(attendanceLabel(unscanned, past, MOCK_NOW)).toBe('Past registration');
    expect(attendanceLabel(scanned, tech, MOCK_NOW)).toBe('Attended');
  });

  test('summary counts people, not bookings', () => {
    expect(attendanceSummary(mockTickets, 'e1')).toEqual({ reserved: 2, cancelled: 1, checkedIn: 1, notArrived: 1 });
  });
});

describe('Notifications (AT-15, AT-16, AT-22)', () => {
  test('cancelling an event notifies each confirmed booking once', () => {
    const after = { ...tech, status: EVENT_STATUS.CANCELLED };
    const first = buildEventChangeNotices({ before: tech, after, bookings: mockBookings, now: MOCK_NOW });
    expect(first).toHaveLength(2);
    const again = buildEventChangeNotices({ before: tech, after, bookings: mockBookings, existing: first, now: MOCK_NOW });
    expect(again).toHaveLength(0);
  });

  test('rescheduling and venue change give the right type; no change gives nothing', () => {
    const moved = { ...tech, start: '2026-11-22T04:00:00Z', end: '2026-11-22T07:00:00Z' };
    expect(buildEventChangeNotices({ before: tech, after: moved, bookings: mockBookings })[0].type).toBe('eventRescheduled');
    expect(buildEventChangeNotices({ before: tech, after: { ...tech, venue: 'Main Hall' }, bookings: mockBookings })[0].type).toBe('venueChanged');
    expect(buildEventChangeNotices({ before: tech, after: tech, bookings: mockBookings })).toEqual([]);
  });

  test('reminder appears only inside the chosen window, and only once', () => {
    const args = { events: mockEvents, bookings: mockBookings, now: MOCK_NOW };
    expect(buildReminders({ ...args, prefs: { reminderHours: 24 } }).map((item) => item.bookingId).sort()).toEqual(['b1', 'b4']);
    expect(buildReminders({ ...args, prefs: { reminderHours: 1 } })).toEqual([]);
    expect(buildReminders({ ...args, prefs: { reminderHours: null } })).toEqual([]);
    const sent = buildReminders({ ...args, prefs: { reminderHours: 24 } });
    expect(buildReminders({ ...args, prefs: { reminderHours: 24 }, existing: sent })).toEqual([]);
  });

  test('read / unread', () => {
    const notices = [{ id: 'a', read: false }, { id: 'b', read: false }];
    expect(unreadCount(markRead(notices, ['a']))).toBe(1);
  });
});

describe('Clash warning', () => {
  test('overlapping events are flagged, others are not', () => {
    const art = mockEvents.find((item) => item.id === 'e4');
    const music = mockEvents.find((item) => item.id === 'e2');
    expect(findConflicts(art, [tech, music]).map((item) => item.id)).toEqual(['e1']);
  });
});

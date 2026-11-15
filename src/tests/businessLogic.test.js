/**
 * Member 3: Authentication and Core Business Logic Unit Tests
 */

import { registerUser, loginUser, logoutUser, isAttendee, isOrganizer, canManageEvent } from '../services/authService.js';
import { createOrganizerEvent, updateOrganizerEvent, transitionEventStatus } from '../services/eventBusinessService.js';
import { registerForFreeEvent, cancelRegistration, bookingLimit } from '../services/registrationService.js';
import { validateAndCheckInTicket, getTicketStatusInfo } from '../services/ticketService.js';
import { calculatePaidPreview, attemptPaidCheckout } from '../services/paidPreviewService.js';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    testsPassed++;
  } else {
    testsFailed++;
    console.error(`  ❌ FAILED: ${message}`);
  }
}

function assertThrows(fn, expectedMessageSubstring, message) {
  try {
    fn();
    testsFailed++;
    console.error(`  ❌ FAILED (Expected exception): ${message}`);
  } catch (err) {
    if (expectedMessageSubstring && !err.message.includes(expectedMessageSubstring)) {
      testsFailed++;
      console.error(`  ❌ FAILED (Wrong error message: "${err.message}" vs expected substring "${expectedMessageSubstring}"): ${message}`);
    } else {
      testsPassed++;
    }
  }
}

export function runAllTests() {
  console.log('==================================================');
  console.log('EVENTORA - MEMBER 3 BUSINESS LOGIC TEST SUITE');
  console.log('==================================================\n');

  // ----------------------------------------------------
  // 1. AUTHENTICATION & ROLES TESTS
  // ----------------------------------------------------
  console.log('1. Testing Authentication and Roles...');

  const initialStore = {
    signedIn: false,
    profile: { name: '', email: '', city: '', interests: [] },
  };

  // Test registration validation
  assertThrows(
    () => registerUser({ name: '', email: 'test@example.com', city: 'Colombo' }, initialStore),
    'Full name is required.',
    'Should reject registration without name'
  );

  assertThrows(
    () => registerUser({ name: 'John Doe', email: 'invalid-email', city: 'Colombo' }, initialStore),
    'valid email address',
    'Should reject invalid email'
  );

  assertThrows(
    () => registerUser({ name: 'John Doe', email: 'john@example.com', city: '', role: 'organizer', organization: '' }, initialStore),
    'Home city is required',
    'Should reject missing city'
  );

  assertThrows(
    () => registerUser({ name: 'Jane Organizer', email: 'org@example.com', city: 'Colombo', role: 'organizer', organization: '' }, initialStore),
    'Organization name is required',
    'Should reject organizer without organization'
  );

  // Test successful attendee registration
  const attendeeReg = registerUser(
    { name: 'Kasun Perera', email: 'kasun@example.com', city: 'Kelaniya', role: 'attendee' },
    initialStore
  );
  assert(attendeeReg.signedIn === true, 'Attendee registration sets signedIn to true');
  assert(attendeeReg.profile.name === 'Kasun Perera', 'Attendee profile stores name correctly');
  assert(attendeeReg.profile.email === 'kasun@example.com', 'Attendee profile stores email in lower case');

  // Test successful organizer registration
  const organizerReg = registerUser(
    { name: 'Ama Silva', email: 'ama@events.lk', city: 'Colombo', role: 'organizer', organization: 'Lanka Events' },
    initialStore
  );
  assert(organizerReg.profile.organization === 'Lanka Events', 'Organizer profile stores organization');

  // Test duplicate registration on signed in account
  assertThrows(
    () => registerUser({ name: 'Ama Silva', email: 'ama@events.lk', city: 'Colombo' }, organizerReg),
    'already signed in',
    'Should reject duplicate registration for logged in email'
  );

  // Test login
  const loginResult = loginUser({ email: 'kasun@example.com' }, attendeeReg);
  assert(loginResult.signedIn === true, 'Login sets signedIn state to true');

  assertThrows(
    () => loginUser({ email: 'wrong@example.com' }, attendeeReg),
    'does not match',
    'Should reject login with non-matching email'
  );

  // Test logout
  const logoutResult = logoutUser(loginResult);
  assert(logoutResult.signedIn === false, 'Logout sets signedIn state to false');

  // Test role checks
  assert(isAttendee('attendee') === true, 'Role check correctly identifies attendee');
  assert(isOrganizer('organizer') === true, 'Role check correctly identifies organizer');
  assert(canManageEvent(organizerReg.profile, 'organizer', { organizer: 'Lanka Events' }) === true, 'Organizer can manage own event');
  assert(canManageEvent(organizerReg.profile, 'organizer', { organizer: 'Other Org' }) === false, 'Organizer cannot manage other org event');
  assert(canManageEvent(attendeeReg.profile, 'attendee', { organizer: 'Lanka Events' }) === false, 'Attendee cannot manage event');

  console.log('   ✓ Auth & Role tests completed.\n');

  // ----------------------------------------------------
  // 2. EVENT MANAGEMENT & PERMISSION TESTS
  // ----------------------------------------------------
  console.log('2. Testing Event Management and State Transitions...');

  const validDraft = {
    title: 'Kelaniya Tech Talk',
    category: 'IT',
    city: 'Kelaniya',
    venue: 'Hall A',
    description: 'An exciting tech talk for students and developers.',
    startDate: '2026-11-25',
    startTime: '10:00',
    endTime: '12:00',
    capacity: '50',
    price: '0',
    setting: 'Indoor',
    latitude: '',
    longitude: '',
  };

  // Test attendee cannot create event
  assertThrows(
    () => createOrganizerEvent(attendeeReg.profile, 'attendee', validDraft),
    'Only organizers or administrators',
    'Attendee cannot create event'
  );

  // Test organizer creating event
  const createdEvent = createOrganizerEvent(organizerReg.profile, 'organizer', validDraft);
  assert(createdEvent.title === 'Kelaniya Tech Talk', 'Organizer event created with valid title');
  assert(createdEvent.organizer === 'Lanka Events', 'Event tagged with organizer name');
  assert(createdEvent.status === 'Draft', 'Default event status is Draft');

  // Test published event creation
  const publishedDraft = { ...validDraft, publish: true };
  const publishedEvent = createOrganizerEvent(organizerReg.profile, 'organizer', publishedDraft);
  assert(publishedEvent.status === 'Published', 'Publish flag sets event status to Published');

  // Test organizer editing another organizer's event rejected
  const mockOtherOrgEvent = { id: 'evt-1', title: 'Other Event', organizer: 'Diff Org', status: 'Published' };
  assertThrows(
    () => updateOrganizerEvent(organizerReg.profile, 'organizer', mockOtherOrgEvent, validDraft),
    'permission to manage another organization',
    'Organizer cannot edit another organization event'
  );

  // Test invalid status transitions
  const storeWithEvent = {
    ...organizerReg,
    createdEvents: [publishedEvent],
    eventEdits: {},
    bookings: [],
    audit: [],
  };

  assertThrows(
    () => transitionEventStatus(organizerReg.profile, 'organizer', storeWithEvent, createdEvent, 'Archived'),
    'Invalid status transition',
    'Cannot transition Draft directly to Archived'
  );

  console.log('   ✓ Event Management tests completed.\n');

  // ----------------------------------------------------
  // 3. FREE EVENT REGISTRATION & CAPACITY TESTS
  // ----------------------------------------------------
  console.log('3. Testing Free-Event Registration, Capacity, and Cancellation...');

  const sampleEvent = {
    id: 'sample-event-1',
    title: 'Free Workshop',
    startDate: '2026-11-25',
    startTime: '14:00',
    endTime: '16:00',
    capacity: 5,
    price: 0,
    status: 'Published',
  };

  const attendeeUser = { userProfile: attendeeReg.profile, signedIn: true };

  // Test successful free registration
  const reg1 = registerForFreeEvent(
    attendeeUser,
    sampleEvent,
    ['Kasun Perera', 'Nimali Fernando'],
    'req-1',
    [],
    ['code-1', 'code-2'],
    Date.parse('2026-11-20T10:00:00+05:30')
  );

  assert(reg1.booking.status === 'Confirmed', 'Booking status is Confirmed');
  assert(reg1.booking.tickets.length === 2, 'Booking creates 2 admission place tickets');
  assert(reg1.isDuplicateRequest === false, 'First request is not marked duplicate');

  // Test idempotency (repeated request with same requestId)
  const reg1Retry = registerForFreeEvent(
    attendeeUser,
    sampleEvent,
    ['Kasun Perera', 'Nimali Fernando'],
    'req-1',
    [reg1.booking],
    ['code-1', 'code-2'],
    Date.parse('2026-11-20T10:00:00+05:30')
  );

  assert(reg1Retry.isDuplicateRequest === true, 'Repeated request with same ID returns existing booking');
  assert(reg1Retry.booking.id === 'req-1', 'Retried booking ID matches existing');

  // Test duplicate active booking by same user rejected
  assertThrows(
    () => registerForFreeEvent(
      attendeeUser,
      sampleEvent,
      ['Kasun Perera'],
      'req-2',
      [reg1.booking],
      ['code-3'],
      Date.parse('2026-11-20T10:00:00+05:30')
    ),
    'already have a reservation',
    'Cannot make second active reservation for same event'
  );

  // Test exceeding booking limit (>4)
  const anotherUser = { userProfile: { name: 'Sunil', email: 'sunil@test.com' }, signedIn: true };
  assertThrows(
    () => registerForFreeEvent(
      anotherUser,
      sampleEvent,
      ['Person 1', 'Person 2', 'Person 3', 'Person 4', 'Person 5'],
      'req-3',
      [],
      ['c1', 'c2', 'c3', 'c4', 'c5'],
      Date.parse('2026-11-20T10:00:00+05:30')
    ),
    '1–4 places',
    'Should reject quantity > 4'
  );

  // Test capacity limit check (event with capacity: 3, attempting 4 places)
  const limitedEvent = { ...sampleEvent, id: 'limited-evt', capacity: 3 };
  assertThrows(
    () => registerForFreeEvent(
      anotherUser,
      limitedEvent,
      ['Person 1', 'Person 2', 'Person 3', 'Person 4'],
      'req-4',
      [],
      ['c1', 'c2', 'c3', 'c4'],
      Date.parse('2026-11-20T10:00:00+05:30')
    ),
    'Only 3 places remain',
    'Should reject quantity exceeding remaining places'
  );

  // Test cancellation restores capacity
  const cancelResult = cancelRegistration(
    { userProfile: attendeeReg.profile, signedIn: true, role: 'attendee' },
    'req-1',
    sampleEvent,
    [reg1.booking],
    Date.parse('2026-11-20T11:00:00+05:30')
  );

  assert(cancelResult.cancelledBookingId === 'req-1', 'Cancellation identifies correct booking ID');
  assert(cancelResult.restoredPlaces === 2, 'Cancellation restores exactly 2 places');

  // Test repeated cancellation rejected / idempotent
  const cancelledBooking = { ...reg1.booking, status: 'Cancelled' };
  assertThrows(
    () => cancelRegistration(
      { userProfile: attendeeReg.profile, signedIn: true, role: 'attendee' },
      'req-1',
      sampleEvent,
      [cancelledBooking],
      Date.parse('2026-11-20T11:05:00+05:30')
    ),
    'already cancelled',
    'Repeated cancellation does not restore capacity twice'
  );

  console.log('   ✓ Registration & Capacity tests completed.\n');

  // ----------------------------------------------------
  // 4. TICKET VALIDATION & SCANNER TESTS
  // ----------------------------------------------------
  console.log('4. Testing Ticket Scanning and Attendance Rules...');

  const activeBooking = {
    id: 'b-100',
    eventId: sampleEvent.id,
    status: 'Confirmed',
    createdAt: Date.now(),
    tickets: [
      { name: 'Kasun Perera', code: 'TICK-100-A', checkedInAt: null },
      { name: 'Nimali Fernando', code: 'TICK-100-B', checkedInAt: null },
    ],
  };

  const organizerScanner = { signedIn: true, role: 'organizer' };

  // Test valid ticket scan
  const scan1 = validateAndCheckInTicket(
    organizerScanner,
    sampleEvent,
    'TICK-100-A',
    [activeBooking],
    Date.parse('2026-11-25T14:15:00+05:30')
  );

  assert(scan1.success === true, 'Ticket check-in succeeds');
  assert(scan1.attendeeName === 'Kasun Perera', 'Ticket scan identifies attendee name');
  const checkedInTicket = scan1.booking.tickets.find((t) => t.code === 'TICK-100-A');
  assert(checkedInTicket.checkedInAt !== null, 'Ticket record records checked-in timestamp');

  // Test repeat scan returns already used
  const updatedBookings = [scan1.booking];
  assertThrows(
    () => validateAndCheckInTicket(
      organizerScanner,
      sampleEvent,
      'TICK-100-A',
      updatedBookings,
      Date.parse('2026-11-25T14:16:00+05:30')
    ),
    'already been used',
    'Repeat scan returns Already Used error'
  );

  // Test scan ticket for wrong event
  const wrongEvent = { ...sampleEvent, id: 'wrong-event-999' };
  assertThrows(
    () => validateAndCheckInTicket(
      organizerScanner,
      wrongEvent,
      'TICK-100-B',
      updatedBookings,
      Date.parse('2026-11-25T14:15:00+05:30')
    ),
    'another event',
    'Ticket scan for wrong event rejected'
  );

  // Test booking status for past event without scan
  const endedEvent = { ...sampleEvent, startDate: '2026-10-01', startTime: '10:00', endTime: '12:00' };
  const pastUncheckedBooking = {
    id: 'b- past',
    eventId: endedEvent.id,
    status: 'Confirmed',
    tickets: [{ name: 'Test', code: 'P-1', checkedInAt: null }],
  };
  const statusInfo = getTicketStatusInfo(endedEvent, pastUncheckedBooking, Date.parse('2026-11-20T10:00:00+05:30'));
  assert(statusInfo === 'Past registration', 'Ended event without verified scan returns Past registration');

  console.log('   ✓ Ticket & Scanner tests completed.\n');

  // ----------------------------------------------------
  // 5. PAID EVENT PREVIEW BOUNDARY TESTS
  // ----------------------------------------------------
  console.log('5. Testing Paid-Event Preview Boundary...');

  const paidEvent = {
    id: 'paid-concert',
    title: 'Live Concert',
    price: 2500,
    capacity: 100,
    status: 'Published',
  };

  const preview = calculatePaidPreview(paidEvent, 2);
  assert(preview.unitPrice === 2500, 'Paid preview unit price is correct');
  assert(preview.totalAmount === 5000, 'Paid preview total amount calculated correctly (2 * 2500)');
  assert(preview.isPreviewOnly === true, 'Paid preview is marked as preview only');
  assert(preview.canProcessPayment === false, 'Paid preview disallows payment processing');

  assertThrows(
    () => attemptPaidCheckout(paidEvent, 2),
    'Online payment coming soon',
    'Paid checkout attempt throws preview notice exception'
  );

  console.log('   ✓ Paid Preview Boundary tests completed.\n');

  // SUMMARY
  console.log('==================================================');
  console.log(`TEST SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('==================================================');
  if (testsFailed > 0) {
    throw new Error(`${testsFailed} tests failed.`);
  }
}

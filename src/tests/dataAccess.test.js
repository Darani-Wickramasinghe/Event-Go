/**
 * Eventora Data Access & Integrity Unit Tests
 * Member 2: Database and Data Layer
 */

import { resetDatabaseState } from '../config/database.js';
import { createEvent, getEventById, getPublishedEvents } from '../repositories/eventRepository.js';
import {
  calculateRemainingPlaces,
  calculateReservedPlaces,
  cancelRegistration,
  createRegistration,
  getRegistrationById,
} from '../repositories/registrationRepository.js';
import { getSavedEvents, isEventSaved, removeSavedEvent, saveEvent } from '../repositories/savedEventRepository.js';
import { checkInTicket, getTicketsByRegistration } from '../repositories/ticketRepository.js';
import { createUser, getUserByEmail } from '../repositories/userRepository.js';

let testPassedCount = 0;
let testFailedCount = 0;

function assert(condition, message) {
  if (!condition) {
    testFailedCount++;
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    testPassedCount++;
    console.log(`✅ [PASS] ${message}`);
  }
}

async function runTests() {
  console.log('==================================================');
  console.log('Running Member 2 Data Access & Integrity Test Suite');
  console.log('==================================================\n');

  await resetDatabaseState();

  // Test 1: User Model & Repository Integrity
  console.log('--- Test 1: User Repository & Duplicate Email Prevention ---');
  const user1 = createUser({
    name: 'Alice Silva',
    email: 'alice@example.com',
    role: 'Attendee',
  });
  assert(user1.id && user1.name === 'Alice Silva', 'User created successfully with generated ID.');

  const fetchedUser = getUserByEmail('alice@example.com');
  assert(fetchedUser && fetchedUser.id === user1.id, 'User retrieved by email matches created record.');

  let duplicatePrevented = false;
  try {
    createUser({ name: 'Alice Clone', email: 'alice@example.com' });
  } catch (err) {
    duplicatePrevented = true;
  }
  assert(duplicatePrevented, 'Duplicate user email creation was rejected.');

  // Test 2: Event Model & Repository
  console.log('\n--- Test 2: Event Repository & Filters ---');
  const event1 = createEvent({
    title: 'Kandy Music Fest',
    category: 'Music',
    city: 'Kandy',
    venue: 'Kandy Lake Round',
    description: 'Outdoor live concert event.',
    startDate: '2026-12-01',
    startTime: '18:00',
    endTime: '22:00',
    capacity: 5,
    price: 1000,
  }, true); // Publish event

  assert(event1.id && event1.status === 'Published', 'Event created and set to Published status.');

  const fetchedEvent = getEventById(event1.id);
  assert(fetchedEvent && fetchedEvent.title === 'Kandy Music Fest', 'Event fetched by ID matches title.');

  const musicEvents = getPublishedEvents({ category: 'Music' });
  assert(musicEvents.some((e) => e.id === event1.id), 'Published event appears under category filter.');

  // Test 3: Saved Event Uniqueness & Capacity Isolation
  console.log('\n--- Test 3: Saved Event Uniqueness & Capacity Isolation ---');
  saveEvent('user-101', event1.id);
  assert(isEventSaved('user-101', event1.id) === true, 'Event saved to user list.');

  saveEvent('user-101', event1.id); // Save again (duplicate request)
  const savedList = getSavedEvents('user-101');
  const count = savedList.filter((id) => id === event1.id).length;
  assert(count === 1, 'Duplicate saved event link rejected (unique constraint enforced).');

  const reservedPlacesBefore = calculateReservedPlaces(event1.id);
  assert(reservedPlacesBefore === 0, 'Saved event did NOT consume any event capacity.');

  removeSavedEvent('user-101', event1.id);
  assert(isEventSaved('user-101', event1.id) === false, 'Event removed from saved list.');

  // Test 4: Registration & Capacity Atomic Safeguard
  console.log('\n--- Test 4: Registration & Capacity Atomic Integrity ---');
  const reg1 = createRegistration({
    eventId: event1.id,
    names: ['Bob Perera', 'Charlie Perera'],
    userId: 'user-200',
  });
  assert(reg1.id && reg1.tickets.length === 2, 'Registration created with 2 tickets.');

  const remainingPlacesAfterReg1 = calculateRemainingPlaces(event1);
  assert(remainingPlacesAfterReg1 === 3, 'Remaining capacity correctly updated (5 capacity - 2 reserved = 3).');

  let overbookingPrevented = false;
  try {
    // Attempt to book 4 places when only 3 remain
    createRegistration({
      eventId: event1.id,
      names: ['Person A', 'Person B', 'Person C', 'Person D'],
      userId: 'user-300',
    });
  } catch (err) {
    overbookingPrevented = true;
  }
  assert(overbookingPrevented, 'Overbooking request exceeding remaining capacity was rejected.');

  // Test 5: Cancellation Status Cascade
  console.log('\n--- Test 5: Cancellation Status Cascade ---');
  const ticketList = getTicketsByRegistration(reg1.id);
  assert(ticketList.length === 2, 'Retrieved 2 tickets for registration.');
  const sampleTicketCode = ticketList[0].ticketCode;

  cancelRegistration(reg1.id, 'User change of plans');
  const cancelledReg = getRegistrationById(reg1.id);
  assert(cancelledReg.status === 'Cancelled', 'Registration status set to Cancelled.');

  const cancelledTickets = getTicketsByRegistration(reg1.id);
  assert(
    cancelledTickets.every((t) => t.status === 'Cancelled'),
    'Cancellation cascaded to invalidate all associated tickets.'
  );

  const restoredCapacity = calculateRemainingPlaces(event1);
  assert(restoredCapacity === 5, 'Cancelled registration released places back to capacity.');

  // Test 6: Ticket Check-in Safeguard
  console.log('\n--- Test 6: Ticket Check-in Integrity ---');
  let cancelledCheckInPrevented = false;
  try {
    checkInTicket(event1.id, sampleTicketCode);
  } catch (err) {
    cancelledCheckInPrevented = true;
  }
  assert(cancelledCheckInPrevented, 'Check-in of a cancelled ticket was rejected.');

  // Create new active registration for check-in test
  const reg2 = createRegistration({
    eventId: event1.id,
    names: ['Dave Perera'],
    userId: 'user-400',
  });
  const validTicketCode = reg2.tickets[0].ticketCode;

  const checkInResult = checkInTicket(event1.id, validTicketCode);
  assert(checkInResult && checkInResult.id === reg2.id, 'Valid ticket checked in successfully.');

  let doubleCheckInPrevented = false;
  try {
    checkInTicket(event1.id, validTicketCode);
  } catch (err) {
    doubleCheckInPrevented = true;
  }
  assert(doubleCheckInPrevented, 'Duplicate check-in of already used ticket was rejected.');

  console.log('\n==================================================');
  console.log(`Test Execution Completed: ${testPassedCount} Passed, ${testFailedCount} Failed.`);
  console.log('==================================================');

  if (testFailedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

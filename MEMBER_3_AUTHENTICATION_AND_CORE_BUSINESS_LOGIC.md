# EVENTORA — MEMBER 3: AUTHENTICATION AND CORE BUSINESS LOGIC
## Complete Development Instructions

**Project:** Eventora — Mobile Event Discovery and Attendance Application  
**Role:** Member 3 — Authentication and Core Business Logic  
**Language:** JavaScript | **UI:** React Native + JSX | **Toolkit:** Expo  
**IDE / Android testing:** Android Studio  
**Requirements source:** Eventora Revised SRS v2.0 (review draft, 12 November 2026)

---

## 1. Role and objective

You own the logic that controls user access and Eventora's main operations. Your implementation must use the data layer created by Member 2. Do not create a second database, user store or repository layer.

Deliver:
- Registration and login.
- Logout and session handling.
- Role and permission checks.
- Profile/account lifecycle behavior within the agreed scope.
- Organizer event-operation rules.
- Free-event registration and cancellation logic.
- Capacity and booking validation.
- Ticket validity rules in coordination with Member 5.
- Error handling and tests.
- Documented service interfaces for Member 1 and other members.

## 2. Technology rules

The team has stated that Eventora uses JavaScript, React Native with JSX and Expo. Android Studio is the main development environment.

1. Keep the existing JavaScript / React Native / Expo project.
2. Use Android Studio as the main IDE and for Android SDK/emulator testing.
3. Do not convert the app to native Java or Kotlin.
4. Do not replace React Native or Expo.
5. Inspect the repository and use the authentication/backend technology already selected by the team.
6. Coordinate user, event, registration and ticket structures with Member 2.
7. Do not create a second database or duplicate Member 2's repositories.
8. Never store plaintext passwords.
9. Never hardcode secrets or private service credentials in the mobile app.
10. Do not introduce TypeScript or a new backend stack without approval.
11. Keep UI changes minimal; Member 1 owns the main screens.
12. Do not delete or overwrite another member's work.

Android Studio is the IDE / Android SDK / emulator environment. It does not itself provide authentication, a backend or a database. Continue using the project's existing Node.js and Expo tooling.

## 3. First step: inspect the repository

Before editing:

1. Open the Eventora repository in Android Studio.
2. Inspect the full project structure.
3. Check `package.json`, lock files, Expo configuration, app entry points and navigation.
4. Check the current branch and `git status`.
5. Search for login, registration, user context, session, API, backend, database and data-service code.
6. Identify the authentication and database technologies already selected.
7. Contact Member 2 and agree on user fields and data-access interfaces.
8. Identify files owned by Members 1, 2, 4 and 5.
9. Run the existing app before making changes, if possible.
10. Record existing issues separately; do not refactor unrelated code.

Do not replace existing authentication or business logic until you understand how it is used.

## 4. Authentication requirements

The SRS requires account creation, sign-in, profile editing and explicit interest selection. It proposes password reset, verified email changes, logout and account deletion, subject to approval.

### 4.1 Registration

Implement the agreed registration workflow:

1. Collect required details from the existing UI.
2. Validate required fields and formats.
3. Check whether the account already exists through the approved provider/backend.
4. Create the authentication account securely.
5. Create or update the Eventora profile through Member 2's agreed data layer.
6. Handle partial failures safely. Do not show successful registration if profile creation failed.
7. Return a clear result for the UI.
8. Never log passwords or sensitive tokens.

Confirm exact required fields from the SRS, existing UI and team. Do not invent mandatory fields.

### 4.2 Login

Implement:
- Validation of required login fields.
- Authentication through the selected provider/backend.
- Retrieval of the associated Eventora user profile.
- Session establishment using the provider's recommended mechanism.
- Handling for incorrect credentials, disabled accounts, network failures and incomplete profiles.
- A reliable authenticated/unauthenticated state for navigation.

A local `isLoggedIn = true` flag is not proof of identity.

### 4.3 Session persistence and logout

Use the authentication provider's supported session persistence. If the mobile client must store tokens, use the secure storage approach already approved by the project.

Logout must:
- End or invalidate the session as supported by the provider.
- Clear in-memory user/session state.
- Remove local session material where appropriate.
- Prevent the previous user from continuing to access protected screens/actions.

### 4.4 Password reset and account lifecycle

Confirm whether the prototype includes password reset, verified email change and account deletion.

If included:
- Use the provider's secure reset and verification flow.
- Respect provider-managed token/link expiry.
- Require appropriate verification for sensitive changes.
- Do not create an insecure custom password-reset system.
- Follow the team's approved retention policy for booking and attendance history.

## 5. Roles and authorization

The SRS describes Attendee, Organizer and Administrator. Some role scope is proposed and needs team confirmation.

### Attendee
- Browse published public events.
- Manage their own profile and preferences.
- Reserve/cancel their own eligible free places.
- View their own registrations and tickets.
- Save events.

### Organizer
- Manage only events assigned to their organization.
- View authorized registrations for assigned events.
- Perform permitted event operations.
- Use check-in functions only if assigned and included.

### Administrator
- Perform approved platform governance and moderation operations.
- Manage organizer access and reports if included.
- Access sensitive information only through authorized workflows.

Security rule: hiding a button in React Native is not authorization. Protected operations must be checked by the trusted backend/service. If the prototype uses only local data, document that its permission checks are demonstration-level, not production-grade server security.

## 6. Business logic structure

Keep rules in reusable services, not directly inside screen components. Follow existing project conventions.

Possible organization:

```text
src/
  services/
    authService.js
    eventBusinessService.js
    registrationService.js
    ticketService.js
  context/
    AuthContext.js
  utils/
    validation.js
  tests/
```

This is an example only. Do not duplicate Member 2's database configuration, models or repositories.

## 7. Event management rules

Coordinate event fields with Member 2 and screens with Member 1.

Implement approved operations:
- Create an event for an authorized organizer.
- Update an event only if the user can manage it.
- Retrieve events belonging to the organizer.
- Validate required fields, date/time ranges and capacity.
- Prevent one organizer from editing another organizer's event.
- Apply only approved event status transitions.

The SRS proposes Draft, Submitted, Published, Registration closed, Completed, Archived, Cancelled and Rescheduled. Confirm which states are in the team's Version 1 scope.

Do not allow registration for unpublished, cancelled, ineligible or closed events.

## 8. Free-event registration logic

This is a core Eventora workflow.

Implement:

1. Receive the authenticated user, event ID and requested quantity.
2. Validate quantity and required attendee details.
3. Retrieve the event through Member 2's agreed data-access function.
4. Confirm the event is published and eligible.
5. Confirm registration is open and the event is not cancelled.
6. Apply the approved per-booking limit and duplicate-booking policy.
7. Check available capacity.
8. Create the registration and associated admission-place/ticket records through Member 2's data layer.
9. Ensure registration and capacity updates are atomic on the authoritative backend.
10. Return confirmation or a clear refusal reason.

For a limited-capacity event:

```text
remaining places = capacity - confirmed reserved places
```

Count people/admission places, not registration records. Unlimited events must not show a misleading numeric remaining count.

### Concurrency and safe retries

Do not rely only on a mobile-side capacity check. Two users may try to reserve the final place simultaneously.

Use the transaction or atomic operation supported by the agreed backend. Coordinate with Member 2 so the data layer supports it.

Where supported, use an idempotency key or equivalent safe-retry mechanism. Retrying after a timeout must not create duplicate registrations, decrement capacity twice or create duplicate tickets.

If the chosen prototype backend cannot provide authoritative transactions/concurrency protection, document the limitation and agree the demo behavior. Do not claim production-safe booking without it.

## 9. Cancellation logic

Implement only after the team confirms:
- Who may cancel.
- Cancellation cutoff.
- Whole-booking or partial cancellation.
- Whether policies vary by event.

When cancellation is allowed:

1. Verify the authenticated user owns the booking, or has approved administrative permission.
2. Verify the booking is confirmed.
3. Check the cancellation policy.
4. Update registration status.
5. Invalidate associated ticket credentials.
6. Restore capacity exactly once.
7. Preserve the cancelled record for history.
8. Return a clear result.

Repeated cancellation requests must not restore capacity more than once.

## 10. Ticket and attendance rules

Coordinate with Member 5 (calendar, notifications and final testing) and Member 2 (ticket persistence).

The SRS proposes:
- One unique, non-guessable credential per confirmed admission place.
- QR payloads contain an opaque reference or signed token, not unnecessary personal information.
- Cancelled tickets cannot be redeemed.
- A ticket can be checked in only once.
- Repeat scans return an “Already used” result.
- Tickets must belong to the correct event.
- An ended event without a verified scan is “Past registration”, not “Attended”.

Do not implement scanner UI if it belongs to another member. Provide agreed validation/business functions and coordinate the interface.

## 11. Paid-event preview boundary

The SRS defines paid checkout as preview-only for Version 1.

Your logic must ensure:
- Ticket type, quantity and total can be calculated for display.
- No card/payment credentials are collected.
- No real payment is processed.
- No receipt is issued.
- No confirmed paid registration is created.
- No valid paid ticket or QR credential is issued.
- The flow ends with “Online payment coming soon” or the team's approved equivalent.

## 12. Interfaces with Member 2

Member 2 owns persistence and repositories. Agree exact names and return formats before using them.

Possible illustrative interfaces:

```js
getUserByEmail(email)
createUser(userData)
getEventById(eventId)
getEventsByOrganizer(organizerId)
createRegistration(registrationData)
getRegistrationById(registrationId)
updateRegistrationStatus(registrationId, status)
getTicketsByRegistration(registrationId)
updateTicketStatus(ticketId, status)
```

Do not assume these functions already exist. Agree the real signatures together. Your business services should call the data layer; they should not contain a second set of direct database queries.

## 13. Interfaces for Member 1 and other members

Coordinate stable functions for the UI and other workstreams.

Possible service interfaces:

```js
registerUser(formData)
loginUser(credentials)
logoutUser()
getCurrentUser()
updateProfile(userId, profileUpdates)

createOrganizerEvent(eventData)
updateOrganizerEvent(eventId, updates)

registerForFreeEvent(eventId, quantity, attendeeDetails)
cancelRegistration(registrationId)

validateTicket(ticketReference, eventId)
```

These are examples. Agree final names and document:
- Function name and arguments.
- Success return value.
- Possible error codes/messages.
- Whether authentication is required.
- Which roles may call it.

## 14. Error handling

Handle at least:
- Missing/invalid fields.
- Invalid credentials.
- Account already exists.
- Unauthenticated request.
- Permission denied.
- Event not found.
- Event unpublished or cancelled.
- Registration not open or already closed.
- Sold-out event.
- Quantity above the allowed limit.
- Duplicate booking, where prohibited.
- Cancellation not allowed or already cancelled.
- Invalid, cancelled, wrong-event or already-used ticket.
- Network/backend unavailable.

Return predictable errors that screens can display. Never expose stack traces, passwords, tokens or private database details.

## 15. Android Studio development workflow

1. Open the existing Eventora repository in Android Studio.
2. Confirm Android SDK and emulator setup.
3. Use the existing Node.js / Expo setup.
4. Open Android Studio's integrated terminal.
5. Follow the existing package manager and lock file.
6. Start Expo using the project's script, commonly:

```bash
npx expo start
```

7. Start an Android emulator through Device Manager.
8. Run the app using the Expo workflow shown in the terminal.
9. Test through the app and the existing test commands.

Do not replace the React Native/Expo workflow with native Java/Kotlin development.

## 16. Tests

Use the test framework already configured. Coordinate end-to-end testing with Member 5.

### Authentication
- Successful registration.
- Duplicate account rejected.
- Successful login.
- Incorrect credentials rejected.
- Session persistence after restart, if supported.
- Logout.
- Protected action after logout rejected.
- Profile update for authenticated user.
- Access to another user's profile denied.

### Roles and event management
- Attendee cannot create/edit organizer events.
- Organizer can manage assigned events.
- Organizer cannot manage another organization's events.
- Invalid event data rejected.
- Invalid state transitions rejected.

### Booking and cancellation
- Successful free booking.
- Sold-out event rejected.
- Closed/cancelled event rejected.
- Quantity above approved limit rejected.
- Capacity decreases by number of people, not number of registration records.
- Repeated request does not create duplicate registration/tickets.
- Concurrent attempts for the last place do not oversell, where backend supports it.
- Permitted cancellation restores capacity once.
- Repeated cancellation does not restore capacity twice.
- Cancelled tickets cannot be used.

### Paid preview
- Total changes with quantity.
- No payment credentials requested.
- No payment, receipt, paid booking or valid ticket created.

Record actual test commands/results. Do not claim tests pass unless run.

## 17. GitHub branch workflow

Work only on your assigned Member 3 branch.

Before work:

```bash
git status
git branch
git pull
```

Use the team's agreed base branch and pull procedure; do not assume the default branch name.

Commit logical changes separately, for example:

```bash
git add .
git commit -m "Implement Eventora authentication"
git push
```

Other useful commit messages:
- `Add session and logout handling`
- `Implement role permission checks`
- `Add free event booking rules`
- `Implement cancellation validation`
- `Add business logic tests`

Create a Pull Request to the agreed integration branch. Confirm Member 2's data-layer interfaces are available. Review changes together, resolve conflicts with file owners and test the integrated app. Do not overwrite Member 1's screens or Member 2's repositories.

## 18. Definition of done

- Existing app still starts.
- Registration/login work with the agreed authentication solution.
- Session and logout work.
- Protected operations enforce approved permissions.
- Event and booking rules are implemented.
- Booking/cancellation reuse Member 2's data layer.
- Capacity, retry and ticket rules are tested to the level supported by the backend.
- Paid preview does not create payment or ticket records.
- Member 1 can call the agreed service interfaces.
- Member 2's data layer is reused, not duplicated.
- Tests and limitations are documented.
- Changes are committed and pushed to your branch.
- Pull Request and integration notes are ready.

## 19. Instructions for Antigravity or another coding assistant

Give the coding assistant this file and instruct it:

1. Read this entire document.
2. Inspect the complete existing Eventora repository before editing.
3. Report the framework, package manager, authentication provider/backend, database, folder structure, branch and existing auth/business logic.
4. Identify Member 2's data models and functions.
5. Agree shared interfaces with Member 2 before implementing dependent code.
6. Do not create a second database, authentication provider or repository layer.
7. Do not overwrite working code or another member's files.
8. Implement in small stages; after each stage list changed files and run relevant tests.
9. Use JavaScript and existing React Native/Expo conventions.
10. Do not introduce TypeScript, native Kotlin/Java screens or a new backend stack without approval.
11. If authentication/backend technology is undecided, stop before provider-specific code and report the decision needed.
12. Keep UI changes minimal; Member 1 owns the main screens.
13. Document service interfaces for Member 1 and Member 5.
14. Never claim unrun tests or unverified functionality works.

**Start with repository inspection and a proposed plan. Do not immediately rewrite the project.**

## 20. SRS traceability

This task supports:
- Section 12: Accounts and preferences.
- Section 17: Business rules and state transitions.
- Section 18: User journeys and failure handling.
- Section 20: Security and privacy.
- Sections 22–23: Acceptance testing.
- Section 25: Authentication and Logic workstream.
- Section 26: Open decisions and risks.

The SRS is a review draft, not formally approved. Confirm role scope, booking limits, cancellation rules, ticket policy and organizer workflow with the team before treating proposed rules as final.

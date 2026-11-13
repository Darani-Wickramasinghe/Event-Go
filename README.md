# Eventora

Eventora is an Expo app for finding events, reserving free places, and checking in with a QR ticket. It uses the light theme from [Prelook Studio's EventHub UI kit](https://www.figma.com/design/T81sTwRQXenznSlaZy4LKO/Event-Booking-App--EventHub--Community---Community-?node-id=696-23686).

## Run it locally

Use Node.js 20.19 or newer.

```bash
npm ci
npm run web
```

Open the localhost URL printed by Expo. Localhost or HTTPS is required for browser camera access and ticket code generation. For mobile, run `npm start` and use an Expo Go build compatible with SDK 54 or an emulator.

## Try the demo

1. After the logo screen, choose **Attendee** or **Event organizer** to open the matching sign-up form. Attendees enter a full name, sample email, and home city. Organizers also enter an organization name. Returning users can choose **Log in** from sign-up. Afterward, attendees land on Home and organizers land on their dashboard.
2. Select two places, enter the second attendee name, review, and confirm. Open each QR ticket and find the reservation in **Profile → Calendar**.
3. To switch from the attendee side, open **Profile → Switch role** and choose **Event organizer**. Request organizer access and approve the application in the demo **Admin workspace**. Return to the dashboard to find events by name and status.
4. Reserve another free event to try cancellation before it starts. **Sunset Sessions** has a paid ticket preview with a calculated total.
5. Use **Map** to search a city or request location access. Event Details shows event-hour weather when [Open-Meteo](https://open-meteo.com/en/docs) has data for the venue and date.

The side menu opens your ticket history, a month calendar with selectable reservation dates, searchable saved events, and an inbox with an unread filter. In **Settings**, choose whether to see an in-app reminder 1, 24, or 48 hours before your event.

### Organizer flow

Use **Overview** for event totals and review status, **Events** for the searchable catalog, **Attendees** for reservation lists, and **Check-in** for ticket validation.

1. **Create event draft** → complete **Details**, **Schedule**, and **Admission** → preview and save the draft.
2. Open the draft and choose **Submit for review**. Publish or return it with a reason from **Admin workspace**. A returned draft can be edited and resubmitted.
3. Open a published event to edit its schedule or venue, search attendees, close registration, or open **Ticket check-in** to scan a QR or enter a demo code. Repeated check-in attempts are rejected.
4. **Cancel event** requires a reason and confirmation. Completed or cancelled events can be archived, with registrations retained in history.

Demo profiles, reservations, saved events, and moderation actions are stored on the current device or browser. QR check-in uses that same local data. The demo allows up to four places, one QR per place, and whole-booking cancellation before the event starts or a ticket is checked in. Reminders are in-app. Browser map tiles use [OpenStreetMap](https://www.openstreetmap.org/copyright). Set `EXPO_PUBLIC_MAP_TILE_URL` to override the tile endpoint with an equivalent attributed provider.

A deployed version needs an authentication service, server-enforced roles, a shared database for capacity and check-in, and notification delivery. Use sample attendee names in this demo.

## Where to read the code

- `App.js` handles tabs, screen navigation, and event links.
- `src/screens/` holds the attendee, organizer, and admin screens.
- `src/components/FlowUI.js` provides shared buttons, fields, and page headers. `src/theme.js` defines the palette.
- `src/data/reservations.js` checks capacity, cancellation, and ticket status. `src/data/eventOperations.js` validates event edits and status changes.
- `src/data/useDemoStore.js` saves the demo data. `src/data/useEventoraData.js` connects it to the app.

Event photos are from Unsplash ([music](https://images.unsplash.com/photo-1501386761578-eac5c94b800a), [technology](https://images.unsplash.com/photo-1540575467063-178a50c2df87), [food](https://images.unsplash.com/photo-1555939594-58d7cb561ad1), and [art](https://images.unsplash.com/photo-1577720580479-7d839d829c73)).

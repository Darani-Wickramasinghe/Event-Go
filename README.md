# Eventora

Eventora is a mobile event discovery app with Home, Explore, and event details using sample events. The Profile tab shows bookmarks for the current session. The Map tab lists venues and details link to external directions.

In Explore, open Filters to narrow results by category, city, date range, price, or venue setting. Enter dates as `YYYY-MM-DD`, or leave either date blank. Apply filters updates the results. Choosing All in the category row clears the category while keeping the other filters.

## Run locally

Use Node.js 20.19 or newer.

```bash
npm ci
npm run web
```

For mobile, run `npm start` and use an Expo Go build compatible with Expo SDK 54 or an emulator.

## Start reading here

- `App.js` switches tabs and holds the current event, applied filters, and bookmarks.
- `src/screens/` contains discovery and event details.
- `src/components/EventFiltersSheet.js` lets you edit filters and apply them together.
- `src/data/eventFilters.js` checks dates and matches events against the search and filters.
- `src/components/EventCard.js` is the shared card and bookmark button.
- `src/data/events.js` contains sample events and categories.
- `src/theme.js` defines shared colors. Event photos are in `assets/`.

The design follows the light theme of [Prelook Studio's EventHub UI kit](https://www.figma.com/design/T81sTwRQXenznSlaZy4LKO/Event-Booking-App--EventHub--Community---Community-?node-id=696-23686). Event photos are from Unsplash ([music](https://images.unsplash.com/photo-1501386761578-eac5c94b800a), [technology](https://images.unsplash.com/photo-1540575467063-178a50c2df87), [food](https://images.unsplash.com/photo-1555939594-58d7cb561ad1), and [art](https://images.unsplash.com/photo-1577720580479-7d839d829c73)).

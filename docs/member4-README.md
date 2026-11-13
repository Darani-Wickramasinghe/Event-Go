# Eventora - Member 4 (Location, Maps & APIs)

Step 1: location permission, GPS, shared origin, distance helpers.
Step 2: event-time Weather Planner (Open-Meteo, no API key needed).

## How to use

1. Create the Expo project (skip if your team already has one):

       npx create-expo-app@latest eventora-app --template blank
       cd eventora-app

2. Install packages:

       npx expo install expo-location react-native-maps

3. Copy everything from this zip into the project root, replacing
   `app.json` and `App.js` when asked.

4. Run:

       npx expo start

5. Optional unit tests (Node 22+, no extra packages):

       node tests/weatherRules.test.mjs

## Files

- app.json                           Expo config with location permission text
- App.js                             Temporary test host (delete later)
- src/context/LocationContext.js     useLocation() -> origin, status, weakSignal, ...
- src/utils/distance.js              distanceLabel, sortByNearest, withinRadius
- src/utils/time.js                  Hour helpers and venue-timezone formatting
- src/constants/cities.js            Manual city fallback list
- src/services/weatherRules.js       Pure rules: 30/60% thresholds, checklist, material-change check
- src/services/weatherService.js     Open-Meteo fetch, 16-day horizon, cache, stale fallback
- src/services/weatherMocks.js       Fake responses for demos and AT-19
- src/hooks/useEventWeather.js       const { summary, loading, reload } = useEventWeather(event)
- src/screens/LocationDemo.js        Step 1 test screen
- src/screens/WeatherDemo.js         Step 2 test screen (live data + mock scenarios)
- tests/weatherRules.test.mjs        15 unit tests

## Event object the weather service needs (from Member 2)

    {
      id,
      startsAt: '2026-11-14T11:30:00.000Z',   // ISO with offset or Z
      endsAt:   '2026-11-14T14:30:00.000Z',
      timezone: 'Asia/Colombo',                // venue timezone (display)
      setting: 'outdoor' | 'indoor',
      coordinates: { latitude, longitude }
    }

## WeatherSummary (what Member 1 renders)

    status: 'ok' | 'unavailable' | 'out_of_range' | 'ended'
    category: 'LOW_RAIN' | 'RAIN_POSSIBLE' | 'PREPARE_RAIN' | 'CHECK_ORGANIZER' | null
    title, reason, scope ('event' | 'arrival')
    peakRainPercent, peakRainAt, thunderAt[]
    apparentTempMin, apparentTempMax, windMaxKmh
    checklist: [{ key, label }]
    lastUpdated (ISO), stale (boolean)

Only show positive advice when status === 'ok'. For any other status show
`title` / `reason` as a neutral message (never reassurance).

## For teammates

- Shared origin anywhere: const { origin } = useLocation();
- Card distance: distanceLabel(origin, event.coordinates)
- Member 5 (notifications): hasMaterialChange(previousSummary, newSummary)
  returns true only when two real forecasts differ in category or checklist.

## Rules implemented 

- Below 30% all event hours: Low rain chance
- 30-59%: Rain possible
- 60%+: Prepare for rain (peak hourly chance + hour shown)
- Thunderstorm code (95/96/99): Check organizer updates (not an official alert)
- Beyond 16 days: Forecast available closer to the event (no request made)
- Missing / incomplete / failed data: unavailable, never reassuring
- Stale data: cautionary advice still shown with "stale"; reassuring advice hidden
- Indoor events: arrival-time conditions (hour before start), rain advice only
- Weather never cancels or changes a booking
- Thresholds are product rules, not safety thresholds

## Test checklist (WeatherDemo screen)

1. Live: real forecast appears with "Last updated".
2. rain_high: "Prepare for rain", peak 75%, umbrella in checklist.
3. thunder: "Check organizer updates".
4. incomplete / http_error: "Weather unavailable", no advice (AT-19).
5. rain_high, then network_error: older data shown with "stale" warning.
6. low_rain, then network_error: unavailable, no reassurance.
7. Switch to indoor: scope becomes arrival time.

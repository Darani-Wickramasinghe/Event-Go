// Run with:  node tests/weatherRules.test.mjs   (Node 22+)
import assert from 'node:assert/strict';
import { getEventWeather, clearWeatherCache } from '../src/services/weatherService.js';
import { buildMockFetch } from '../src/services/weatherMocks.js';
import {
  CATEGORY,
  STATUS,
  computeWeatherSummary,
  hasMaterialChange,
} from '../src/services/weatherRules.js';

const now = Date.UTC(2026, 10, 13, 6, 0);
const baseEvent = {
  id: 'e1',
  startsAt: new Date(Date.UTC(2026, 10, 14, 11, 30)).toISOString(), // 5:00 PM Colombo
  endsAt: new Date(Date.UTC(2026, 10, 14, 14, 30)).toISOString(),
  timezone: 'Asia/Colombo',
  setting: 'outdoor',
  coordinates: { latitude: 6.9747, longitude: 79.918 },
};

let passed = 0;
async function test(name, fn) {
  clearWeatherCache();
  await fn();
  passed++;
  console.log('ok -', name);
}

const run = (scenario, event = baseEvent, extra = {}) =>
  getEventWeather(event, { now, fetchImpl: buildMockFetch(scenario, event, now), ...extra });

// Build hourly data where the peak rain chance is exactly `peak`.
async function hourlyWithPeak(peak, code = 1) {
  const res = await buildMockFetch('rain_possible', baseEvent, now)();
  const { hourly } = await res.json();
  hourly.precipitation_probability = hourly.precipitation_probability.map((v, i) =>
    hourly.time[i].startsWith('2026-11-14T1') ? peak : v
  );
  hourly.weather_code = hourly.weather_code.map(() => code);
  return hourly;
}

await test('threshold: 29% is Low rain chance', async () => {
  const s = computeWeatherSummary({ event: baseEvent, hourly: await hourlyWithPeak(29), fetchedAt: now });
  assert.equal(s.category, CATEGORY.LOW_RAIN);
});

await test('threshold: 30% and 59% are Rain possible', async () => {
  for (const p of [30, 59]) {
    const s = computeWeatherSummary({ event: baseEvent, hourly: await hourlyWithPeak(p), fetchedAt: now });
    assert.equal(s.category, CATEGORY.RAIN_POSSIBLE);
  }
});

await test('threshold: 60% is Prepare for rain', async () => {
  const s = computeWeatherSummary({ event: baseEvent, hourly: await hourlyWithPeak(60), fetchedAt: now });
  assert.equal(s.category, CATEGORY.PREPARE_RAIN);
});

await test('rain_high: peak 75% with umbrella advice', async () => {
  const s = await run('rain_high');
  assert.equal(s.status, STATUS.OK);
  assert.equal(s.category, CATEGORY.PREPARE_RAIN);
  assert.equal(s.peakRainPercent, 75);
  assert.ok(s.checklist.some((c) => c.key === 'rain_protection'));
});

await test('low_rain on a warm day suggests water', async () => {
  const s = await run('low_rain');
  assert.equal(s.category, CATEGORY.LOW_RAIN);
  assert.ok(s.checklist.some((c) => c.key === 'water'));
});

await test('thunderstorm code gives Check organizer updates', async () => {
  const s = await run('thunder');
  assert.equal(s.category, CATEGORY.CHECK_ORGANIZER);
  assert.ok(s.thunderAt.length > 0);
});

await test('AT-19: incomplete data gives no summary', async () => {
  const s = await run('incomplete');
  assert.equal(s.status, STATUS.UNAVAILABLE);
  assert.equal(s.category, null);
});

await test('AT-19: network error with no cache is unavailable', async () => {
  const s = await run('network_error');
  assert.equal(s.status, STATUS.UNAVAILABLE);
  assert.equal(s.category, null);
});

await test('AT-19: HTTP error is unavailable', async () => {
  const s = await run('http_error');
  assert.equal(s.status, STATUS.UNAVAILABLE);
});

await test('AT-19: event beyond 16 days is out of range (no request made)', async () => {
  const far = { ...baseEvent, startsAt: new Date(now + 20 * 86400000).toISOString(), endsAt: new Date(now + 20 * 86400000 + 3600000).toISOString() };
  let called = false;
  const s = await getEventWeather(far, { now, fetchImpl: async () => { called = true; } });
  assert.equal(s.status, STATUS.OUT_OF_RANGE);
  assert.equal(called, false);
});

await test('ended event returns ended', async () => {
  const past = { ...baseEvent, startsAt: new Date(now - 7200000).toISOString(), endsAt: new Date(now - 3600000).toISOString() };
  const s = await getEventWeather(past, { now });
  assert.equal(s.status, STATUS.ENDED);
});

await test('stale + cautionary forecast is still shown, marked stale', async () => {
  await run('rain_high');
  const s = await run('network_error', baseEvent, { forceRefresh: true });
  assert.equal(s.status, STATUS.OK);
  assert.equal(s.stale, true);
  assert.equal(s.category, CATEGORY.PREPARE_RAIN);
});

await test('stale + reassuring forecast becomes unavailable', async () => {
  await run('low_rain');
  const s = await run('network_error', baseEvent, { forceRefresh: true });
  assert.equal(s.status, STATUS.UNAVAILABLE);
  assert.equal(s.stale, true);
  assert.equal(s.category, null);
});

await test('indoor event uses arrival scope and no water/jacket advice', async () => {
  const indoor = { ...baseEvent, setting: 'indoor' };
  const s = await run('low_rain', indoor);
  assert.equal(s.scope, 'arrival');
  assert.ok(!s.checklist.some((c) => c.key === 'water' || c.key === 'jacket'));
});

await test('hasMaterialChange only compares real forecasts', async () => {
  const a = await run('low_rain');
  const b = await run('rain_high', baseEvent, { forceRefresh: true });
  clearWeatherCache();
  const bad = await run('network_error');
  assert.equal(hasMaterialChange(a, b), true);
  assert.equal(hasMaterialChange(a, a), false);
  assert.equal(hasMaterialChange(a, bad), false);
});

console.log(`\nAll ${passed} tests passed.`);

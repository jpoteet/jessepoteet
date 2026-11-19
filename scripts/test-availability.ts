/**
 * Sanity checks for busy merging + slot generation.
 * Run: npx tsx scripts/test-availability.ts
 */

import { BOOKING_LINKS, resolveBookingMode } from '../src/config/availability';
import { eventsToMergedBusy, mergeBusyIntervals } from '../src/lib/availability/busy';
import { buildMockAvailabilityResponse } from '../src/lib/availability/mock';
import { parseAvailabilityAsk } from '../src/lib/availability/parseQuery';
import { generateSlots, nextOpening } from '../src/lib/availability/slots';
import { zonedLocalToUtc } from '../src/lib/availability/time';
import { localAskFallback, validateAskResult } from '../functions/_lib/ask';

let failed = 0;
function assert(cond: unknown, msg: string) {
  if (!cond) {
    failed += 1;
    console.error('FAIL:', msg);
  } else {
    console.log('ok:', msg);
  }
}

const merged = mergeBusyIntervals([
  { startMs: 0, endMs: 100 },
  { startMs: 50, endMs: 150 },
  { startMs: 200, endMs: 250 },
  { startMs: 250, endMs: 300 },
]);
assert(merged.length === 2, 'merge collapses overlap + touch');
assert(merged[0].endMs === 150, 'first block ends at 150');
assert(merged[1].endMs === 300, 'second block merges touch');

const tz = 'America/Denver';
const startIso = zonedLocalToUtc(2026, 11, 23, 10 * 60, tz).toISOString();
const endIso = zonedLocalToUtc(2026, 11, 23, 11 * 60, tz).toISOString();
const busy = eventsToMergedBusy(
  [
    { eventStart: startIso, eventEnd: endIso, free: false, allDay: false },
    { eventStart: startIso, eventEnd: endIso, free: false, allDay: false },
    {
      eventStart: zonedLocalToUtc(2026, 11, 23, 12 * 60, tz).toISOString(),
      eventEnd: zonedLocalToUtc(2026, 11, 23, 12 * 60 + 30, tz).toISOString(),
      free: true,
      allDay: false,
    },
  ],
  tz,
);
assert(busy.length === 1, 'duplicates merge; free ignored');

const allDayBusy = eventsToMergedBusy(
  [
    {
      eventStart: zonedLocalToUtc(2026, 11, 24, 0, tz).toISOString(),
      eventEnd: zonedLocalToUtc(2026, 11, 25, 0, tz).toISOString(),
      free: false,
      allDay: true,
    },
  ],
  tz,
);
assert(allDayBusy.length === 1, 'all-day produces one interval');
assert(
  new Date(allDayBusy[0].end).getTime() - new Date(allDayBusy[0].start).getTime() ===
    24 * 60 * 60 * 1000,
  'all-day spans 24h',
);

const fixedNow = zonedLocalToUtc(2026, 11, 23, 7 * 60, tz);
const payload = buildMockAvailabilityResponse(fixedNow);
const slots = generateSlots(payload.busy, payload.meta, {
  durationMinutes: 30,
  visitorTimeZone: tz,
  now: fixedNow,
  rangeStartKey: payload.meta.rangeStart,
  rangeEndKey: payload.meta.rangeEnd,
});
assert(slots.length > 0, `mock yields open slots (got ${slots.length})`);
assert(
  slots.every((s) => {
    const d = new Date(s.start);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(d);
    const minute = Number(parts.find((p) => p.type === 'minute')?.value);
    return minute === 0 || minute === 30;
  }),
  'slots start on hour or half hour',
);

assert(!!nextOpening(payload.busy, payload.meta, 30, fixedNow), 'nextOpening finds a slot');
assert(!JSON.stringify(payload).includes('Private meeting'), 'mock response has no event titles');
assert(!JSON.stringify(payload).includes('cal-personal'), 'mock response has no calendar ids');

assert(!resolveBookingMode(null).enabled, 'null book param is find-only');
assert(!resolveBookingMode('').enabled, 'empty book param is find-only');
assert(!resolveBookingMode('xyz').enabled, 'unknown book code is find-only');
assert(!resolveBookingMode('  XYZ  ').enabled, 'unknown trimmed code is find-only');
const book1 = resolveBookingMode('1');
assert(book1.enabled && book1.url === BOOKING_LINKS['1'], 'book=1 maps to general Reclaim');
const bookOis = resolveBookingMode(' OIS ');
assert(
  bookOis.enabled && bookOis.url === BOOKING_LINKS.ois,
  'book=ois is case-insensitive and trimmed',
);
const bookAa = resolveBookingMode('aa');
assert(bookAa.enabled && bookAa.url === BOOKING_LINKS.aa, 'book=aa maps to Alpine link');
const bookOs = resolveBookingMode('os');
assert(bookOs.enabled && bookOs.url === BOOKING_LINKS.os, 'book=os maps to Operator Stack link');
assert(
  !resolveBookingMode('ois').enabled ||
    (resolveBookingMode('ois') as { url: string }).url !== BOOKING_LINKS.aa,
  'ois never falls back to aa',
);

const askZone = 'America/Denver';
const askNow = new Date('2026-11-19T16:00:00.000Z');
const threeWeeks = parseAvailabilityAsk('30 minutes sometime in the next 3 weeks', {
  visitorTimeZone: askZone,
  now: askNow,
});
assert(threeWeeks.ok, 'next 3 weeks ask parses');
if (threeWeeks.ok) {
  assert(threeWeeks.durationMinutes === 30, 'next 3 weeks keeps 30 min');
  assert(threeWeeks.windowPreset === 'custom', 'next 3 weeks uses custom range');
  assert(!!threeWeeks.rangeEndKey, 'next 3 weeks has range end');
}

const tue = parseAvailabilityAsk('an hour next tuesday afternoon', {
  visitorTimeZone: askZone,
  now: askNow,
});
assert(tue.ok && tue.ok && tue.durationMinutes === 60, 'next tuesday afternoon is 60 min');
if (tue.ok) assert(tue.timeOfDay === 'afternoon', 'next tuesday afternoon tod');

const quick = parseAvailabilityAsk('quick 15 min call tomorrow morning', {
  visitorTimeZone: askZone,
  now: askNow,
});
assert(quick.ok && quick.durationMinutes === 15, 'tomorrow morning is 15 min');
if (quick.ok) assert(quick.timeOfDay === 'morning', 'tomorrow morning tod');

const fri = parseAvailabilityAsk('anything friday', {
  visitorTimeZone: askZone,
  now: askNow,
});
assert(fri.ok && fri.durationMinutes === 30, 'anything friday defaults to 30');

const clamped = validateAskResult(
  {
    duration: 45,
    rangeStart: '1999-01-01',
    rangeEnd: '2099-01-01',
    timeOfDay: 'evening' as 'any',
    reply: 'Hello — streamlined plan',
    source: 'ai',
  },
  { timeZone: askZone, now: askNow },
);
assert(clamped.duration === 30 || clamped.duration === 60, 'duration clamped to allowed set');
assert(!clamped.reply.includes('—'), 'reply strips em dash');
assert(!/streamlined/i.test(clamped.reply), 'reply strips streamlined');
assert(clamped.rangeStart >= '2026-11-19', 'rangeStart clamped forward');

const local = localAskFallback('30 minutes sometime in the next 3 weeks', {
  timeZone: askZone,
  now: askNow,
});
assert(local.source === 'local', 'local fallback marks source');
assert(local.duration === 30, 'local fallback duration');

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log('\nAll availability checks passed.');

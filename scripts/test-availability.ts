/**
 * Sanity checks for busy merging + slot generation.
 * Run: npx tsx scripts/test-availability.ts
 */

import { eventsToMergedBusy, mergeBusyIntervals } from '../src/lib/availability/busy';
import { buildMockAvailabilityResponse } from '../src/lib/availability/mock';
import { generateSlots, nextOpening } from '../src/lib/availability/slots';
import { zonedLocalToUtc } from '../src/lib/availability/time';

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

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log('\nAll availability checks passed.');

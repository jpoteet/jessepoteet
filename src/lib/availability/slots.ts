import { busyToMs, overlapsBusy, type MsInterval } from './busy';
import {
  addDaysInZone,
  dateKeyInZone,
  formatDayHeading,
  formatShortDate,
  getZonedParts,
  minutesInZone,
  parseInstant,
  startOfDayInZone,
  startOfWeekMondayInZone,
  weekdayInZone,
  zonedLocalToUtc,
} from './time';
import type {
  AvailabilityMeta,
  BusyInterval,
  DayGroup,
  Slot,
  TimeOfDayFilter,
  WindowPreset,
} from './types';

export type SlotQuery = {
  durationMinutes: number;
  visitorTimeZone: string;
  now?: Date;
  /** Inclusive local date YYYY-MM-DD in visitor zone (optional when using preset) */
  rangeStartKey?: string;
  rangeEndKey?: string;
  preset?: WindowPreset;
  timeOfDay?: TimeOfDayFilter;
};

/**
 * Generate open slots from merged busy intervals + schedule meta.
 * Slots are half-hour aligned in Jesse's zone, then displayed in the visitor zone.
 */
export function generateSlots(
  busy: BusyInterval[],
  meta: AvailabilityMeta,
  query: SlotQuery,
): Slot[] {
  const now = query.now ?? new Date();
  const earliest =
    now.getTime() + meta.minNoticeMinutes * 60 * 1000;
  const busyMs = busyToMs(busy);
  const hostZone = meta.timeZone;
  const weekdaySet = new Set(meta.weekdays);

  const range = resolveRange(meta, query, now);
  const slots: Slot[] = [];

  let day = startOfDayInZone(range.start, hostZone);
  const lastDay = startOfDayInZone(range.end, hostZone);

  while (day.getTime() <= lastDay.getTime()) {
    const jsWeekday = weekdayInZone(day, hostZone);
    // Config uses 1=Mon … 5=Fri; JS Sun=0
    const isoWeekday = jsWeekday === 0 ? 7 : jsWeekday;
    if (weekdaySet.has(isoWeekday)) {
      const parts = getZonedParts(day, hostZone);
      for (
        let m = meta.openHours.startMinutes;
        m + query.durationMinutes <= meta.openHours.endMinutes;
        m += meta.slotIntervalMinutes
      ) {
        // Hour / half-hour only (defensive)
        if (m % meta.slotIntervalMinutes !== 0) continue;

        const start = zonedLocalToUtc(
          parts.year,
          parts.month,
          parts.day,
          m,
          hostZone,
        );
        const end = new Date(
          start.getTime() + query.durationMinutes * 60 * 1000,
        );
        if (start.getTime() < earliest) continue;
        if (overlapsBusy(start.getTime(), end.getTime(), busyMs)) continue;

        slots.push({
          start: start.toISOString(),
          end: end.toISOString(),
          durationMinutes: query.durationMinutes,
        });
      }
    }
    day = addDaysInZone(day, 1, hostZone);
  }

  return slots;
}

export function filterByTimeOfDay(
  slots: Slot[],
  visitorTimeZone: string,
  filter: TimeOfDayFilter = 'all',
): Slot[] {
  if (filter === 'all') return slots;
  return slots.filter((slot) => {
    const mins = minutesInZone(parseInstant(slot.start), visitorTimeZone);
    if (filter === 'morning') return mins < 12 * 60;
    return mins >= 12 * 60;
  });
}

export function groupSlotsByDay(
  slots: Slot[],
  visitorTimeZone: string,
): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const slot of slots) {
    const start = parseInstant(slot.start);
    const key = dateKeyInZone(start, visitorTimeZone);
    let group = map.get(key);
    if (!group) {
      group = {
        dateKey: key,
        label: formatDayHeading(start, visitorTimeZone),
        slots: [],
      };
      map.set(key, group);
    }
    group.slots.push(slot);
  }
  return [...map.values()];
}

/** First slot for a duration across the full look-ahead (ignores window filter). */
export function nextOpening(
  busy: BusyInterval[],
  meta: AvailabilityMeta,
  durationMinutes: number,
  now?: Date,
): Slot | null {
  const slots = generateSlots(busy, meta, {
    durationMinutes,
    visitorTimeZone: meta.timeZone,
    now,
    // Full loaded range
    rangeStartKey: meta.rangeStart,
    rangeEndKey: meta.rangeEnd,
  });
  return slots[0] ?? null;
}

/**
 * If the selected window has no slots, find the next date (in visitor TZ)
 * that has at least one slot for this duration within the loaded range.
 */
export function nextDateWithRoom(
  busy: BusyInterval[],
  meta: AvailabilityMeta,
  durationMinutes: number,
  visitorTimeZone: string,
  afterExclusiveEnd: Date,
  now?: Date,
): { dateKey: string; label: string; slot: Slot } | null {
  const slots = generateSlots(busy, meta, {
    durationMinutes,
    visitorTimeZone,
    now,
    rangeStartKey: meta.rangeStart,
    rangeEndKey: meta.rangeEnd,
  }).filter((s) => parseInstant(s.start).getTime() >= afterExclusiveEnd.getTime());

  const first = slots[0];
  if (!first) return null;
  const start = parseInstant(first.start);
  return {
    dateKey: dateKeyInZone(start, visitorTimeZone),
    label: formatShortDate(start, visitorTimeZone),
    slot: first,
  };
}

function resolveRange(
  meta: AvailabilityMeta,
  query: SlotQuery,
  now: Date,
): { start: Date; end: Date } {
  const visitorZone = query.visitorTimeZone;

  if (query.rangeStartKey && query.rangeEndKey) {
    return {
      start: dateKeyToUtcStart(query.rangeStartKey, visitorZone),
      end: dateKeyToUtcStart(query.rangeEndKey, visitorZone),
    };
  }

  if (query.preset === 'this-week') {
    const weekStart = startOfWeekMondayInZone(now, visitorZone);
    const weekEnd = addDaysInZone(weekStart, 6, visitorZone);
    const today = startOfDayInZone(now, visitorZone);
    return {
      start: today.getTime() > weekStart.getTime() ? today : weekStart,
      end: weekEnd,
    };
  }

  if (query.preset === 'next-week') {
    const thisMonday = startOfWeekMondayInZone(now, visitorZone);
    const nextMonday = addDaysInZone(thisMonday, 7, visitorZone);
    const nextSunday = addDaysInZone(nextMonday, 6, visitorZone);
    return { start: nextMonday, end: nextSunday };
  }

  // Default: full meta range (in host zone keys, but interpret as calendar dates)
  return {
    start: dateKeyToUtcStart(meta.rangeStart, meta.timeZone),
    end: dateKeyToUtcStart(meta.rangeEnd, meta.timeZone),
  };
}

function dateKeyToUtcStart(dateKey: string, timeZone: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return zonedLocalToUtc(y, m, d, 0, timeZone);
}

/** Exported for tests: check overlap helper re-export */
export type { MsInterval };

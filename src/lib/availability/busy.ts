import type { BusyInterval } from './types';
import { endOfDayInZone, parseInstant, startOfDayInZone } from './time';

export type MsInterval = { startMs: number; endMs: number };

/**
 * Merge overlapping or touching busy intervals into a minimal set.
 */
export function mergeBusyIntervals(intervals: MsInterval[]): MsInterval[] {
  if (!intervals.length) return [];
  const sorted = [...intervals]
    .filter((i) => i.endMs > i.startMs)
    .sort((a, b) => a.startMs - b.startMs);
  if (!sorted.length) return [];

  const out: MsInterval[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const last = out[out.length - 1];
    if (cur.startMs <= last.endMs) {
      last.endMs = Math.max(last.endMs, cur.endMs);
    } else {
      out.push({ ...cur });
    }
  }
  return out;
}

export type RawBusyEvent = {
  eventStart?: string;
  eventEnd?: string;
  free?: boolean;
  allDay?: boolean;
};

/**
 * Turn Reclaim-like events into merged busy intervals.
 * - Ignores free=true
 * - Treats free=false (or missing free) as busy when times exist
 * - All-day busy blocks the whole local calendar day in `timeZone`
 * - Duplicates across calendars collapse via merge
 */
export function eventsToMergedBusy(
  events: RawBusyEvent[],
  timeZone: string,
): BusyInterval[] {
  const intervals: MsInterval[] = [];

  for (const event of events) {
    if (event.free === true) continue;
    if (!event.eventStart || !event.eventEnd) continue;

    try {
      if (event.allDay) {
        const start = parseInstant(event.eventStart);
        // Some APIs use exclusive end for all-day (next midnight).
        // Block every local day the event covers in Jesse's zone.
        let cursor = startOfDayInZone(start, timeZone);
        const endInstant = parseInstant(event.eventEnd);
        // If end is midnight exclusive and equals a day start, stop before that day.
        const endDayStart = startOfDayInZone(endInstant, timeZone);
        const endIsExclusiveMidnight =
          endDayStart.getTime() === endInstant.getTime() &&
          endInstant.getTime() > start.getTime();

        const lastDay = endIsExclusiveMidnight
          ? new Date(endDayStart.getTime() - 1)
          : endInstant;

        const lastStart = startOfDayInZone(lastDay, timeZone);
        while (cursor.getTime() <= lastStart.getTime()) {
          const dayEnd = endOfDayInZone(cursor, timeZone);
          intervals.push({ startMs: cursor.getTime(), endMs: dayEnd.getTime() });
          cursor = dayEnd;
        }
      } else {
        const startMs = parseInstant(event.eventStart).getTime();
        const endMs = parseInstant(event.eventEnd).getTime();
        if (endMs > startMs) {
          intervals.push({ startMs, endMs });
        }
      }
    } catch {
      // Skip malformed events rather than failing the whole response.
      continue;
    }
  }

  return mergeBusyIntervals(intervals).map((i) => ({
    start: new Date(i.startMs).toISOString(),
    end: new Date(i.endMs).toISOString(),
  }));
}

export function busyToMs(busy: BusyInterval[]): MsInterval[] {
  return busy.map((b) => ({
    startMs: parseInstant(b.start).getTime(),
    endMs: parseInstant(b.end).getTime(),
  }));
}

export function overlapsBusy(
  startMs: number,
  endMs: number,
  busy: MsInterval[],
): boolean {
  for (const b of busy) {
    if (startMs < b.endMs && endMs > b.startMs) return true;
  }
  return false;
}

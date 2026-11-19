import { AVAILABILITY_SCHEDULE } from '../../config/availability';
import { eventsToMergedBusy, type RawBusyEvent } from './busy';
import {
  addDaysInZone,
  dateKeyInZone,
  startOfDayInZone,
  zonedLocalToUtc,
} from './time';
import type { AvailabilitySuccess } from './types';

const TZ = AVAILABILITY_SCHEDULE.timeZone;

/**
 * Realistic Reclaim-shaped events for local/dev screenshots.
 * Includes duplicates across "calendars", a free event, timed busy, and all-day OOO.
 */
export function buildMockReclaimEvents(now = new Date()): RawBusyEvent[] {
  const today = startOfDayInZone(now, TZ);
  const day = (offset: number) => addDaysInZone(today, offset, TZ);

  const timed = (
    offset: number,
    startMin: number,
    endMin: number,
    free = false,
  ): RawBusyEvent => {
    const d = day(offset);
    const p = dateKeyInZone(d, TZ).split('-').map(Number);
    const start = zonedLocalToUtc(p[0], p[1], p[2], startMin, TZ);
    const end = zonedLocalToUtc(p[0], p[1], p[2], endMin, TZ);
    return {
      eventStart: start.toISOString(),
      eventEnd: end.toISOString(),
      free,
      allDay: false,
      // Intentionally include fields the API must strip before responding
      title: 'Private meeting',
      calendarId: 'cal-personal',
    } as RawBusyEvent & { title?: string; calendarId?: string };
  };

  const allDay = (offset: number): RawBusyEvent => {
    const start = day(offset);
    const end = day(offset + 1);
    return {
      eventStart: start.toISOString(),
      eventEnd: end.toISOString(),
      free: false,
      allDay: true,
      title: 'OOO',
      calendarId: 'cal-work',
    } as RawBusyEvent & { title?: string; calendarId?: string };
  };

  // Spread busy across the next few weeks with some open pockets.
  const events: RawBusyEvent[] = [
    timed(0, 9 * 60, 10 * 60),
    timed(0, 11 * 60, 12 * 60),
    // Duplicate of the same block from another calendar (must merge)
    timed(0, 11 * 60, 12 * 60),
    timed(1, 9 * 60 + 30, 10 * 60 + 30),
    timed(1, 13 * 60, 14 * 60),
    timed(2, 10 * 60, 11 * 60 + 30),
    // Free hold: ignore
    timed(2, 12 * 60, 12 * 60 + 30, true),
    allDay(3),
    timed(4, 9 * 60, 9 * 60 + 45),
    timed(4, 12 * 60, 13 * 60 + 30),
    timed(7, 9 * 60, 11 * 60),
    timed(7, 11 * 60, 12 * 60), // adjacent → merge
    timed(8, 13 * 60, 14 * 60),
    timed(9, 10 * 60, 10 * 60 + 30),
    timed(10, 9 * 60, 14 * 60), // fully busy open window
    timed(14, 9 * 60 + 30, 11 * 60),
    timed(15, 12 * 60, 13 * 60),
    timed(16, 9 * 60, 10 * 60),
    timed(21, 11 * 60, 12 * 60 + 30),
    timed(22, 9 * 60, 9 * 60 + 30),
  ];

  return events;
}

export function buildMockAvailabilityResponse(
  now = new Date(),
): AvailabilitySuccess {
  const events = buildMockReclaimEvents(now);
  const busy = eventsToMergedBusy(events, TZ);
  const rangeStart = dateKeyInZone(now, TZ);
  const rangeEndDate = addDaysInZone(
    startOfDayInZone(now, TZ),
    AVAILABILITY_SCHEDULE.lookAheadDays,
    TZ,
  );
  const rangeEnd = dateKeyInZone(rangeEndDate, TZ);

  return {
    ok: true,
    busy,
    source: 'mock',
    meta: {
      timeZone: AVAILABILITY_SCHEDULE.timeZone,
      timeZoneLabel: AVAILABILITY_SCHEDULE.timeZoneLabel,
      openHours: {
        startMinutes: AVAILABILITY_SCHEDULE.openHours.startMinutes,
        endMinutes: AVAILABILITY_SCHEDULE.openHours.endMinutes,
      },
      weekdays: [...AVAILABILITY_SCHEDULE.weekdays],
      lookAheadDays: AVAILABILITY_SCHEDULE.lookAheadDays,
      minNoticeMinutes: AVAILABILITY_SCHEDULE.minNoticeMinutes,
      slotIntervalMinutes: AVAILABILITY_SCHEDULE.slotIntervalMinutes,
      rangeStart,
      rangeEnd,
      generatedAt: now.toISOString(),
    },
  };
}

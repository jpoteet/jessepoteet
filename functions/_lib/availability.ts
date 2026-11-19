/**
 * Server-side availability helpers for the Pages Function.
 * Imports shared merge/schedule logic from the Astro src tree.
 */

import { AVAILABILITY_SCHEDULE } from '../../src/config/availability';
import { eventsToMergedBusy, type RawBusyEvent } from '../../src/lib/availability/busy';
import { buildMockAvailabilityResponse } from '../../src/lib/availability/mock';
import {
  addDaysInZone,
  dateKeyInZone,
  startOfDayInZone,
} from '../../src/lib/availability/time';
import type {
  AvailabilityError,
  AvailabilitySuccess,
} from '../../src/lib/availability/types';

export const CACHE_SECONDS = 7 * 60; // ~7 minutes (within 5–10)

export type Env = {
  RECLAIM_API_TOKEN?: string;
  /** Dev/preview only. Never set on production. */
  ALLOW_MOCK_AVAILABILITY?: string;
};

const RECLAIM_EVENTS_URL = 'https://api.app.reclaim.ai/api/events';

export function isMockAllowed(env: Env): boolean {
  const flag = (env.ALLOW_MOCK_AVAILABILITY || '').trim().toLowerCase();
  return flag === '1' || flag === 'true' || flag === 'yes';
}

export function buildMeta(now: Date) {
  const tz = AVAILABILITY_SCHEDULE.timeZone;
  const rangeStart = dateKeyInZone(now, tz);
  const rangeEndDate = addDaysInZone(
    startOfDayInZone(now, tz),
    AVAILABILITY_SCHEDULE.lookAheadDays,
    tz,
  );
  return {
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
    rangeEnd: dateKeyInZone(rangeEndDate, tz),
    generatedAt: now.toISOString(),
  };
}

export async function fetchReclaimBusy(
  token: string,
  now = new Date(),
): Promise<AvailabilitySuccess> {
  const tz = AVAILABILITY_SCHEDULE.timeZone;
  const start = dateKeyInZone(now, tz);
  const end = dateKeyInZone(
    addDaysInZone(
      startOfDayInZone(now, tz),
      AVAILABILITY_SCHEDULE.lookAheadDays,
      tz,
    ),
    tz,
  );

  const url = new URL(RECLAIM_EVENTS_URL);
  url.searchParams.set('start', start);
  url.searchParams.set('end', end);
  url.searchParams.set('allConnected', 'true');

  const upstream = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    console.error('Reclaim events failed', upstream.status, detail.slice(0, 300));
    throw new Error(`Reclaim returned ${upstream.status}`);
  }

  const payload = (await upstream.json()) as unknown;
  if (!Array.isArray(payload)) {
    console.error('Reclaim events: expected array');
    throw new Error('Unexpected Reclaim response shape');
  }

  // Strip everything except busy intervals. Never forward titles, attendees, etc.
  const busy = eventsToMergedBusy(payload as RawBusyEvent[], tz);

  return {
    ok: true,
    busy,
    source: 'reclaim',
    meta: buildMeta(now),
  };
}

export function mockSuccess(now = new Date()): AvailabilitySuccess {
  return buildMockAvailabilityResponse(now);
}

export function unavailable(
  error: string,
  message =
    'Availability is unavailable right now. Try again in a few minutes.',
): AvailabilityError {
  return { ok: false, error, message };
}

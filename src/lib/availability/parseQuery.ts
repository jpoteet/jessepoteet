import * as chrono from 'chrono-node';
import type { TimeOfDayFilter, WindowPreset } from './types';
import { dateKeyInZone } from './time';

export type ParsedAsk = {
  ok: true;
  durationMinutes: number;
  timeOfDay: TimeOfDayFilter;
  windowPreset: WindowPreset;
  rangeStartKey?: string;
  rangeEndKey?: string;
  chips: { id: string; label: string; kind: 'duration' | 'window' | 'tod' }[];
  summary: string;
};

export type FailedAsk = {
  ok: false;
  message: string;
};

export type AskResult = ParsedAsk | FailedAsk;

const DURATION_CANDIDATES = [15, 30, 60, 90] as const;

/**
 * Parse a plain-English availability ask into duration / window / time-of-day.
 * Client-side only. No network calls.
 */
export function parseAvailabilityAsk(
  raw: string,
  opts: { visitorTimeZone: string; now?: Date; durations?: readonly number[] },
): AskResult {
  const text = raw.trim().replace(/\s+/g, ' ');
  if (!text) {
    return {
      ok: false,
      message: 'Type something like “30 min this week before noon”.',
    };
  }

  const lower = text.toLowerCase();
  const now = opts.now ?? new Date();
  const durations = opts.durations ?? DURATION_CANDIDATES;
  const zone = opts.visitorTimeZone;

  const durationMinutes = detectDuration(lower, durations);
  if (!durationMinutes) {
    return {
      ok: false,
      message:
        'I could not tell the meeting length. Try 15, 30, 60, or 90 minutes. Example: “an hour next Tuesday afternoon”.',
    };
  }

  const timeOfDay = detectTimeOfDay(lower);
  const windowing = detectWindow(lower, text, now, zone);

  if (!windowing) {
    return {
      ok: false,
      message:
        'I could not tell when to look. Try “this week”, “next week”, or a day like “next Tuesday”.',
    };
  }

  const chips: ParsedAsk['chips'] = [
    {
      id: 'duration',
      kind: 'duration',
      label: `${durationMinutes} min`,
    },
    {
      id: 'window',
      kind: 'window',
      label: windowing.label,
    },
  ];
  if (timeOfDay !== 'all') {
    chips.push({
      id: 'tod',
      kind: 'tod',
      label: timeOfDay === 'morning' ? 'Morning' : 'Afternoon',
    });
  }

  return {
    ok: true,
    durationMinutes,
    timeOfDay,
    windowPreset: windowing.preset,
    rangeStartKey: windowing.rangeStartKey,
    rangeEndKey: windowing.rangeEndKey,
    chips,
    summary: chips.map((c) => c.label).join(' · '),
  };
}

function detectDuration(lower: string, durations: readonly number[]): number | null {
  if (/\b(90|ninety)\b/.test(lower) || /hour and a half|1\.5\s*hours?|an hour and a half/.test(lower)) {
    return pick(90, durations);
  }
  if (/\b(60|sixty)\b/.test(lower) || /\b(an|one|1)\s*hours?\b/.test(lower) || /\ban hour\b/.test(lower)) {
    return pick(60, durations);
  }
  if (/\b(30|thirty)\b/.test(lower) || /half[\s-]?hour|30\s*min/.test(lower)) {
    return pick(30, durations);
  }
  if (/\b(15|fifteen)\b/.test(lower) || /quarter[\s-]?hour|15\s*min/.test(lower)) {
    return pick(15, durations);
  }
  const minMatch = lower.match(/(\d{1,3})\s*(min|mins|minutes?)\b/);
  if (minMatch) {
    const n = Number(minMatch[1]);
    return pickClosest(n, durations);
  }
  const hourMatch = lower.match(/(\d+(?:\.\d+)?)\s*hours?\b/);
  if (hourMatch) {
    const mins = Math.round(Number(hourMatch[1]) * 60);
    return pickClosest(mins, durations);
  }
  return null;
}

function detectTimeOfDay(lower: string): TimeOfDayFilter {
  if (
    /\bmorning\b/.test(lower) ||
    /before\s+noon/.test(lower) ||
    /before\s+12/.test(lower) ||
    /am\b/.test(lower)
  ) {
    return 'morning';
  }
  if (
    /\bafternoon\b/.test(lower) ||
    /\bevening\b/.test(lower) ||
    /after\s+noon/.test(lower) ||
    /pm\b/.test(lower)
  ) {
    return 'afternoon';
  }
  return 'all';
}

function detectWindow(
  lower: string,
  original: string,
  now: Date,
  zone: string,
):
  | {
      preset: WindowPreset;
      label: string;
      rangeStartKey?: string;
      rangeEndKey?: string;
    }
  | null {
  if (/this\s+week/.test(lower)) {
    return { preset: 'this-week', label: 'This week' };
  }
  if (/next\s+week/.test(lower) || /sometime\s+next\s+week/.test(lower)) {
    return { preset: 'next-week', label: 'Next week' };
  }

  // Prefer chrono with forwardDate so "next Tuesday" lands in the future.
  const results = chrono.parse(original, now, { forwardDate: true });
  if (!results.length) {
    // Default soft fallback when duration+tod exist but no date words
    if (/soon|whenever|anytime|any time/.test(lower)) {
      return { preset: 'this-week', label: 'This week' };
    }
    return { preset: 'this-week', label: 'This week' };
  }

  const start = results[0].start.date();
  const end = results[0].end?.date() ?? start;
  const startKey = dateKeyInZone(start, zone);
  const endKey = dateKeyInZone(end, zone);

  const safeLabel =
    startKey === endKey
      ? formatChipDay(start, zone)
      : `${formatChipDay(start, zone)} to ${formatChipDay(end, zone)}`;

  return {
    preset: 'custom',
    label: safeLabel,
    rangeStartKey: startKey,
    rangeEndKey: endKey,
  };
}

function formatChipDay(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function pick(n: number, durations: readonly number[]): number | null {
  return durations.includes(n) ? n : pickClosest(n, durations);
}

function pickClosest(n: number, durations: readonly number[]): number | null {
  if (!durations.length) return null;
  let best = durations[0];
  let bestDist = Math.abs(best - n);
  for (const d of durations) {
    const dist = Math.abs(d - n);
    if (dist < bestDist) {
      best = d;
      bestDist = dist;
    }
  }
  // Reject wildly off values
  if (bestDist > 20 && !durations.includes(n)) {
    // still map 45->30/60 etc within 20... 45 is 15 from 30; ok
    if (bestDist > 25) return null;
  }
  return best;
}

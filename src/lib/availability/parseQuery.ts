import * as chrono from 'chrono-node';
import type { TimeOfDayFilter, WindowPreset } from './types';
import {
  addDaysInZone,
  dateKeyInZone,
  getZonedParts,
  startOfDayInZone,
  startOfWeekMondayInZone,
  zonedLocalToUtc,
} from './time';

export type ParsedAsk = {
  ok: true;
  durationMinutes: number;
  timeOfDay: TimeOfDayFilter;
  windowPreset: WindowPreset;
  rangeStartKey?: string;
  rangeEndKey?: string;
  chips: { id: string; label: string; kind: 'duration' | 'window' | 'tod' }[];
  summary: string;
  /** True when the ask named a calendar month / week-of-month style window. */
  namedMonthWindow?: boolean;
};

export type FailedAsk = {
  ok: false;
  message: string;
};

export type AskResult = ParsedAsk | FailedAsk;

const DURATION_CANDIDATES = [15, 30, 60, 90] as const;

const MONTH_NAMES: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

const ORDINAL_WEEK: Record<string, number | 'last'> = {
  first: 1,
  '1st': 1,
  second: 2,
  '2nd': 2,
  third: 3,
  '3rd': 3,
  fourth: 4,
  '4th': 4,
  fifth: 5,
  '5th': 5,
  last: 'last',
};

/**
 * True when the ask names a month/week window the local parser should own
 * over a disagreeing AI range.
 */
export function hasMonthWeekPhrase(text: string): boolean {
  const lower = text.toLowerCase();
  if (
    /\b(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|last)\s+week\s+of\s+[a-z]+/.test(
      lower,
    )
  ) {
    return true;
  }
  if (/\bweek\s+of\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|[a-z]+|\d)/.test(lower)) {
    return true;
  }
  if (/\b(early|mid|middle|late)\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|[a-z]+)/.test(lower)) {
    return true;
  }
  if (/\bnext\s+month\b/.test(lower)) return true;
  // Bare "December" / "in December" without a day number still counts as a month window.
  if (
    /\b(in\s+|for\s+|during\s+)?(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/.test(
      lower,
    ) &&
    !/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}\b/.test(lower)
  ) {
    // Exclude if it's only a weekday phrase with no month intent beyond chrono day.
    if (/\b(week|early|mid|late|month)\b/.test(lower) || Object.keys(MONTH_NAMES).some((m) => new RegExp(`\\b${m}\\b`).test(lower))) {
      return /\b(january|february|march|april|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/.test(
        lower,
      );
    }
  }
  return false;
}

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

  // Default to 30 when the user says "anything" / "sometime" without a length.
  const durationMinutes =
    detectDuration(lower, durations) ||
    (/\b(anything|anytime|any time|sometime|whenever|quick)\b/.test(lower)
      ? pick(30, durations)
      : null);
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
    namedMonthWindow: windowing.namedMonthWindow,
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

type WindowHit = {
  preset: WindowPreset;
  label: string;
  rangeStartKey?: string;
  rangeEndKey?: string;
  namedMonthWindow?: boolean;
};

function detectWindow(
  lower: string,
  original: string,
  now: Date,
  zone: string,
): WindowHit | null {
  if (/this\s+week/.test(lower)) {
    return { preset: 'this-week', label: 'This week' };
  }
  if (
    (/next\s+week/.test(lower) || /sometime\s+next\s+week/.test(lower)) &&
    !/next\s+\d+\s+weeks?/.test(lower)
  ) {
    return { preset: 'next-week', label: 'Next week' };
  }

  // "next 3 weeks" / "sometime in the next 3 weeks" / "coming weeks"
  const weeksMatch = lower.match(
    /(?:sometime\s+in\s+the\s+)?next\s+(\d{1,2})\s+weeks?/,
  );
  if (weeksMatch || /next\s+few\s+weeks|coming\s+weeks/.test(lower)) {
    const n = weeksMatch ? Math.min(8, Math.max(1, Number(weeksMatch[1]))) : 3;
    const startKey = dateKeyInZone(now, zone);
    const endKey = dateKeyInZone(
      addDaysInZone(startOfDayInZone(now, zone), n * 7, zone),
      zone,
    );
    return {
      preset: 'custom',
      label: `Next ${n} week${n === 1 ? '' : 's'}`,
      rangeStartKey: startKey,
      rangeEndKey: endKey,
    };
  }

  if (/\btomorrow\b/.test(lower)) {
    const key = dateKeyInZone(addDaysInZone(startOfDayInZone(now, zone), 1, zone), zone);
    return {
      preset: 'custom',
      label: 'Tomorrow',
      rangeStartKey: key,
      rangeEndKey: key,
    };
  }

  const monthWindow = detectMonthWeekWindow(lower, now, zone);
  if (monthWindow) return monthWindow;

  // Prefer chrono with forwardDate so "next Tuesday" lands in the future.
  // Skip duration-only hits ("an hour", "30 min") so the date fragment wins.
  const results = chrono.parse(original, now, { forwardDate: true }).filter((r) => {
    const frag = (r.text || '').toLowerCase().trim();
    if (!frag) return false;
    if (/^\d+\s*(min|mins|minutes?|hours?|hrs?)$/.test(frag)) return false;
    if (/^(an|one|a)\s+hour$/.test(frag)) return false;
    if (/^(half[\s-]?hour|quarter[\s-]?hour)$/.test(frag)) return false;
    return true;
  });
  if (!results.length) {
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

function detectMonthWeekWindow(lower: string, now: Date, zone: string): WindowHit | null {
  // "second week of December" / "last week of Dec"
  const ordinalWeek = lower.match(
    /\b(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|last)\s+week\s+of\s+([a-z]+)\b/,
  );
  if (ordinalWeek) {
    const ord = ORDINAL_WEEK[ordinalWeek[1]];
    const month = MONTH_NAMES[ordinalWeek[2]];
    if (ord != null && month) {
      const year = resolveYearForMonth(now, zone, month);
      const weeks = mondayWeeksIntersectingMonth(year, month, zone);
      if (!weeks.length) return null;
      const idx = ord === 'last' ? weeks.length - 1 : ord - 1;
      const week = weeks[Math.min(Math.max(idx, 0), weeks.length - 1)];
      return weekHit(week.monday, zone, `${capitalize(ordinalWeek[1])} week of ${monthLabel(month)}`);
    }
  }

  // "week of Dec 14" / "week of December 14"
  const weekOf = lower.match(
    /\bweek\s+of\s+(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+)?(\d{1,2})(?:st|nd|rd|th)?\b/,
  );
  if (weekOf) {
    const monthToken = weekOf[1];
    const day = Number(weekOf[2]);
    let month: number;
    let year: number;
    if (monthToken) {
      month = MONTH_NAMES[monthToken];
      year = resolveYearForMonth(now, zone, month);
    } else {
      const parts = getZonedParts(now, zone);
      month = parts.month;
      year = parts.year;
      // If that day already passed this month, roll forward.
      const candidate = zonedLocalToUtc(year, month, day, 12 * 60, zone);
      if (candidate.getTime() < startOfDayInZone(now, zone).getTime()) {
        month += 1;
        if (month > 12) {
          month = 1;
          year += 1;
        }
      }
    }
    if (month && day >= 1 && day <= 31) {
      const anchor = zonedLocalToUtc(year, month, Math.min(day, daysInMonth(year, month)), 12 * 60, zone);
      const monday = startOfWeekMondayInZone(anchor, zone);
      return weekHit(monday, zone, `Week of ${monthLabel(month)} ${day}`);
    }
  }

  // "early / mid / late December"
  const band = lower.match(
    /\b(early|mid|middle|late)\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/,
  );
  if (band) {
    const month = MONTH_NAMES[band[2]];
    if (month) {
      const year = resolveYearForMonth(now, zone, month);
      const last = daysInMonth(year, month);
      let startDay = 1;
      let endDay = last;
      const kind = band[1];
      if (kind === 'early') {
        startDay = 1;
        endDay = Math.min(10, last);
      } else if (kind === 'mid' || kind === 'middle') {
        startDay = Math.min(11, last);
        endDay = Math.min(20, last);
      } else {
        startDay = Math.min(21, last);
        endDay = last;
      }
      const start = zonedLocalToUtc(year, month, startDay, 0, zone);
      const end = zonedLocalToUtc(year, month, endDay, 0, zone);
      return {
        preset: 'custom',
        label: `${capitalize(kind === 'middle' ? 'mid' : kind)} ${monthLabel(month)}`,
        rangeStartKey: dateKeyInZone(start, zone),
        rangeEndKey: dateKeyInZone(end, zone),
        namedMonthWindow: true,
      };
    }
  }

  // "next month"
  if (/\bnext\s+month\b/.test(lower)) {
    const parts = getZonedParts(now, zone);
    let month = parts.month + 1;
    let year = parts.year;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    const start = zonedLocalToUtc(year, month, 1, 0, zone);
    const end = zonedLocalToUtc(year, month, daysInMonth(year, month), 0, zone);
    return {
      preset: 'custom',
      label: monthLabel(month),
      rangeStartKey: dateKeyInZone(start, zone),
      rangeEndKey: dateKeyInZone(end, zone),
      namedMonthWindow: true,
    };
  }

  // Bare month name: "in December" / "December" → whole month
  const bareMonth = lower.match(
    /\b(?:in|for|during|sometime\s+in)?\s*(january|february|march|april|may|june|july|august|september|october|november|december)\b/,
  );
  if (bareMonth && !/\b(week|early|mid|late)\b/.test(lower)) {
    // Avoid stealing "December 14" day phrases (chrono handles those).
    if (!/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b/.test(lower)) {
      const month = MONTH_NAMES[bareMonth[1]];
      if (month) {
        const year = resolveYearForMonth(now, zone, month);
        const start = zonedLocalToUtc(year, month, 1, 0, zone);
        const end = zonedLocalToUtc(year, month, daysInMonth(year, month), 0, zone);
        return {
          preset: 'custom',
          label: monthLabel(month),
          rangeStartKey: dateKeyInZone(start, zone),
          rangeEndKey: dateKeyInZone(end, zone),
          namedMonthWindow: true,
        };
      }
    }
  }

  return null;
}

/** Monday-start weeks that intersect the civil month, ordered by Monday. */
function mondayWeeksIntersectingMonth(
  year: number,
  month: number,
  zone: string,
): { monday: Date }[] {
  const first = zonedLocalToUtc(year, month, 1, 12 * 60, zone);
  const last = zonedLocalToUtc(year, month, daysInMonth(year, month), 12 * 60, zone);
  let monday = startOfWeekMondayInZone(first, zone);
  const weeks: { monday: Date }[] = [];
  // Walk until Monday is past the last day of the month.
  for (let i = 0; i < 8; i++) {
    const friday = addDaysInZone(monday, 4, zone);
    const monKey = dateKeyInZone(monday, zone);
    const friKey = dateKeyInZone(friday, zone);
    const monthStart = dateKeyInZone(first, zone);
    const monthEnd = dateKeyInZone(last, zone);
    if (friKey >= monthStart && monKey <= monthEnd) {
      weeks.push({ monday });
    }
    if (monKey > monthEnd) break;
    monday = addDaysInZone(monday, 7, zone);
  }
  return weeks;
}

function weekHit(monday: Date, zone: string, label: string): WindowHit {
  const friday = addDaysInZone(monday, 4, zone);
  return {
    preset: 'custom',
    label,
    rangeStartKey: dateKeyInZone(monday, zone),
    rangeEndKey: dateKeyInZone(friday, zone),
    namedMonthWindow: true,
  };
}

function resolveYearForMonth(now: Date, zone: string, month: number): number {
  const parts = getZonedParts(now, zone);
  // If the month has fully ended, roll to next year.
  if (month < parts.month) return parts.year + 1;
  if (month > parts.month) return parts.year;
  return parts.year;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function monthLabel(month: number): string {
  return [
    '',
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ][month];
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
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
    if (bestDist > 25) return null;
  }
  return best;
}

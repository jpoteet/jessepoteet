/** Time zone helpers that work in browsers and Cloudflare Workers. */

const pad = (n: number) => String(n).padStart(2, '0');

export function parseInstant(iso: string): Date {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${iso}`);
  }
  return d;
}

/**
 * Format a Date as YYYY-MM-DD in a given IANA time zone.
 */
export function dateKeyInZone(date: Date, timeZone: string): string {
  const parts = getZonedParts(date, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

/**
 * Minutes from local midnight in the given time zone.
 */
export function minutesInZone(date: Date, timeZone: string): number {
  const parts = getZonedParts(date, timeZone);
  return parts.hour * 60 + parts.minute;
}

/**
 * Weekday in the given zone: 0=Sunday … 6=Saturday (JS style).
 * Schedule config uses 1=Monday … 5=Friday.
 */
export function weekdayInZone(date: Date, timeZone: string): number {
  // en-US with weekday long, then map
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[label] ?? date.getUTCDay();
}

/**
 * Convert a local civil date + minutes-from-midnight in `timeZone` to a UTC Date.
 */
export function zonedLocalToUtc(
  year: number,
  month: number,
  day: number,
  minutesFromMidnight: number,
  timeZone: string,
): Date {
  const hour = Math.floor(minutesFromMidnight / 60);
  const minute = minutesFromMidnight % 60;
  // Guess UTC, then correct by the zone offset at that instant.
  let utc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offsetMs = getTimeZoneOffsetMs(utc, timeZone);
  utc = new Date(utc.getTime() - offsetMs);
  // DST boundaries: re-check once
  const offset2 = getTimeZoneOffsetMs(utc, timeZone);
  if (offset2 !== offsetMs) {
    utc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0) - offset2);
  }
  return utc;
}

/**
 * Offset of `timeZone` relative to UTC at `date`, in milliseconds.
 * Positive when the zone is ahead of UTC (e.g. Denver in summer ≈ -6h → negative).
 * Returns (zonedWallClockAsUtc - actualUtc).
 */
export function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - date.getTime();
}

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const bag: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== 'literal') bag[part.type] = part.value;
  }
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour: Number(bag.hour),
    minute: Number(bag.minute),
    second: Number(bag.second),
  };
}

/** Start of local calendar day (00:00) in zone, as UTC Date. */
export function startOfDayInZone(date: Date, timeZone: string): Date {
  const p = getZonedParts(date, timeZone);
  return zonedLocalToUtc(p.year, p.month, p.day, 0, timeZone);
}

/** Exclusive end of local calendar day (next midnight) in zone. */
export function endOfDayInZone(date: Date, timeZone: string): Date {
  const p = getZonedParts(date, timeZone);
  // Add one day via UTC noon trick to avoid DST issues on the day itself
  const noon = zonedLocalToUtc(p.year, p.month, p.day, 12 * 60, timeZone);
  const next = new Date(noon.getTime() + 24 * 60 * 60 * 1000);
  const np = getZonedParts(next, timeZone);
  return zonedLocalToUtc(np.year, np.month, np.day, 0, timeZone);
}

/** Add calendar days in a zone (keeps civil date arithmetic stable). */
export function addDaysInZone(date: Date, days: number, timeZone: string): Date {
  const p = getZonedParts(date, timeZone);
  const noon = zonedLocalToUtc(p.year, p.month, p.day, 12 * 60, timeZone);
  const shifted = new Date(noon.getTime() + days * 24 * 60 * 60 * 1000);
  const sp = getZonedParts(shifted, timeZone);
  return zonedLocalToUtc(sp.year, sp.month, sp.day, p.hour * 60 + p.minute, timeZone);
}

/**
 * Monday 00:00 of the week containing `date` in `timeZone`.
 * Weeks are Monday–Sunday.
 */
export function startOfWeekMondayInZone(date: Date, timeZone: string): Date {
  const start = startOfDayInZone(date, timeZone);
  const wd = weekdayInZone(start, timeZone); // 0 Sun … 6 Sat
  const daysFromMonday = wd === 0 ? 6 : wd - 1;
  return addDaysInZone(start, -daysFromMonday, timeZone);
}

export function detectVisitorTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function formatTimeInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatDayHeading(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatShortDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function friendlyZoneName(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'long',
    }).formatToParts(new Date());
    const name = parts.find((p) => p.type === 'timeZoneName')?.value;
    if (name) return name;
  } catch {
    /* fall through */
  }
  return timeZone.replace(/_/g, ' ');
}

/** Short zone label for tight UI (CST, MT, PDT). */
export function shortZoneAbbr(timeZone: string, at: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short',
    }).formatToParts(at);
    const name = parts.find((p) => p.type === 'timeZoneName')?.value;
    if (name) {
      // Normalize "GMT-7" style leftovers to a readable fallback.
      if (/^GMT/i.test(name)) return friendlyZoneName(timeZone).replace(/ Time$/i, '');
      return name;
    }
  } catch {
    /* fall through */
  }
  return friendlyZoneName(timeZone);
}

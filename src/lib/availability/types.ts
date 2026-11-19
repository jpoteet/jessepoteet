export type BusyInterval = {
  /** ISO-8601 instant (with offset or Z) */
  start: string;
  /** ISO-8601 instant (with offset or Z) */
  end: string;
};

export type OpenHoursConfig = {
  /** Minutes from local midnight, inclusive (e.g. 540 = 9:00 AM) */
  startMinutes: number;
  /** Minutes from local midnight, exclusive (e.g. 840 = 2:00 PM) */
  endMinutes: number;
};

export type AvailabilityMeta = {
  timeZone: string;
  timeZoneLabel: string;
  openHours: OpenHoursConfig;
  weekdays: number[];
  lookAheadDays: number;
  minNoticeMinutes: number;
  slotIntervalMinutes: number;
  rangeStart: string;
  rangeEnd: string;
  generatedAt: string;
};

export type AvailabilitySuccess = {
  ok: true;
  busy: BusyInterval[];
  meta: AvailabilityMeta;
  source: 'reclaim' | 'mock';
};

export type AvailabilityError = {
  ok: false;
  error: string;
  message: string;
};

export type AvailabilityResponse = AvailabilitySuccess | AvailabilityError;

export type Slot = {
  /** ISO start instant */
  start: string;
  /** ISO end instant */
  end: string;
  /** Duration in minutes */
  durationMinutes: number;
};

export type DayGroup = {
  /** YYYY-MM-DD in the visitor's time zone */
  dateKey: string;
  /** Friendly weekday + date label in the visitor's time zone */
  label: string;
  slots: Slot[];
};

export type TimeOfDayFilter = 'all' | 'morning' | 'afternoon';

export type WindowPreset = 'this-week' | 'next-week' | 'custom';

/**
 * Availability page profiles.
 *
 * The public personal page uses `personal`. Future branded pages
 * (different URL, colors, logo, booking link) can add another profile
 * without changing the slot engine. The personal page must never link
 * to brand pages.
 */

export type AvailabilityProfile = {
  /** URL path segment, e.g. "availability" → /availability */
  slug: string;
  /** Display name shown to visitors */
  displayName: string;
  /** Short page description for meta tags */
  description: string;
  /** Eyebrow above the headline */
  eyebrow: string;
  /** Page headline */
  headline: string;
  /** Supporting sentence under the headline */
  lead: string;
  /** Reclaim (or other) booking page. Display-only link; no booking on-site. */
  bookingUrl: string;
  /** Label for the booking CTA */
  bookingCta: string;
  /** Meeting lengths offered, in minutes */
  durations: readonly number[];
  /** Default duration when the page loads */
  defaultDuration: number;
  /**
   * Optional brand chrome for future branded URLs.
   * Leave unset on the personal profile.
   */
  brand?: {
    accent?: string;
    logoSrc?: string;
    logoAlt?: string;
  };
};

/** Jesse's open meeting hours and calendar rules (America/Denver). Easy to tweak. */
export const AVAILABILITY_SCHEDULE = {
  /** IANA timezone for Jesse's calendar and open hours */
  timeZone: 'America/Denver',
  /** Friendly label shown next to the visitor's auto-detected zone */
  timeZoneLabel: 'Mountain Time',
  /** Weekday open window in local time (America/Denver). End is exclusive. */
  openHours: {
    /** 9:00 AM */
    startMinutes: 9 * 60,
    /** 2:00 PM */
    endMinutes: 14 * 60,
  },
  /** Monday=1 … Friday=5. No weekend slots. */
  weekdays: [1, 2, 3, 4, 5] as const,
  /** How far ahead to load busy data and offer slots */
  lookAheadDays: 28,
  /** Do not offer slots starting sooner than this */
  minNoticeMinutes: 120,
  /** Slots start on the hour or half hour only */
  slotIntervalMinutes: 30,
} as const;

export const personalAvailability: AvailabilityProfile = {
  slug: 'availability',
  displayName: 'Jesse Poteet',
  description:
    'See when Jesse Poteet is free and pick a time that works. Times show in your time zone. Booking happens on Jesse’s Reclaim page.',
  eyebrow: 'Availability',
  headline: 'Find a time that works',
  lead: 'Pick a length and a window. I will show open starts in your time zone. When you are ready, head over to book.',
  bookingUrl: 'https://app.reclaim.ai/m/jessepoteet/flexible-quick-meeting',
  bookingCta: 'Book a time',
  durations: [15, 30, 60, 90],
  defaultDuration: 30,
};

/** Profiles keyed by slug. Add branded profiles here later. */
export const availabilityProfiles: Record<string, AvailabilityProfile> = {
  [personalAvailability.slug]: personalAvailability,
};

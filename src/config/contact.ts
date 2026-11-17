import { NEWSLETTER_URL } from './site';

export const REQUEST_TYPES = [
  { value: 'podcast', label: 'Podcast guest', query: 'podcast' },
  { value: 'speaking', label: 'Speaking engagement', query: 'speaking' },
  { value: 'operator-stack', label: 'Operator Stack project', query: 'operator-stack' },
  { value: 'press', label: 'Press/media', query: 'press' },
  { value: 'other', label: 'Other', query: 'other' },
] as const;

export type RequestTypeValue = (typeof REQUEST_TYPES)[number]['value'];

export function resolveRequestType(raw: string | null | undefined): RequestTypeValue | '' {
  if (!raw) return '';
  const normalized = raw.trim().toLowerCase();
  const match = REQUEST_TYPES.find(
    (t) => t.value === normalized || t.query === normalized || t.label.toLowerCase() === normalized,
  );
  return match?.value ?? '';
}

export const workWithMePaths = [
  {
    id: 'podcast',
    title: 'Book Jesse for a podcast or talk',
    description: 'Guest spots, panels, and speaking for print, ops, and owner-run business audiences.',
    href: '/speaking',
    cta: 'See the speaker kit',
  },
  {
    id: 'operator-stack',
    title: 'Hire Operator Stack',
    description: 'Done-for-you systems for owner-run shops. Starts with a free 30-minute process review.',
    href: '/contact?type=operator-stack',
    cta: 'Request a process review',
  },
  {
    id: 'newsletter',
    title: 'Follow the newsletter',
    description: 'Practical notes for print shop owners through Startup Screen Printing.',
    href: NEWSLETTER_URL,
    cta: 'Subscribe',
    external: true,
  },
] as const;

export const talkTopics = [
  {
    title: 'Getting the owner off the press',
    body: 'Why production-dependent ownership caps growth, and how to hand off the floor without losing quality.',
  },
  {
    title: 'Systems for small shops',
    body: 'Practical process design for teams of 2 to 30 that still rely on the founder for every decision.',
  },
  {
    title: 'Marketing automation without the enterprise budget',
    body: 'What owner-run businesses can borrow from Marketo, HubSpot, and Klaviyo work without buying enterprise complexity.',
  },
  {
    title: 'Pricing that protects the shop',
    body: 'Transparent quoting habits that protect margin and free the owner from every one-off estimate. [JESSE: confirm or swap talk topic]',
  },
] as const;

export const speakerBios = {
  short:
    'Jesse Poteet is a designer, printer, and systems builder in Castle Rock, Colorado. He has 25+ years in graphic design, has run a print shop since 2013, and works in enterprise marketing automation for brands like Qualcomm, CVS/Aetna, Honeywell, and Mastercard. Through PrintPro Strategies, Alpine Apparel Co, and Operator Stack, he helps owner-run businesses get off the treadmill.',
  long: `Jesse Poteet lives in Castle Rock, Colorado. He is a Christian whose priorities are faith, family, then entrepreneurship.

He brings 25+ years in graphic design and has been running a print shop since 2013, including time as Director of Art and Production at a commercial print shop. That shop-floor experience still shapes how he teaches and builds tools.

As a Lead Technical Consultant in enterprise marketing automation, Jesse works with Marketo, HubSpot, Klaviyo, CRM systems, email development, and APIs for brands like Qualcomm, CVS/Aetna, Honeywell, and Mastercard. He does not name his employer publicly.

Through PrintPro Strategies he builds education and software for print shop owners, including Startup Screen Printing. Alpine Apparel Co is his Castle Rock production shop. Operator Stack delivers done-for-you systems for owner-run businesses with 2 to 30 people.

Jesse has been featured in The Apparelist and ScreenPrinting.com. He speaks about getting owners off the press, systems for small shops, and practical automation that keeps human judgment in the loop.`,
} as const;

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
    description: 'Guest spots, panels, and speaking for owners, operators, creators, and leadership teams.',
    href: '/speaking',
    cta: 'See the speaker kit',
  },
  {
    id: 'operator-stack',
    title: 'Hire Operator Stack',
    description: 'Done-for-you systems for owner-run businesses with a small team. Starts with a free 30-minute process review.',
    href: '/contact?type=operator-stack',
    cta: 'Request a process review',
  },
  {
    id: 'newsletter',
    title: 'Follow the newsletter',
    description: 'Practical notes for operators who want off the treadmill, published through Startup Screen Printing.',
    href: NEWSLETTER_URL,
    cta: 'Subscribe',
    external: true,
  },
] as const;

export const talkTopics = [
  {
    title: 'Getting the owner out of the bottleneck',
    body: 'Why businesses stall when everything still needs the founder, and how to hand work off without losing quality.',
  },
  {
    title: 'Systems for owner-run teams',
    body: 'Practical process design for businesses with 2 to 30 people that still rely on one person for every decision.',
  },
  {
    title: 'Marketing automation without the enterprise budget',
    body: 'What growing companies can borrow from Marketo, HubSpot, and Klaviyo work without buying enterprise complexity.',
  },
  {
    title: 'Building something that serves your family',
    body: 'How operators and creators design for profit, freedom, and repeatable work instead of endless hustle.',
  },
] as const;

export const speakerBios = {
  short:
    'Jesse Poteet is a designer, systems builder, and entrepreneur in Castle Rock, Colorado. He has 25+ years in graphic design, has run a print shop since 2013, and works in enterprise marketing automation for brands like Qualcomm, CVS/Aetna, Honeywell, and Mastercard. Through Operator Stack, Alpine Apparel Co, and PrintPro Strategies, he helps owner-run businesses and creators get off the treadmill.',
  long: `Jesse Poteet lives in Castle Rock, Colorado. He is a Christian whose priorities are faith, family, then entrepreneurship.

He brings 25+ years in graphic design. His operating story started on the shop floor: running a print shop since 2013, including time as Director of Art and Production at a commercial print shop. That experience still shapes how he teaches and builds systems for owners in many industries.

As a Lead Technical Consultant in enterprise marketing automation, Jesse works with Marketo, HubSpot, Klaviyo, CRM systems, email development, and APIs for brands like Qualcomm, CVS/Aetna, Honeywell, and Mastercard. He does not name his employer publicly.

Operator Stack delivers done-for-you systems for owner-run businesses with 2 to 30 people, including print and apparel, sign shops, small manufacturers, contractors, and home services. Alpine Apparel Co is his Castle Rock production company. PrintPro Strategies holds education and software that began in print and still serve operators who need to lead, not just produce.

Jesse has been featured in The Apparelist and ScreenPrinting.com. He speaks about getting owners out of the bottleneck, systems for small teams, and practical automation that keeps human judgment in the loop.`,
} as const;

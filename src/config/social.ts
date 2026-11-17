/**
 * Verified profile and brand short links (jpoteet.us).
 * Only URLs confirmed for the live site belong here.
 */
export type SocialLink = {
  id: string;
  label: string;
  href: string;
};

export const socialLinks: SocialLink[] = [
  { id: 'linkedin', label: 'LinkedIn', href: 'https://jpoteet.us/linkedin' },
  { id: 'instagram', label: 'Instagram', href: 'https://jpoteet.us/instagram' },
  { id: 'twitter', label: 'X / Twitter', href: 'https://jpoteet.us/twitter' },
  { id: 'patreon', label: 'Patreon', href: 'https://jpoteet.us/patreon' },
];

/** Brand destinations used in footers and contact. */
export const brandShortLinks: SocialLink[] = [
  { id: 'ssp', label: 'Startup Screen Printing', href: 'https://jpoteet.us/ssp' },
  { id: 'alpine', label: 'Alpine Apparel Co', href: 'https://jpoteet.us/alpine' },
];

export const brandSameAs = [
  'https://jpoteet.us/linkedin',
  'https://jpoteet.us/instagram',
  'https://jpoteet.us/twitter',
  'https://jpoteet.us/patreon',
  'https://jpoteet.us/ssp',
  'https://jpoteet.us/alpine',
  'https://operatorstack.io',
  'https://pricely.ink',
  'https://getgroupkit.com',
  'https://packed.ink',
] as const;

export function getResolvedSameAs(): string[] {
  return [...brandSameAs];
}

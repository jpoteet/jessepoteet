/**
 * Social and profile links used in the footer, contact page, and Person JSON-LD sameAs.
 * Fill in real profiles where marked TODO. Brand site URLs are already set.
 */
export const socialLinks = [
  {
    id: 'youtube',
    label: 'YouTube',
    href: '[JESSE: YouTube URL]',
    sameAs: true,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    href: '[JESSE: LinkedIn URL]',
    sameAs: true,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    href: '[JESSE: Instagram URL]',
    sameAs: true,
  },
  {
    id: 'x',
    label: 'X',
    href: '[JESSE: X/Twitter URL]',
    sameAs: true,
  },
] as const;

/** Brand / project URLs included in Person JSON-LD sameAs. */
export const brandSameAs = [
  'https://alpineapparelco.com',
  'https://operatorstack.io',
  'https://startupscreenprinting.com',
  'https://pricely.ink',
  'https://getgroupkit.com',
  'https://packed.ink',
] as const;
export function getResolvedSameAs(): string[] {
  const social = socialLinks
    .filter((l) => l.sameAs && !l.href.includes('[JESSE:'))
    .map((l) => l.href);
  return [...brandSameAs, ...social];
}

export function isPlaceholderUrl(href: string): boolean {
  return href.includes('[JESSE:');
}

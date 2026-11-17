/**
 * Person JSON-LD sameAs: verified brand URLs only.
 * Personal social profiles are omitted until URLs are confirmed.
 */
export const brandSameAs = [
  'https://alpineapparelco.com',
  'https://operatorstack.io',
  'https://startupscreenprinting.com',
  'https://pricely.ink',
  'https://getgroupkit.com',
  'https://packed.ink',
] as const;

export function getResolvedSameAs(): string[] {
  return [...brandSameAs];
}

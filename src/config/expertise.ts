export const processSteps = [
  {
    step: '01',
    title: 'Find the bottleneck',
    body: 'Where does work stall, and why does it still need you?',
  },
  {
    step: '02',
    title: 'Map the process',
    body: 'Make the real path visible from request to delivery, not the fantasy flowchart.',
  },
  {
    step: '03',
    title: 'Build the system',
    body: 'Tools, roles, and checklists that hold up on a busy week.',
  },
  {
    step: '04',
    title: 'Hand it back',
    body: 'Train the team, step you out of the loop, and keep judgment where it belongs.',
  },
] as const;

/**
 * Featured outcome stories. Only include entries with a known, verified result.
 * Incomplete problem/build pairs without a result stay out of the UI.
 */
export const featuredAlpineStory = {
  id: 'alpine-quoting',
  name: 'Alpine Apparel Co',
  eyebrow: 'Featured story',
  headline: 'Quote time: 30 minutes to under 5',
  problem: 'Estimates ate about 30 minutes and pulled the owner back into every quote.',
  built: 'A clearer quoting process so the team could answer customers without waiting on Jesse.',
  result: 'Quote time dropped from about 30 minutes to under 5.',
  story:
    'At Alpine Apparel Co, estimates used to take about 30 minutes and pull the owner into every quote. After we rebuilt the quoting path, the team can answer customers in under 5 minutes.',
  beforeLabel: 'Before: ~30 minutes per quote',
  afterLabel: 'After: under 5 minutes',
  beforeWidth: 100,
  afterWidth: 17,
} as const;

/** @deprecated Prefer featuredAlpineStory. Kept name for any leftover imports during edits. */
export const alpineQuoteProof = featuredAlpineStory;

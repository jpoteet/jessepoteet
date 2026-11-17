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

export const caseStudies = [
  {
    id: 'alpine-quoting',
    name: 'Alpine Apparel Co',
    eyebrow: 'Owner-run production business',
    problem: 'Estimates ate half an hour and pulled the owner back into every quote.',
    built: 'A clearer quoting process so the team could answer customers without waiting on Jesse.',
    result: 'What used to take a half hour now takes a few minutes.',
  },
  {
    id: 'operator-stack',
    name: 'Operator Stack',
    eyebrow: 'Done-for-you systems',
    problem: 'Owner-run businesses with 2 to 30 people stay stuck in day-to-day work.',
    built: 'Process reviews and systems for print and apparel, sign shops, small manufacturers, contractors, and home services.',
    result: '[JESSE: Operator Stack result / proof metric]',
  },
  {
    id: 'pricely',
    name: 'Pricely',
    eyebrow: 'Software product',
    problem: 'Owners guess at pricing and lose margin or time on every estimate.',
    built: 'A pricing and quoting tool born from print-shop reality, useful anywhere quotes get messy.',
    result: '[JESSE: Pricely result / proof metric]',
  },
  {
    id: 'ssp',
    name: 'Startup Screen Printing',
    eyebrow: 'Education for creators and owners',
    problem: 'Operators stay trapped in production and never get space to lead.',
    built: 'YouTube, newsletter, podcast, coaching, and courses that started in print and speak to getting owners off the treadmill.',
    result: '[JESSE: SSP result / reach metric]',
  },
] as const;

/** Story-style proof from Alpine; keep it narrative, not a stat banner. */
export const alpineQuoteProof = {
  headline: 'A half-hour quote became a few minutes',
  story:
    'At Alpine Apparel Co, estimating used to steal a chunk of every busy day. After we rebuilt the quoting path, the team could answer customers in a few minutes instead of waiting on a half-hour grind.',
  beforeLabel: 'Before: a half hour per quote',
  afterLabel: 'After: a few minutes',
  // Relative bar widths for a quiet visual comparison (not a numeric KPI strip)
  beforeWidth: 100,
  afterWidth: 17,
} as const;

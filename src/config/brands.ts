/**
 * Brand and venture data for the home grid and /work page.
 * Drop logo files under public/images/logos/ using the paths below.
 */
export type BrandLink = {
  id: string;
  name: string;
  monogram: string;
  /** Path under /public for a logo file Jesse can drop in later. */
  logoPath: string;
  url: string | null;
  urlTodo?: string;
  blurb: string;
  /** Problem this brand solves (used on home "What I'm building"). */
  problem: string;
};

export type StandaloneBrand = BrandLink & {
  audience?: string;
};

/** Child brands grouped under PrintPro Strategies. */
export type PrintProChild = BrandLink & {
  kind: 'education' | 'software';
};

export const alpineApparel: StandaloneBrand = {
  id: 'alpine',
  name: 'Alpine Apparel Co',
  monogram: 'AA',
  logoPath: '/images/logos/alpine-apparel-co.svg',
  url: 'https://alpineapparelco.com',
  blurb:
    'Premium water-based screen printing, plus DTF and embroidery, from Castle Rock. Built for small businesses, nonprofits, schools, trades, and emerging brands.',
  problem:
    'Local brands need apparel that looks premium without a big-city print shop runaround.',
  audience: 'Local brands & organizations',
};

export const operatorStack: StandaloneBrand = {
  id: 'operator-stack',
  name: 'Operator Stack',
  monogram: 'OS',
  logoPath: '/images/logos/operator-stack.svg',
  url: 'https://operatorstack.io',
  blurb:
    'Done-for-you systems for owner-run small businesses with 2 to 30 people. Print and apparel shops, sign shops, small manufacturers, contractors, and home services. Starts with a free 30-minute process review.',
  problem:
    'Owner-run businesses with 2 to 30 people are stuck in the day-to-day and need systems that do not require the owner for every decision.',
  audience: 'Owner-run small businesses',
};

export const printProEducation: PrintProChild[] = [
  {
    id: 'ssp',
    name: 'Startup Screen Printing',
    monogram: 'SS',
    logoPath: '/images/logos/startup-screen-printing.svg',
    url: 'https://startupscreenprinting.com',
    blurb:
      'YouTube, newsletter, podcast, coaching, and courses for print shop owners. Mission: get every print shop owner off the press.',
    problem: 'Print shop owners stay stuck on the press and never get time to run the business.',
    kind: 'education',
  },
  {
    id: 'print-crew',
    name: 'The Print Crew',
    monogram: 'PC',
    logoPath: '/images/logos/the-print-crew.svg',
    url: null,
    urlTodo: '[JESSE: The Print Crew URL]',
    // [JESSE: confirm The Print Crew one-liner]
    blurb: 'Print education community under PrintPro Strategies. [JESSE: confirm The Print Crew one-liner]',
    problem: 'Owners need peers and practical help, not another lonely Facebook thread. [JESSE: confirm The Print Crew problem]',
    kind: 'education',
  },
  {
    id: 'print-growth-experience',
    name: 'Print Growth Experience',
    monogram: 'PG',
    logoPath: '/images/logos/print-growth-experience.svg',
    url: null,
    urlTodo: '[JESSE: Print Growth Experience URL]',
    // [JESSE: confirm Print Growth Experience one-liner]
    blurb: 'Growth program for print shop owners. [JESSE: confirm Print Growth Experience one-liner]',
    problem: 'Shops want growth with a clear path, not random tips. [JESSE: confirm Print Growth Experience problem]',
    kind: 'education',
  },
  {
    id: 'screen-printing-toolbox',
    name: 'Screen Printing Toolbox',
    monogram: 'ST',
    logoPath: '/images/logos/screen-printing-toolbox.svg',
    url: null,
    urlTodo: '[JESSE: Screen Printing Toolbox URL]',
    // [JESSE: confirm Screen Printing Toolbox one-liner]
    blurb: 'Tools and resources for screen printers. [JESSE: confirm Screen Printing Toolbox one-liner]',
    problem: 'Printers waste time hunting for checklists, templates, and shop resources. [JESSE: confirm Screen Printing Toolbox problem]',
    kind: 'education',
  },
];

export const printProSoftware: PrintProChild[] = [
  {
    id: 'pricely',
    name: 'Pricely',
    monogram: 'P',
    logoPath: '/images/logos/pricely.svg',
    url: 'https://pricely.ink',
    blurb: 'Pricing and quoting tool for print shops.',
    problem: 'Quoting takes too long and guesses cost the shop money.',
    kind: 'software',
  },
  {
    id: 'groupkit',
    name: 'GroupKit',
    monogram: 'GK',
    logoPath: '/images/logos/groupkit.svg',
    url: 'https://getgroupkit.com',
    // [JESSE: confirm GroupKit product description]
    blurb: 'Software for the print and apparel industry. [JESSE: confirm GroupKit product description]',
    problem: 'Group and team orders are messy to organize. [JESSE: confirm GroupKit problem]',
    kind: 'software',
  },
  {
    id: 'packed',
    name: 'Packed',
    monogram: 'PK',
    logoPath: '/images/logos/packed.svg',
    url: 'https://packed.ink',
    // [JESSE: confirm Packed product description]
    blurb: 'Software for the print and apparel industry. [JESSE: confirm Packed product description]',
    problem: 'Print and apparel shops need better tooling for [JESSE: confirm Packed problem].',
    kind: 'software',
  },
];

export const printProStrategies = {
  id: 'printpro',
  name: 'PrintPro Strategies',
  legalName: 'PrintPro Strategies LLC',
  monogram: 'PP',
  logoPath: '/images/logos/printpro-strategies.svg',
  url: null as string | null,
  urlTodo: '[JESSE: PrintPro Strategies URL]',
  blurb:
    "Parent company for Jesse's print education brands and print-shop software.",
  problem:
    'Print shop owners need education and software in one place, not a pile of disconnected tips and tools.',
  education: printProEducation,
  software: printProSoftware,
};

/** Top-level entries shown as their own cards on home and work. */
export const standaloneBrands: StandaloneBrand[] = [alpineApparel, operatorStack];

export const allBrandLinks: BrandLink[] = [
  alpineApparel,
  operatorStack,
  {
    id: printProStrategies.id,
    name: printProStrategies.name,
    monogram: printProStrategies.monogram,
    logoPath: printProStrategies.logoPath,
    url: printProStrategies.url,
    urlTodo: printProStrategies.urlTodo,
    blurb: printProStrategies.blurb,
    problem: printProStrategies.problem,
  },
  ...printProEducation,
  ...printProSoftware,
];

/** Paths Jesse can drop logo files into (documented in README and logos README). */
export const logoDropPaths = allBrandLinks.map((b) => ({
  brand: b.name,
  path: `public${b.logoPath}`,
}));

export const beliefs = [
  {
    title: 'Faith and family first',
    body: 'Business should create freedom for family life, not crowd it out.',
  },
  {
    title: 'Profit over revenue',
    body: 'Big top-line numbers mean little if the business is not healthy underneath.',
  },
  {
    title: 'Systems over hustle',
    body: 'Repeatable processes beat heroic late nights. The goal is to get the owner off the treadmill.',
  },
  {
    title: 'Transparent pricing and human judgment',
    body: 'Price clearly. Use AI to cut busywork, and keep people in charge of the calls that matter.',
  },
] as const;

export const pressMentions = [
  {
    name: 'The Apparelist',
    href: null as string | null,
    todo: '[JESSE: The Apparelist feature link]',
  },
  {
    name: 'ScreenPrinting.com',
    href: null as string | null,
    todo: '[JESSE: ScreenPrinting.com feature link]',
  },
] as const;

export const alpineProof = {
  headline: 'Quote time cut from 30 minutes to under 5',
  detail:
    'At Alpine Apparel Co, better quoting process turned a half-hour grind into a few minutes so the team can focus on printing and people.',
} as const;

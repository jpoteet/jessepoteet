/**
 * Brand and venture data for the home grid and /work page.
 * Only include known facts and verified URLs on rendered pages.
 */
export type BrandLink = {
  id: string;
  name: string;
  monogram: string;
  logoPath: string;
  url: string | null;
  blurb: string;
  problem: string;
};

export type StandaloneBrand = BrandLink & {
  audience?: string;
};

export type PrintProChild = BrandLink & {
  kind: 'education' | 'software';
};

export const alpineApparel: StandaloneBrand = {
  id: 'alpine',
  name: 'Alpine Apparel Co',
  monogram: 'AA',
  logoPath: '/images/logos/alpine-apparel-co.svg',
  url: 'https://jpoteet.us/alpine',
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

export const gathered: StandaloneBrand = {
  id: 'gathered',
  name: 'Gathered',
  monogram: 'G',
  logoPath: '/images/logos/gathered.svg',
  url: 'https://news.gatheredjourney.com/',
  blurb:
    'A weekly reflection for husbands and fathers who are building something meaningful and want to stay grounded in faith, family, and identity along the way. Newsletter and community on Beehiiv.',
  problem:
    'Husbands and fathers who are building something meaningful still need a weekly place to stay grounded in faith, family, and identity.',
  audience: 'Husbands and fathers',
};

/** Education brands with verified URLs or safe name-only mentions. */
export const printProEducation: PrintProChild[] = [
  {
    id: 'ssp',
    name: 'Startup Screen Printing',
    monogram: 'SS',
    logoPath: '/images/logos/startup-screen-printing.svg',
    url: 'https://jpoteet.us/ssp',
    blurb:
      'YouTube, newsletter, podcast, coaching, and courses for print shop owners. Mission: get every print shop owner off the press.',
    problem: 'Print shop owners stay stuck on the press and never get time to run the business.',
    kind: 'education',
  },
];

/** Named under PrintPro without public URLs in this repo (no invented blurbs on cards). */
export const printProEducationNames = [
  'The Print Crew',
  'Print Growth Experience',
  'Screen Printing Toolbox',
] as const;

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
    blurb: 'A PrintPro Strategies software product.',
    problem: 'Built for operators who need better software in the print and apparel world.',
    kind: 'software',
  },
  {
    id: 'packed',
    name: 'Packed',
    monogram: 'PK',
    logoPath: '/images/logos/packed.svg',
    url: 'https://packed.ink',
    blurb: 'A PrintPro Strategies software product.',
    problem: 'Built for operators who need better software in the print and apparel world.',
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
  blurb:
    "Parent company for Jesse's print education brands and print-shop software.",
  problem:
    'Print shop owners need education and software in one place, not a pile of disconnected tips and tools.',
  education: printProEducation,
  educationAlso: printProEducationNames,
  software: printProSoftware,
};

export const standaloneBrands: StandaloneBrand[] = [alpineApparel, operatorStack, gathered];

export const allBrandLinks: BrandLink[] = [
  alpineApparel,
  operatorStack,
  gathered,
  {
    id: printProStrategies.id,
    name: printProStrategies.name,
    monogram: printProStrategies.monogram,
    logoPath: printProStrategies.logoPath,
    url: printProStrategies.url,
    blurb: printProStrategies.blurb,
    problem: printProStrategies.problem,
  },
  ...printProEducation,
  ...printProSoftware,
];

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

export const pressMentions = ['The Apparelist', 'ScreenPrinting.com'] as const;

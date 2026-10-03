import type { Product } from '../types';
import type { Period } from './metrics';

// The behavioural nudges Shelf can run on a product, and how each performs per
// product. Performance is generated per product so it's stable across reloads;
// the real version aggregates swipe and checkout logs.

export type NudgeId =
  | 'social-proof'
  | 'loss-aversion'
  | 'scarcity'
  | 'anchoring'
  | 'price-framing'
  | 'health-halo'
  | 'authority'
  | 'bundling'
  | 'novelty'
  | 'control';

export interface NudgeInfo {
  id: NudgeId;
  name: string;
  short: string;
  principle: string;
  source: string;
  example: string;
  where: string;
}

export const NUDGES: NudgeInfo[] = [
  {
    id: 'social-proof',
    name: 'Social proof',
    short: 'Social',
    principle: 'People follow what others like them do, especially when unsure.',
    source: 'Cialdini, Influence (1984)',
    example: 'A Watch Humans shopper trying it, playing on the swipe card',
    where: 'Swipe card',
  },
  {
    id: 'loss-aversion',
    name: 'Loss aversion',
    short: 'Loss',
    principle: 'Losing something feels about twice as bad as gaining the same thing feels good.',
    source: 'Kahneman & Tversky, Prospect Theory (1979)',
    example: '“The special offer for this product will go in 10s”',
    where: 'Checkout shelf',
  },
  {
    id: 'scarcity',
    name: 'Scarcity',
    short: 'Scarcity',
    principle: 'Things seem more valuable when they might run out.',
    source: 'Worchel, Lee & Adewole (1975); Cialdini',
    example: '“Only 6 left at this price”',
    where: 'Swipe card',
  },
  {
    id: 'anchoring',
    name: 'Anchoring',
    short: 'Anchor',
    principle: 'The first price seen sets the reference for judging the next.',
    source: 'Tversky & Kahneman (1974)',
    example: '“Was £3.25, now £2.25”',
    where: 'Swipe card, checkout',
  },
  {
    id: 'price-framing',
    name: 'Price framing',
    short: 'Framing',
    principle: 'The same price feels smaller when split into everyday units.',
    source: 'Thaler, mental accounting (1985); Gourville “pennies-a-day” (1998)',
    example: '“Just 37p a serving”',
    where: 'Swipe card',
  },
  {
    id: 'health-halo',
    name: 'Health halo',
    short: 'Health',
    principle: 'A salient health claim makes the whole product feel like the better choice.',
    source: 'Chandon & Wansink (2007); salience in the EAST framework (BIT, 2014)',
    example: '“High in protein” / “30% less fat”',
    where: 'Swipe card',
  },
  {
    id: 'authority',
    name: 'Authority',
    short: 'Authority',
    principle: 'People trust endorsements from experts and recognised awards.',
    source: 'Cialdini, Influence (1984)',
    example: '“Great Taste award winner” / “Dietitian approved”',
    where: 'Swipe card, reviews',
  },
  {
    id: 'bundling',
    name: 'Complements',
    short: 'Bundle',
    principle: 'Suggesting what goes with a choice makes the pair feel like one decision.',
    source: 'Choice architecture, Thaler & Sunstein, Nudge (2008)',
    example: '“Goes with your crisps”',
    where: 'Checkout shelf',
  },
  {
    id: 'novelty',
    name: 'Novelty',
    short: 'Novelty',
    principle: 'New things grab attention and trigger curiosity to try.',
    source: 'Hirschman, novelty seeking (1980)',
    example: '“New on Ocado this month”',
    where: 'Swipe card',
  },
  {
    id: 'control',
    name: 'No nudge (control)',
    short: 'Control',
    principle: 'The same product shown without a nudge, to measure each nudge against.',
    source: 'Randomised control',
    example: 'Product card only',
    where: 'Everywhere',
  },
];

export const NUDGE_BY_ID = Object.fromEntries(NUDGES.map((n) => [n.id, n])) as Record<NudgeId, NudgeInfo>;

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
const rand = (key: string) => (hash(key) % 10000) / 10000;

/** How strongly each nudge suits a product, from what it is (1 = neutral). */
function affinity(p: Product, nudge: NudgeId): number {
  const isNew = p.tags.includes('new') || p.badge === 'New';
  const drink = p.category === 'drinks' || p.category === 'wine';
  const snack = p.category === 'snacks';
  const cheap = p.price <= 3;
  const premium = p.price >= 8;
  switch (nudge) {
    case 'social-proof':
      // Strongest with a real shopper video behind it.
      return (p.partner ? 1.3 : 0.85) + (isNew ? 0.5 : 0) + (drink ? 0.15 : 0);
    case 'loss-aversion':
      return 1 + (cheap ? 0.25 : 0) + (snack ? 0.1 : 0) - (premium ? 0.3 : 0);
    case 'scarcity':
      return 1 + (p.offer ? 0.3 : 0) + (snack ? 0.25 : 0) + (cheap ? 0.15 : 0);
    case 'anchoring':
      return 1 + (p.wasPrice ? 0.7 : 0) + (p.offer ? 0.3 : 0) + (premium ? 0.2 : 0);
    case 'price-framing':
      return 1 + (premium ? 0.6 : 0) + (/x\s*\d|pack/i.test(p.size) ? 0.3 : 0);
    case 'health-halo':
      return 1 + (p.nutrition ? 0.7 : 0) + (p.dietary.includes('vegan') ? 0.15 : 0) - (p.category === 'wine' ? 0.4 : 0);
    case 'authority':
      return 1 + (premium ? 0.5 : 0) + (p.rating >= 4.6 ? 0.25 : 0) + (p.category === 'wine' ? 0.3 : 0);
    case 'bundling':
      return 1 + (snack ? 0.4 : 0) + (p.partyRole === 'savoury' ? 0.3 : 0) + (p.category === 'dairy' ? 0.2 : 0);
    case 'novelty':
      return 1 + (isNew ? 0.9 : 0) - (p.reviewCount > 200 ? 0.25 : 0);
    case 'control':
      return 1;
  }
}

const BASE_RATE: Record<NudgeId, number> = {
  'social-proof': 10.5,
  'loss-aversion': 10,
  scarcity: 10,
  anchoring: 10,
  'price-framing': 9.5,
  'health-halo': 9.5,
  authority: 9.5,
  bundling: 10,
  novelty: 9,
  control: 6,
};

const PERIOD_SCALE: Record<Period, number> = { 7: 0.24, 30: 1, 90: 2.75 };

export interface NudgeCell {
  nudge: NudgeId;
  shown: number;
  bought: number;
  /** Purchases per 100 nudges shown. */
  rate: number;
  /** Rate relative to the product's control. */
  uplift: number;
}

export interface NudgeRow {
  product: Product;
  cells: NudgeCell[];
  best: NudgeCell;
}

export function nudgeMatrix(products: Product[], period: Period): NudgeRow[] {
  return products.map((p) => {
    const cells = NUDGES.map(({ id }) => {
      const shown = Math.round((180 + rand(`${p.id}:${id}:n`) * 420) * PERIOD_SCALE[period]);
      const rate = BASE_RATE[id] * affinity(p, id) * (0.75 + rand(`${p.id}:${id}:r`) * 0.5) * (0.85 + p.rating / 20);
      return { nudge: id, shown, bought: Math.round((shown * rate) / 100), rate, uplift: 1 };
    });
    const control = cells.find((c) => c.nudge === 'control')!;
    for (const c of cells) c.uplift = c.rate / control.rate;
    const best = cells.filter((c) => c.nudge !== 'control').sort((a, b) => b.rate - a.rate)[0];
    return { product: p, cells, best };
  });
}

/** Average uplift over control per nudge across a range, best first. */
export function nudgeRanking(rows: NudgeRow[]) {
  return NUDGES.filter((n) => n.id !== 'control')
    .map((n) => {
      const cells = rows.map((r) => r.cells.find((c) => c.nudge === n.id)!);
      const uplift = cells.reduce((s, c) => s + c.uplift, 0) / Math.max(1, cells.length);
      const wins = rows.filter((r) => r.best.nudge === n.id).length;
      return { nudge: n, uplift, wins };
    })
    .sort((a, b) => b.uplift - a.uplift);
}

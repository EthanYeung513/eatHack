import { PRODUCTS } from '../data/products';
import type { NudgeType, Product } from '../types';

// Placeholder analytics for the brand dashboard. Generated deterministically
// per product so numbers are stable across reloads; the real version will
// aggregate swipe logs (see SwipeLogEntry) from the backend.

export type Period = 7 | 30 | 90;

export interface Company {
  id: string;
  label: string;
  match: (p: Product) => boolean;
}

// One dashboard per brand, with every product that brand sells. Brands with the
// biggest ranges first; partner brands can also be viewed together.
const BRANDS = [...new Set(PRODUCTS.map((p) => p.brand))].sort(
  (a, b) =>
    PRODUCTS.filter((p) => p.brand === b).length - PRODUCTS.filter((p) => p.brand === a).length || a.localeCompare(b),
);

export const COMPANIES: Company[] = [
  ...BRANDS.map((brand) => ({ id: brand, label: brand, match: (p: Product) => p.brand === brand })),
  { id: 'partners', label: 'All Shelf partner brands', match: (p) => !!p.partner },
];

export const DEFAULT_COMPANY = 'partners';

export const brandProducts = (companyId: string) =>
  PRODUCTS.filter((p) => (COMPANIES.find((c) => c.id === companyId) ?? COMPANIES[0]).match(p));

export interface FunnelCounts {
  delivered: number;
  picked: number;
  added: number;
  bought: number;
}

export interface NudgeMetrics extends FunnelCounts {
  type: NudgeType;
}

export interface ProductMetrics extends FunnelCounts {
  product: Product;
  launched: Date;
  nudges: NudgeMetrics[];
  /** Share of the company's agent picks vs share of its purchases, 0–1. */
  agentShare: number;
  humanShare: number;
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Deterministic 0–1 value per key. */
const rand = (key: string) => (hash(key) % 10000) / 10000;

const PERIOD_SCALE: Record<Period, number> = { 7: 0.24, 30: 1, 90: 2.75 };

// Baseline behaviour per nudge: how often the agent chooses to surface it,
// and how often shoppers then add / buy.
const BASE: Record<NudgeType, { volume: number; pick: number; add: number; buy: number }> = {
  offer: { volume: 1, pick: 0.62, add: 0.42, buy: 0.68 },
  partner: { volume: 0.8, pick: 0.48, add: 0.4, buy: 0.74 },
  nutrition: { volume: 0.7, pick: 0.55, add: 0.28, buy: 0.62 },
  none: { volume: 0.6, pick: 0.4, add: 0.21, buy: 0.6 },
};

const TODAY = new Date(2026, 9, 3);

function launchDate(p: Product) {
  const daysAgo = 14 + Math.floor(rand(`${p.id}:launch`) * 260);
  return new Date(TODAY.getTime() - daysAgo * 86_400_000);
}

export const isNewLaunch = (d: Date) => TODAY.getTime() - d.getTime() < 60 * 86_400_000;

export function nudgesFor(p: Product): NudgeType[] {
  return [
    ...(p.offer ? (['offer'] as const) : []),
    ...(p.partner ? (['partner'] as const) : []),
    ...(p.nutrition ? (['nutrition'] as const) : []),
    'none',
  ];
}

export function productMetrics(companyId: string, period: Period): ProductMetrics[] {
  const company = COMPANIES.find((c) => c.id === companyId) ?? COMPANIES[0];
  const rows = PRODUCTS.map((product, rank) => ({ product, rank })).filter(({ product }) => company.match(product));

  const metrics = rows.map(({ product, rank }) => {
    const popularity = 1.7 - rank / PRODUCTS.length;
    // The agent leans on ratings; shoppers lean on price and deals.
    const agentBias = 0.7 + (product.rating / 5) * 0.5;
    const humanBias = (product.offer ? 1.15 : 0.9) * (product.price < 3 ? 1.1 : 0.92);

    const nudges = nudgesFor(product).map((type) => {
      const base = BASE[type];
      const k = `${product.id}:${type}:${period}`;
      const delivered = Math.round(
        (500 + rand(`${product.id}:${type}`) * 1500) *
          popularity *
          base.volume *
          PERIOD_SCALE[period] *
          (0.92 + rand(k) * 0.16),
      );
      const picked = Math.round(delivered * Math.min(0.95, base.pick * agentBias * (0.75 + rand(`${k}:p`) * 0.5)));
      const added = Math.round(picked * Math.min(0.9, base.add * humanBias * (0.7 + rand(`${k}:a`) * 0.6)));
      const bought = Math.round(added * Math.min(0.95, base.buy * (0.85 + rand(`${k}:b`) * 0.3)));
      return { type, delivered, picked, added, bought };
    });

    const sum = (key: keyof FunnelCounts) => nudges.reduce((n, x) => n + x[key], 0);
    return {
      product,
      launched: launchDate(product),
      nudges,
      delivered: sum('delivered'),
      picked: sum('picked'),
      added: sum('added'),
      bought: sum('bought'),
      agentShare: 0,
      humanShare: 0,
    };
  });

  const totalPicked = metrics.reduce((n, m) => n + m.picked, 0) || 1;
  const totalBought = metrics.reduce((n, m) => n + m.bought, 0) || 1;
  for (const m of metrics) {
    m.agentShare = m.picked / totalPicked;
    m.humanShare = m.bought / totalBought;
  }
  return metrics;
}

export function totals(rows: FunnelCounts[]): FunnelCounts {
  return rows.reduce(
    (t, r) => ({
      delivered: t.delivered + r.delivered,
      picked: t.picked + r.picked,
      added: t.added + r.added,
      bought: t.bought + r.bought,
    }),
    { delivered: 0, picked: 0, added: 0, bought: 0 },
  );
}

export function byNudge(rows: ProductMetrics[]): NudgeMetrics[] {
  return (['offer', 'partner', 'nutrition', 'none'] as const)
    .map((type) => ({ type, ...totals(rows.flatMap((r) => r.nudges.filter((n) => n.type === type))) }))
    .filter((n) => n.delivered > 0);
}

/** The nudge with the best purchase rate per delivery for a product. */
export function bestNudge(m: ProductMetrics): NudgeType {
  return [...m.nudges].sort((a, b) => b.bought / b.delivered - a.bought / a.delivered)[0].type;
}

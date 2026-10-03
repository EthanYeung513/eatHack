import { PRODUCTS } from '../data/products';
import type { BasketLine } from '../state/basket';
import type { Product, SwipeLogEntry } from '../types';
import { familyOf, PAIRINGS, tasteFrom } from './narrowing';

// Turns a party basket into "how it gets used": servings per product, coverage
// per area against the guest count, and last-minute picks to fill the gaps.

export type GroupId = 'toast' | 'soft' | 'board' | 'snacks' | 'sweet';
export type ZoneId = 'bar' | 'board' | 'sofa' | 'sweet';
export type Coverage = 'sorted' | 'light' | 'missing';

interface GroupDef {
  id: GroupId;
  label: string;
  zone: ZoneId;
  unit: string;
  /** Servings needed per guest. */
  perGuest: number;
  /** Handwritten reason on a last-minute shelf card. */
  reason: string;
}

export const GROUPS: GroupDef[] = [
  { id: 'toast', label: 'Toast', zone: 'bar', unit: 'glasses', perGuest: 1, reason: 'so everyone can toast' },
  { id: 'soft', label: 'Soft', zone: 'bar', unit: 'drinks', perGuest: 2.5, reason: 'keep everyone topped up' },
  { id: 'board', label: 'Savoury', zone: 'board', unit: 'portions', perGuest: 1, reason: 'for the board' },
  { id: 'snacks', label: 'Snacks', zone: 'sofa', unit: 'portions', perGuest: 1, reason: 'more to nibble' },
  { id: 'sweet', label: 'Sweet', zone: 'sweet', unit: 'pieces', perGuest: 1, reason: 'something sweet' },
];

export const ZONES: Record<ZoneId, string> = {
  bar: 'the bar',
  board: 'cheese board',
  sofa: 'by the sofa',
  sweet: 'sweet spot',
};

const SNACKY = /crisps|pringles|pistachio|walnut|nuts|olive|corn|dip|granola|protein mix|popcorn/i;

export function groupOf(p: Product): GroupId | undefined {
  switch (p.partyRole) {
    case 'alcohol':
      return 'toast';
    case 'soft':
      return 'soft';
    case 'sweet':
      return 'sweet';
    case 'savoury':
      return SNACKY.test(p.name) ? 'snacks' : 'board';
    case 'nibbles':
    case 'fresh':
      return 'board';
    default:
      return undefined;
  }
}

interface Pack {
  count?: number;
  grams?: number;
  ml?: number;
}

function parsePack(size: string): Pack {
  const multi = size.match(/(\d+)\s*x\s*([\d.]+)\s*(ml|g|cl|l)\b/i);
  if (multi) return { count: Number(multi[1]) };
  const per = size.match(/(\d+)\s*(per pack|pack)/i);
  if (per) return { count: Number(per[1]) };
  const m = size.match(/([\d.]+)\s*(kg|g|ml|cl|l)\b/i);
  if (!m) return {};
  const v = Number(m[1]);
  switch (m[2].toLowerCase()) {
    case 'kg':
      return { grams: v * 1000 };
    case 'g':
      return { grams: v };
    case 'l':
      return { ml: v * 1000 };
    case 'cl':
      return { ml: v * 10 };
    default:
      return { ml: v };
  }
}

/** Servings one pack provides, plus a short "how it's used" description. */
export function servings(p: Product): { units: number; how: string } {
  const group = groupOf(p);
  const pack = parsePack(p.size);
  const n = (x: number) => Math.max(1, Math.floor(x));

  if (pack.count) {
    const unit = group === 'soft' || group === 'toast' ? 'drinks' : 'portions';
    return { units: pack.count, how: `${pack.count} ${unit}` };
  }
  switch (group) {
    case 'toast': {
      const ml = pack.ml ?? 750;
      const isWine = p.tags.some((t) => ['wine', 'sparkling', 'red', 'white', 'rose'].includes(t));
      return isWine
        ? { units: n(ml / 125), how: `${n(ml / 125)} glasses of 125ml` }
        : { units: n(ml / 50), how: `${n(ml / 50)} double measures` };
    }
    case 'soft':
      if (pack.grams) return { units: n(pack.grams / 25), how: `${n(pack.grams / 25)} mugs` };
      return { units: n((pack.ml ?? 330) / 250), how: `${n((pack.ml ?? 330) / 250)} glasses` };
    case 'sweet':
      if (pack.ml) return { units: n(pack.ml / 100), how: `${n(pack.ml / 100)} scoops` };
      return { units: n((pack.grams ?? 100) / 12.5), how: `${n((pack.grams ?? 100) / 12.5)} pieces` };
    case 'board': {
      const per = p.partyRole === 'fresh' ? 80 : p.partyRole === 'nibbles' ? 50 : 30;
      return { units: n((pack.grams ?? per) / per), how: `${n((pack.grams ?? per) / per)} portions of ${per}g` };
    }
    case 'snacks':
      return { units: n((pack.grams ?? 30) / 30), how: `${n((pack.grams ?? 30) / 30)} portions of 30g` };
    default:
      return { units: 1, how: '1 serving' };
  }
}

export interface GroupCoverage extends GroupDef {
  have: number;
  target: number;
  status: Coverage;
  lines: BasketLine[];
}

export function coverage(lines: BasketLine[], guests: number): GroupCoverage[] {
  return GROUPS.map((g) => {
    const groupLines = lines.filter((l) => groupOf(l.product) === g.id);
    const have = groupLines.reduce((n, l) => n + servings(l.product).units * l.qty, 0);
    const target = Math.ceil(g.perGuest * guests);
    const status: Coverage = have >= target ? 'sorted' : have > 0 ? 'light' : 'missing';
    return { ...g, have, target, status, lines: groupLines };
  });
}

export interface ShelfPick {
  product: Product;
  /** The party area this fills, when there's a party goal. */
  group?: GroupCoverage;
  reason: string;
  /** Already in the trolley: the action adds another of the same. */
  again: boolean;
  gain: number;
  tag?: { kind: 'partner' | 'offer'; text: string };
}

const tagFor = (p: Product): ShelfPick['tag'] =>
  p.partner
    ? { kind: 'partner', text: 'Sponsored · partner brand' }
    : p.offer
      ? { kind: 'offer', text: `Ocado offer · ${p.offer}` }
      : undefined;

/**
 * Last-minute picks at checkout, from three signals: what's in the basket, the goal
 * of the basket (party guests, when there is one) and what the shopper swiped.
 * Products they swiped left on are never suggested; families they liked rank higher;
 * products they liked but later took out of the basket come back first.
 */
export function shelfPicks(
  lines: BasketLine[],
  guests: number | null,
  history: SwipeLogEntry[] = [],
  limit = 4,
): ShelfPick[] {
  const groups = guests ? coverage(lines, guests) : [];
  const inBasket = new Set(lines.map((l) => l.product.id));
  const taste = tasteFrom(history);
  const allowed = (p: Product) =>
    !inBasket.has(p.id) && !taste.skipped.has(p.id) && p.reviewCount > 0 && !/granola/i.test(p.name);
  const familyScore = (p: Product) => taste.family.get(familyOf(p)) ?? 0;
  const groupFor = (p: Product) => groups.find((g) => g.id === groupOf(p));
  const why = (p: Product, fallback: string) =>
    taste.liked.has(p.id)
      ? 'you liked this earlier'
      : familyScore(p) > 0 && fallback.startsWith('more ')
        ? `you liked ${familyOf(p)} earlier`
        : fallback;

  const picks: ShelfPick[] = [];
  const add = (product: Product | undefined, reason: string, again = false) => {
    if (!product || picks.length >= limit || picks.some((x) => x.product.id === product.id)) return;
    picks.push({
      product,
      group: groupFor(product),
      reason,
      again,
      gain: servings(product).units,
      tag: tagFor(product),
    });
  };

  // 1. Liked in a swipe deck, then taken back out of the basket.
  for (const e of history) {
    if (e.dir === 'right' && !inBasket.has(e.product.id)) add(e.product, 'you liked this earlier');
  }

  // 2. Party goal: fill the areas that are short, favouring what they've liked.
  const gaps = groups.filter((g) => g.status !== 'sorted').sort((a, b) => a.have / a.target - b.have / b.target);
  for (const group of gaps) {
    // "Add a 2nd bottle": the simplest top-up is more of what they already chose.
    const existing = group.lines[0]?.product;
    if (existing && group.id === 'toast') {
      add(existing, group.reason, true);
      continue;
    }
    // How much of the gap a product fills, nudged by partner brands, offers, taste and
    // price, so a single 250ml bottle doesn't win a 22-drink gap just for being
    // sponsored and a £39 gin doesn't top up a party toast.
    const deficit = group.target - group.have;
    const score = (p: Product) =>
      Math.min(servings(p).units, deficit) / deficit +
      (p.partner ? 0.3 : 0) +
      (p.offer ? 0.2 : 0) +
      Math.max(-0.5, Math.min(0.6, familyScore(p) * 0.15)) -
      (p.price > 20 ? 0.6 : 0);
    const best = PRODUCTS.filter((p) => groupOf(p) === group.id && allowed(p)).sort((a, b) => score(b) - score(a))[0];
    if (best) add(best, why(best, `${group.reason}${group.id === 'snacks' ? ` for ${guests}` : ''}`));
  }

  // 3. Pairings for what's in the basket: a dip for the crisps, a mixer for the gin.
  for (const l of lines) {
    const pairing = PAIRINGS[familyOf(l.product)];
    if (!pairing) continue;
    const match = PRODUCTS.filter((p) => familyOf(p) === pairing.family && allowed(p)).sort(
      (a, b) => familyScore(b) - familyScore(a),
    )[0];
    add(match, pairing.reason);
  }

  // 4. More from the families they liked, offers first.
  const likedFamilies = [...taste.family.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([f]) => f);
  for (const f of likedFamilies) {
    const fam = PRODUCTS.filter((p) => familyOf(p) === f && allowed(p));
    const p = fam.find((x) => x.offer) ?? fam[0];
    if (p) add(p, why(p, `more ${f}, since you liked it`));
  }

  // 5. Offers in the areas already in the basket.
  for (const l of lines) {
    add(
      PRODUCTS.find((p) => familyOf(p) === familyOf(l.product) && allowed(p) && p.offer && p.image),
      `more ${familyOf(l.product)}, on offer`,
    );
  }
  return picks;
}

/** "Saturday's" for the upcoming Saturday-ish party, as in the chat. */
export function partyDayLabel(today = new Date()) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const toSat = (6 - today.getDay() + 7) % 7 || 7;
  const d = new Date(today);
  d.setDate(today.getDate() + toSat);
  return `${days[d.getDay()]}’s`;
}

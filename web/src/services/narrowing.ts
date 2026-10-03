import { FEATURED } from '../data/products';
import type { NudgeType, Product, SwipeLogEntry } from '../types';

// Swipe decks start wide and get narrower with every set of five: first one
// product per family, then the areas the shopper liked, then just their
// favourite families.

export const SET_SIZE = 5;

export const FAMILIES: [string, RegExp][] = [
  ['hot drinks', /hot chocolate|drinking chocolate|latte powder|chai|espresso|ground coffee|instant coffee|coffee beans|\bbeans\b.*illy|illy\b|tea ?bags/i],
  ['iced coffee', /latte|iced coffee/i],
  ['functional drinks', /\boom\b|nootropic|adaptogen|\bcbd\b/i],
  ['cocktails', /cocktail can|spritz|martini|margarita|mojito|daiquiri|& tonic|gin & diet/i],
  ['fizz', /prosecco|cremant|champagne|cava|cuvee|asti|classique/i],
  ['spirits', /\b(gin|vodka|rum|whisky|tequila|liqueur)\b/i],
  ['beer & cider', /\b(beer|ale|ipa|lager|cider)\b|strongbow/i],
  ['wine', /wine|malbec|chianti|chablis|sauvignon|pinot|\brose\b|blush|gavi|burgundy|primitivo|saperavi/i],
  ['cola', /\b(cola|coke|pepsi|fanta)\b/i],
  ['juice', /juice|smoothie|j2o|squash|robinsons|fruit creations/i],
  ['water & mixers', /water|tonic|kombucha|cordial|elderflower|soda/i],
  ['dips', /\bdip\b|houmous|hummus|salsa|guacamole/i],
  ['crisps', /crisps|pringles|tortilla|doritos|snack a jacks|love corn|popcorn|thins/i],
  ['nuts', /pistachio|cashew|peanuts|walnut|almonds|\bnuts\b|bombay mix/i],
  ['olives', /olive/i],
  ['cheese', /cheese|cheddar|brie|halloumi|feta|mozzarella|babybel|cheestrings|parmigiano/i],
  ['charcuterie', /salami|saucisson|biltong|peperami|chorizo|serrano|bresaola|coppa/i],
  ['party food', /pizz|burger|onigiri|sushi|handroll|focaccia|piadina|nuggets|sausage/i],
  ['ice cream', /ice cream|magnum/i],
  ['chocolate', /chocolate|truffle|praline|ferrero|lindt|maltesers|cadbury|toblerone|brownie|freddo/i],
  ['sweets', /sweets|gums|marshmallow|percy pig|skittles|wild thingz/i],
  ['fruit', /strawberr|raspberr|blueberr|blackberr|pineapple|grapes|trufru/i],
];

export function familyOf(p: Product): string {
  return FAMILIES.find(([, re]) => re.test(p.name))?.[0] ?? p.category;
}

/** The wider area a family belongs to, used when narrowing from "liked" to "nearby". */
const areaOf = (p: Product) => p.partyRole ?? p.category;

// Pairings used for checkout picks: "a dip for the crisps".
export const PAIRINGS: Record<string, { family: string; reason: string }> = {
  crisps: { family: 'dips', reason: 'a dip for the crisps' },
  fizz: { family: 'fruit', reason: 'strawberries with the fizz' },
  cheese: { family: 'wine', reason: 'a glass for the cheese' },
  spirits: { family: 'water & mixers', reason: 'a mixer for the spirits' },
  nuts: { family: 'beer & cider', reason: 'nuts need a cold one' },
  'party food': { family: 'dips', reason: 'something to dunk' },
  chocolate: { family: 'fizz', reason: 'fizz with the chocolate' },
};

export interface Taste {
  family: Map<string, number>;
  area: Map<string, number>;
  liked: Set<string>;
  skipped: Set<string>;
}

/** What the shopper's swipes say they like: +2 per right swipe, −1 per left swipe. */
export function tasteFrom(history: SwipeLogEntry[]): Taste {
  const taste: Taste = { family: new Map(), area: new Map(), liked: new Set(), skipped: new Set() };
  const bump = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);
  for (const e of history) {
    const v = e.dir === 'right' ? 2 : -1;
    bump(taste.family, familyOf(e.product), v);
    bump(taste.area, areaOf(e.product), v);
    (e.dir === 'right' ? taste.liked : taste.skipped).add(e.product.id);
  }
  return taste;
}

const topKeys = (m: Map<string, number>, n: number) =>
  [...m.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);

/** "crisps, nuts & olives": the families in a set, most common first. */
function describe(products: Product[]) {
  const counts = new Map<string, number>();
  for (const p of products) counts.set(familyOf(p), (counts.get(familyOf(p)) ?? 0) + 1);
  const names = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([f]) => f).slice(0, 3);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}` : (names[0] ?? 'more picks');
}

/** Take one product per family in turn, so a set covers as many families as possible. */
function spread(candidates: Product[], families: string[] | null, size: number): Product[] {
  const byFamily = new Map<string, Product[]>();
  for (const p of candidates) {
    const f = familyOf(p);
    if (families && !families.includes(f)) continue;
    byFamily.set(f, [...(byFamily.get(f) ?? []), p]);
  }
  const order = families?.filter((f) => byFamily.has(f)) ?? [...byFamily.keys()];
  const out: Product[] = [];
  for (let round = 0; out.length < size; round++) {
    let addedAny = false;
    for (const f of order) {
      const p = byFamily.get(f)?.[round];
      if (p && out.length < size) {
        out.push(p);
        addedAny = true;
      }
    }
    if (!addedAny) break;
  }
  return out;
}

/** Reorders so the same nudge type doesn't appear twice in a row where avoidable. */
function alternateNudges(products: Product[], nudgeOf: (p: Product) => NudgeType): Product[] {
  const rest = [...products];
  const out: Product[] = [];
  while (rest.length) {
    const prev = out.length ? nudgeOf(out[out.length - 1]) : null;
    const i = Math.max(
      0,
      rest.findIndex((p) => nudgeOf(p) !== prev),
    );
    out.push(...rest.splice(i, 1));
  }
  return out;
}

export interface NextSet {
  products: Product[];
  label: string;
  stage: 'wide' | 'narrowing' | 'specific';
}

/**
 * The next five cards. `stage` 0 is wide (one per family), 1 narrows to the areas
 * the shopper liked, 2 to their top two families, 3+ to their single favourite.
 */
export function nextSet(
  pool: Product[],
  history: SwipeLogEntry[],
  stage: number,
  options: { exclude?: Set<string>; nudgeOf?: (p: Product) => NudgeType; areas?: string[] } = {},
): NextSet {
  const shown = new Set([...history.map((e) => e.product.id), ...(options.exclude ?? [])]);
  const candidates = pool.filter((p) => !shown.has(p.id));
  const taste = tasteFrom(history);
  const dislikedFamilies = new Set([...taste.family.entries()].filter(([, v]) => v < 0).map(([k]) => k));
  const likedFamilies = topKeys(taste.family, 4);
  const finish = (products: Product[], label: string, s: NextSet['stage']): NextSet => ({
    products: options.nudgeOf ? alternateNudges(products, options.nudgeOf) : products,
    label,
    stage: s,
  });

  // Nothing liked yet: stay wide, but steer away from families they skipped.
  if (stage === 0 || likedFamilies.length === 0) {
    const fresh = candidates.filter((p) => !dislikedFamilies.has(familyOf(p)));
    const lead = FEATURED.filter((p) => fresh.includes(p));
    const set = spread([...lead, ...fresh.filter((p) => !lead.includes(p))], null, SET_SIZE);
    return finish(set, 'A wide range', 'wide');
  }

  if (stage === 1) {
    // Liked families, plus their neighbours in the same area (crisps → nuts, olives…).
    const areas = [...topKeys(taste.area, 3), ...(options.areas ?? [])];
    const nearby = [
      ...likedFamilies,
      ...new Set(
        candidates
          .filter((p) => areas.includes(areaOf(p)))
          .map(familyOf)
          .filter((f) => !likedFamilies.includes(f) && !dislikedFamilies.has(f)),
      ),
    ];
    const set = spread(candidates, nearby, SET_SIZE);
    return finish(set, `Narrowing down: ${describe(set)}`, 'narrowing');
  }

  const top = likedFamilies.slice(0, stage === 2 ? 2 : 1);
  let set = candidates.filter((p) => top.includes(familyOf(p))).slice(0, SET_SIZE);
  // Running out of their favourites: top up with the next closest families, then their areas.
  const topUp = (more: Product[]) => {
    if (set.length < SET_SIZE) set = [...set, ...more.filter((p) => !set.includes(p)).slice(0, SET_SIZE - set.length)];
  };
  topUp(spread(candidates.filter((p) => !set.includes(p)), likedFamilies, SET_SIZE));
  const likedAreas = topKeys(taste.area, 2);
  topUp(candidates.filter((p) => likedAreas.includes(areaOf(p)) && !dislikedFamilies.has(familyOf(p))));
  const onlyFavourites = set.every((p) => top.includes(familyOf(p)));
  return finish(set, `${onlyFavourites ? 'Just' : 'Closest matches:'} ${describe(set)}`, 'specific');
}

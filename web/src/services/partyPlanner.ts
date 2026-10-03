import { FEATURED, PRODUCTS } from '../data/products';
import { getVideoReviews } from '../data/videoReviews';
import type { BasketLine } from '../state/basket';
import type { DeckEndReason, NudgeStat, NudgeType, PartyRole, Product, SwipeLogEntry, SwipeResult } from '../types';
import type { AgentReply } from './agent';

// "Host a party" journey:
//   1. ask for guest numbers (the goal)
//   2. discovery deck: 5 broad cards to learn what this basket is for
//   3. targeted deck: specific products, each carrying one nudge (deal,
//      nutrition, partner-brand video, or none as a control)
//   4. wrap-up when the shopper slows down: goal progress + which nudges worked
//   5. at checkout, the trolley is regenerated as a party preview (see partyUsage)

export const ROLE_LABEL: Record<PartyRole, string> = {
  savoury: 'savoury snacks',
  nibbles: 'party food',
  sweet: 'sweet treats',
  soft: 'soft drinks',
  alcohol: 'beer, wine & fizz',
  fresh: 'fresh platters',
  tableware: 'plates, cups & napkins',
};

export const NUDGE_LABEL: Record<NudgeType, string> = {
  offer: 'Deals & offers',
  partner: 'Social proof (Watch Humans videos)',
  nutrition: 'Nutrition (protein & fibre)',
  none: 'No nudge',
};

const PARTY_INTENT = /\b(host(ing)?|party|parties|birthday|celebrat\w*|gathering|get[- ]together)\b/i;

export const isPartyIntent = (input: string) => PARTY_INTENT.test(input);

/** Guests from "party for 12" / "12 people"; when `loose`, any number (reply to "how many?"). */
export function parseGuests(input: string, loose = false): number | undefined {
  const m =
    input.match(/\b(\d{1,3})\s*\+?\s*(?:people|guests|friends|adults|kids|of us|ppl)\b/i) ??
    input.match(/\bfor\s+(\d{1,3})\b/i) ??
    (loose ? input.match(/\b(\d{1,3})\b/) : null);
  const n = m ? Number(m[1]) : NaN;
  return n > 0 && n < 500 ? n : undefined;
}

const sentenceList = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/** Role pool, photos first (the catalogue is already in popularity order). */
function pool(role: PartyRole, exclude: Set<string> = new Set()) {
  const items = PRODUCTS.filter((p) => p.partyRole === role && !exclude.has(p.id));
  return [...items.filter((p) => p.image), ...items.filter((p) => !p.image)];
}

export function askGuests(): AgentReply {
  return {
    mode: 'text',
    text: 'Ooh, a party! How many people are you expecting? That tells me how much of everything you’ll need.',
    suggestions: ['6 guests', '12 guests', '20 guests', '30 guests'],
  };
}

// ---------- 1. Discovery ----------

// One archetypal product per area, e.g. crisps rather than saucisson for "savoury".
const DISCOVERY: [PartyRole, RegExp][] = [
  ['savoury', /crisps|tortilla|pringles/i],
  ['sweet', /party bag|funsize|sweets|chocolate/i],
  ['soft', /cola|coke|pepsi|j2o|lemonade/i],
  ['alcohol', /prosecco|cremant|cocktail|spritz/i],
  ['nibbles', /burgers|pizz|onigiri|sushi/i],
];

export function discoveryReply(guests: number): AgentReply {
  const picks = DISCOVERY.map(([role, archetype]) => {
    // A featured launch takes its area's slot.
    const featured = FEATURED.find((p) => p.partyRole === role);
    if (featured) return featured;
    const items = pool(role).filter((p) => p.reviewCount > 0);
    return (
      items.find((p) => archetype.test(p.name) && p.image) ?? items.find((p) => archetype.test(p.name)) ?? items[0]
    );
  }).filter(Boolean) as Product[];
  // ...and opens the deck.
  const products = [
    ...FEATURED.filter((p) => picks.includes(p)),
    ...picks.filter((p) => !p.featured),
  ];

  return {
    mode: 'swipe',
    deckTitle: 'Your party, your way',
    products,
    deck: {
      kind: 'discovery',
      stopAfter: products.length,
      nudges: Object.fromEntries(products.filter((p) => p.featured).map((p) => [p.id, nudgeFor(p)])),
    },
    text: `A party for ${guests}, love it. Let’s get a feel for what you’re after first: swipe through these ${products.length} and I’ll tailor everything else.`,
    rationale:
      'A quick mix across snacks, party food and drinks tells me what this basket is for before I get specific.',
  };
}

// ---------- 2. Targeted deck with nudges ----------

export function nudgeFor(p: Product): NudgeType {
  if (p.partner && getVideoReviews(p).length) return 'partner';
  if (p.nutrition) return 'nutrition';
  if (p.offer) return 'offer';
  return 'none';
}

function likedRoles(log: SwipeLogEntry[]): PartyRole[] {
  const counts = new Map<PartyRole, number>();
  for (const e of log) {
    if (e.dir === 'right' && e.product.partyRole) {
      counts.set(e.product.partyRole, (counts.get(e.product.partyRole) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([role]) => role);
}

export function targetedReply(guests: number, discovery: SwipeLogEntry[]): AgentReply {
  const liked = likedRoles(discovery);
  const shown = new Set(discovery.map((e) => e.product.id));

  const essentials: PartyRole[] = ['savoury', 'nibbles', 'sweet', 'soft'];
  const hasDrinks = liked.includes('soft') || liked.includes('alcohol');
  const alsoNeed = essentials.filter((r) => !liked.includes(r) && (r !== 'soft' || !hasDrinks) && r !== 'sweet');

  // Every party product is in play; the deck narrows it set by set from the swipes.
  const roles: PartyRole[] = ['savoury', 'nibbles', 'sweet', 'soft', 'alcohol', 'fresh'];
  const products = roles.flatMap((r) => pool(r, shown));

  const intro = liked.length
    ? `Wow, that’s a good start! You’re clearly into ${sentenceList(liked.map((r) => ROLE_LABEL[r]))}.`
    : 'No worries, nothing grabbed you yet. Let’s try some more specific picks.';
  const need = alsoNeed.length
    ? ` For ${guests} people you’ll probably also need ${sentenceList(alsoNeed.map((r) => ROLE_LABEL[r]))}.`
    : '';

  return {
    mode: 'swipe',
    deckTitle: 'Picked for your party',
    products,
    deck: {
      kind: 'targeted',
      detectSlowdown: true,
      // Starts at "narrowing": the discovery deck was the wide set.
      narrow: { startStage: 1, maxSets: 3, seed: discovery, areas: alsoNeed },
    },
    text: `${intro}${need} Here are some more specific picks, and they’ll get more specific with every set as I learn what you like. I’ve flagged the best deals, the healthier options and partner brands.`,
    rationale: 'Now I know what this basket is for, I can get specific about products rather than categories.',
  };
}

// ---------- 3. Wrap-up ----------

export function nudgeStats(log: SwipeLogEntry[]): NudgeStat[] {
  return (['offer', 'partner', 'nutrition', 'none'] as const)
    .map((type) => {
      const entries = log.filter((e) => (e.nudge ?? 'none') === type);
      return { type, shown: entries.length, accepted: entries.filter((e) => e.dir === 'right').length };
    })
    .filter((s) => s.shown > 0);
}

const WRAP_INTRO: Record<DeckEndReason, string> = {
  slowdown: 'You’re slowing down, so it sounds like you’ve found the good stuff. Let’s wrap up.',
  complete: 'That’s the lot! Let’s wrap up.',
  manual: 'Nice one, let’s wrap up.',
  checkpoint: 'Let’s wrap up.',
};

export function wrapUpReply(guests: number, discovery: SwipeLogEntry[], targeted: SwipeResult): AgentReply {
  return {
    mode: 'text',
    text: `${WRAP_INTRO[targeted.reason]} Here’s where your party for ${guests} stands.`,
    wrapUp: {
      guests,
      likedRoles: likedRoles([...discovery, ...targeted.log]),
      nudgeStats: nudgeStats([...discovery.filter((e) => e.nudge), ...targeted.log]),
      reason: targeted.reason,
    },
  };
}

// ---------- Goal ----------

export interface GoalItem {
  key: string;
  label: string;
  roles: PartyRole[];
  target: number;
}

export function partyGoal(guests: number): GoalItem[] {
  return [
    { key: 'savoury', label: 'Savoury snacks', roles: ['savoury'], target: Math.max(2, Math.ceil(guests / 5)) },
    { key: 'food', label: 'Party food', roles: ['nibbles', 'fresh'], target: Math.max(1, Math.ceil(guests / 8)) },
    { key: 'sweet', label: 'Sweet treats', roles: ['sweet'], target: Math.max(1, Math.ceil(guests / 8)) },
    { key: 'drinks', label: 'Drinks', roles: ['soft', 'alcohol'], target: Math.max(2, Math.ceil(guests / 4)) },
  ];
}

export function goalProgress(guests: number, lines: BasketLine[]) {
  return partyGoal(guests).map((item) => {
    const have = lines
      .filter((l) => l.product.partyRole && item.roles.includes(l.product.partyRole))
      .reduce((n, l) => n + l.qty, 0);
    return { ...item, have, done: have >= item.target };
  });
}

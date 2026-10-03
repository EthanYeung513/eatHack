import type { Category, Product, Review } from '../types';

// Placeholder copy for fields the Ocado export doesn't have (bios, pros/cons,
// review quotes). Deterministic per product so it doesn't change between renders.

type RawProduct = Omit<Product, 'bio' | 'pros' | 'cons' | 'reviews'>;

const BIOS: Record<Category, string[]> = {
  fresh: [
    'Fresh, colourful and ready to brighten up any plate.',
    "Picked for flavour. Chop me, roast me or eat me as I am.",
  ],
  meat: [
    'The star of the plate. Cook me low and slow or hot and fast.',
    'Quality you can taste. Dinner just got a lot easier.',
  ],
  dairy: [
    'A fridge essential that never lets you down.',
    "Creamy, wholesome and great value. The quiet hero of the weekly shop.",
  ],
  bakery: ['Soft, golden and baked to share. Warm me up and watch me disappear.'],
  cupboard: [
    'A cupboard staple that makes everything better.',
    'Reliable, versatile and always there when you need me.',
  ],
  meals: ['Dinner sorted in minutes. Heat, eat and put your feet up.', 'Comforting, filling and zero washing up.'],
  snacks: [
    'Made for sharing, though nobody will blame you if you don’t.',
    'Sweet, fun and dangerously moreish. Basically the life of the party.',
    'The snack everyone reaches for first.',
  ],
  drinks: ['Cold, refreshing and ready when you are.', 'Keep me in the fridge and thank yourself later.'],
  wine: ['Pour me for a toast, a dinner or just because it’s Friday.', 'Easy to like and made for good company.'],
  baby: ['Gentle, practical and parent-approved.'],
  household: ['Unglamorous but essential. You’ll be glad you stocked up.'],
  beauty: ['A little bit of self-care in your weekly shop.'],
  pets: ['A treat your four-legged friend will go wild for.'],
  home: ['Small upgrade, big difference around the house.'],
  partyware: ['Party sorted, washing up skipped. Grab enough for everyone.', 'Instant party vibes, minimal effort.'],
};

const PROS: Record<string, string[]> = {
  default: ['Great value', 'Good quality', 'Would buy again', 'Tastes great'],
  snacks: ['Great for sharing', 'Moreish', 'Kids love them'],
  wine: ['Easy drinking', 'Great with food', 'Crowd-pleaser'],
  partyware: ['Sturdy', 'Good value', 'Eco-friendly'],
};

const CONS: Record<string, string[]> = {
  default: ['A bit pricey', 'Packaging could be better'],
  snacks: ['Gone too fast', 'Small bag'],
  wine: ['Not for everyone'],
  partyware: ['Thin for hot food'],
};

const QUOTES = {
  high: [
    'Absolutely love this, buy it every week.',
    'Excellent quality, would definitely recommend.',
    'Exactly what I wanted. Great value too.',
    "Can't fault it. Always a hit at home.",
  ],
  mid: ['Pretty good overall, does the job.', "Nice enough, but I've had better.", 'Decent for the price.'],
  low: ['Disappointed, not as good as it used to be.', "Wouldn't buy again, sadly."],
};

const NAMES = ['Sarah', 'James', 'Priya', 'Tom', 'Emma', 'Ali', 'Grace', 'Ben', 'Chloe', 'Dan', 'Mia', 'Leo'];
const MONTHS = ['Sep 2026', 'Aug 2026', 'Jul 2026'];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const pick = <T,>(items: T[], seed: number) => items[seed % items.length];

function reviewsFor(p: RawProduct): Review[] {
  if (!p.reviewCount) return [];
  const used = new Set<string>();
  return Array.from({ length: Math.min(3, p.reviewCount) }, (_, i) => {
    const rating = Math.max(1, Math.min(5, Math.round(p.rating + [0.4, -0.6, 0.2][i])));
    const pool = rating >= 4 ? QUOTES.high : rating === 3 ? QUOTES.mid : QUOTES.low;
    let text = pick(pool, hash(`${p.id}q${i}`));
    for (let j = 1; used.has(text) && j < pool.length; j++) text = pick(pool, hash(`${p.id}q${i}`) + j);
    used.add(text);
    return { author: pick(NAMES, hash(`${p.id}n${i}`)), rating, text, date: MONTHS[i] };
  });
}

export function withPlaceholderCopy(p: RawProduct): Product {
  const seed = hash(p.id);
  const pros = PROS[p.category] ?? PROS.default;
  const cons = CONS[p.category] ?? CONS.default;
  return {
    ...p,
    bio: pick(BIOS[p.category], seed),
    pros: p.reviewCount ? [pick(pros, seed), pick(pros, seed + 1)].filter((x, i, a) => a.indexOf(x) === i) : [],
    cons: p.reviewCount && p.rating < 4.7 ? [pick(cons, seed)] : [],
    reviews: reviewsFor(p),
  };
}

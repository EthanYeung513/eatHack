import type { Product, VideoReview } from '../types';

// Placeholder video reviews: stock clips in /public/videos with made-up
// reviewers, generated deterministically per product.

const CLIPS = ['/videos/review-1.mp4', '/videos/review-2.mp4', '/videos/review-3.mp4', '/videos/review-4.mp4'];

const REVIEWERS = [
  ['Sarah', '@sarahcooks'],
  ['James', '@jamesatthetable'],
  ['Priya', '@priyaeats'],
  ['Tom', '@tomtastes'],
  ['Chloe', '@chloeshops'],
  ['Ali', '@ali.unboxed'],
  ['Grace', '@gracegrocery'],
  ['Ben', '@benbudgetbites'],
];

const CAPTIONS = {
  high: [
    'Honestly obsessed. Third time buying this one.',
    'Taste test! Did not expect it to be this good.',
    'If you see it on offer, grab two. Trust me.',
    'Our whole house rated this. 10/10 from the kids.',
  ],
  mid: [
    'Is it worth the hype? Kind of. Here’s my honest take.',
    'Good, not life-changing. Would buy on offer.',
    'Trying it so you don’t have to: it’s fine!',
  ],
  low: ['Not for me, and here’s why.', 'Expected more for the price, honestly.'],
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const cache = new Map<string, VideoReview[]>();

export function getVideoReviews(product: Product): VideoReview[] {
  if (product.reviewCount === 0) return [];
  const cached = cache.get(product.id);
  if (cached) return cached;

  const seed = hash(product.id);
  const count = 1 + (seed % 3);
  const videos = Array.from({ length: count }, (_, i) => {
    const h = hash(`${product.id}:${i}`);
    const rating = Math.max(1, Math.min(5, Math.round(product.rating + [0.3, -0.5, 0][i])));
    const pool = rating >= 4 ? CAPTIONS.high : rating === 3 ? CAPTIONS.mid : CAPTIONS.low;
    const [author, handle] = REVIEWERS[(seed + i * 3) % REVIEWERS.length];
    return {
      id: `${product.id}-v${i}`,
      author,
      handle,
      rating,
      caption: pool[h % pool.length],
      src: CLIPS[(seed + i) % CLIPS.length],
      duration: '0:10',
    };
  });
  cache.set(product.id, videos);
  return videos;
}

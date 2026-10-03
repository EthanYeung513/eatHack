import type { Product, VideoReview } from '../types';

// Real video reviews from Watch Humans, keyed by product id. Products without an
// entry show no video options at all.
const VIDEOS: Record<string, VideoReview[]> = {
  'oom-balance-12-pack': [
    {
      id: 'oom-balance-12-pack-v1',
      author: 'Watch Humans',
      handle: 'real shopper review',
      rating: 5,
      caption: 'Trying OOM Balance: sparkling peach, blood orange & hops',
      src: '/videos/oom-balance-12-pack.mp4',
      poster: '/videos/oom-balance-12-pack.jpg',
      duration: '1:06',
    },
  ],
  'well-and-truly-cheddar-gouda-thins': [
    {
      id: 'well-and-truly-cheddar-gouda-thins-v1',
      author: 'Watch Humans',
      handle: 'real shopper review',
      rating: 5,
      caption: 'Trying Well & Truly cheddar & Gouda thins with a hint of jalapeño',
      src: '/videos/well-and-truly-cheddar-gouda-thins.mp4',
      poster: '/videos/well-and-truly-cheddar-gouda-thins.jpg',
      duration: '1:30',
    },
  ],
  'flow-salted-caramel-latte': [
    {
      id: 'flow-salted-caramel-latte-v1',
      author: 'Watch Humans',
      handle: 'real shopper review',
      rating: 5,
      caption: 'Trying the Flow mushroom salted caramel iced latte',
      src: '/videos/flow-salted-caramel-latte.mp4',
      poster: '/videos/flow-salted-caramel-latte.jpg',
      duration: '2:41',
    },
  ],
};

export function getVideoReviews(product: Product): VideoReview[] {
  return VIDEOS[product.id] ?? [];
}

/** Products that have a real video review. */
export const VIDEO_PRODUCT_IDS = Object.keys(VIDEOS);

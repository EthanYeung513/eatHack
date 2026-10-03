import type { Product, VideoReview } from '../types';

// Real video reviews, keyed by product id. Products without an entry show no
// video options at all.
const VIDEOS: Record<string, VideoReview[]> = {
  'flow-salted-caramel-latte': [
    {
      id: 'flow-salted-caramel-latte-v1',
      author: 'Shelf shopper',
      handle: 'filmed for Shelf',
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

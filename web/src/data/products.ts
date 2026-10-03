import type { Product } from '../types';
import data from './ocado-products.json';
import { withPlaceholderCopy, type RawProduct } from './placeholderCopy';

// Products added by hand (not in the Ocado export). `featured` puts them first
// in relevant swipe decks. Rating and price are placeholders until we have real data.
const MANUAL: RawProduct[] = [
  {
    id: 'flow-salted-caramel-latte',
    name: 'Flow Mushroom Salted Caramel Iced Latte',
    bio:
      'This delicious iced latte blends nootropic mushrooms and B vitamins, supporting energy, mood and memory. ' +
      'Crafted with creamy British oat milk and salted caramel flavour. With just 63 kcal per can, it is vegan and gluten free!',
    brand: 'Flow',
    price: 2.25,
    size: '250ml can',
    unitPrice: '£0.90/100ml',
    category: 'drinks',
    tags: ['drinks', 'party', 'new'],
    dietary: ['vegan', 'gluten-free'],
    rating: 4.5,
    reviewCount: 24,
    image: '/products/flow-salted-caramel-latte.png',
    badge: 'New',
    partyRole: 'soft',
    nutrition: 'B vitamins · just 63 kcal',
    partner: true,
    featured: true,
  },
];

// Products from a one-off Ocado export, in popularity order. Prices, ratings,
// offers, labels and images are real; bios, pros/cons and review quotes are
// placeholder copy.
export const PRODUCTS: Product[] = [...MANUAL, ...(data as RawProduct[])].map(withPlaceholderCopy);

export const PRODUCTS_BY_ID: Record<string, Product> = Object.fromEntries(
  PRODUCTS.map((p) => [p.id, p]),
);

/** Spotlighted products, shown first in any swipe deck they're relevant to. */
export const FEATURED = PRODUCTS.filter((p) => p.featured);

/** Moves featured products that belong in this deck to the front. */
export function featuredFirst(products: Product[], belongs: (p: Product) => boolean): Product[] {
  const lead = FEATURED.filter(belongs);
  return [...lead, ...products.filter((p) => !lead.includes(p))];
}

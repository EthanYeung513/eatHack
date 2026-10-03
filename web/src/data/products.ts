import type { Product } from '../types';
import data from './ocado-products.json';
import { withPlaceholderCopy, type RawProduct } from './placeholderCopy';

// Products added by hand (not in the Ocado export). `featured` puts them first
// in relevant swipe decks, in this order. Rating and price are placeholders until we have real data.
const MANUAL: RawProduct[] = [
  {
    id: 'oom-balance-12-pack',
    name: 'OOM Balance Sparkling Peach, Blood Orange & Hops (12 Pack)',
    bio: 'Lightly sparkling peach, blood orange and hops functional drink, with Chaga, nootropics, vitamins and adaptogens.',
    brand: 'OOM',
    price: 22.0,
    size: '12 x 250ml',
    unitPrice: '£0.73/100ml',
    category: 'drinks',
    tags: ['drinks', 'party', 'new'],
    dietary: [],
    rating: 4.6,
    reviewCount: 31,
    image: '/products/oom-balance-12-pack.jpg',
    badge: 'New',
    partyRole: 'soft',
    nutrition: 'Nootropics, vitamins & adaptogens',
    partner: true,
    featured: true,
  },
  {
    id: 'well-and-truly-cheddar-gouda-thins',
    name: 'Well & Truly Rich Cheddar & Gouda Thins with a Hint of Jalapeño',
    bio:
      'Indulge in the bold, savoury flavour of these rich cheddar and Gouda thins, perfectly balanced with a subtle kick of jalapeño. ' +
      'Light, crispy and packed with cheesy goodness from mature cheddar and creamy Gouda. Enjoy them on their own, share with friends or pair with your favourite dip.',
    brand: 'Well & Truly',
    price: 2.0,
    size: '70g',
    unitPrice: '£2.86/100g',
    category: 'snacks',
    tags: ['snacks', 'party', 'new'],
    dietary: ['vegetarian', 'gluten-free'],
    rating: 4.4,
    reviewCount: 18,
    image: '/products/well-and-truly-cheddar-gouda-thins.jpg',
    badge: 'New',
    partyRole: 'savoury',
    nutrition: 'Source of protein · 30% less fat',
    partner: true,
    featured: true,
  },
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
    image: '/products/flow-salted-caramel-latte.jpg',
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

import type { Product } from '../types';
import data from './ocado-products.json';
import { withPlaceholderCopy } from './placeholderCopy';

// Products from a one-off Ocado export, in popularity order. Prices, ratings,
// offers, labels and images are real; bios, pros/cons and review quotes are
// placeholder copy, and products marked `placeholder` (party tableware) are made up.
export const PRODUCTS: Product[] = (data as Omit<Product, 'bio' | 'pros' | 'cons' | 'reviews'>[]).map(
  withPlaceholderCopy,
);

export const PRODUCTS_BY_ID: Record<string, Product> = Object.fromEntries(
  PRODUCTS.map((p) => [p.id, p]),
);

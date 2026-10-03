import type { Product } from '../types';
import data from './ocado-products.json';

// Products from a one-off Ocado scrape (sorted by popularity). Prices, ratings,
// offers, dietary labels and images are real; bios, pros/cons and review
// quotes are placeholder copy.
export const PRODUCTS = data as Product[];

export const PRODUCTS_BY_ID: Record<string, Product> = Object.fromEntries(
  PRODUCTS.map((p) => [p.id, p]),
);

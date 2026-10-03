import { Croissant, CupSoda, PartyPopper, Popcorn, Salad, type LucideIcon } from 'lucide-react';
import type { Category } from '../types';

// High-level, aisle-style groupings used to organise the basket.

export interface Aisle {
  id: string;
  label: string;
  icon: LucideIcon;
  tone: 'lime' | 'pink' | 'lavender' | 'sky' | 'butter';
}

export const AISLES: Aisle[] = [
  { id: 'fresh', label: 'Fresh & chilled', icon: Salad, tone: 'lime' },
  { id: 'bakery', label: 'Bakery', icon: Croissant, tone: 'pink' },
  { id: 'snacks', label: 'Snacks & cupboard', icon: Popcorn, tone: 'butter' },
  { id: 'drinks', label: 'Drinks', icon: CupSoda, tone: 'lavender' },
  { id: 'home', label: 'Party & home', icon: PartyPopper, tone: 'sky' },
];

export const AISLE_FOR_CATEGORY: Record<Category, string> = {
  fresh: 'fresh',
  dairy: 'fresh',
  meat: 'fresh',
  dips: 'fresh',
  bakery: 'bakery',
  snacks: 'snacks',
  drinks: 'drinks',
  partyware: 'home',
};

import { Candy, Croissant, Ghost, PawPrint, Salad, Sparkles, Wine, CupSoda, type LucideIcon } from 'lucide-react';
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
  { id: 'cupboard', label: 'Bakery & cupboard', icon: Croissant, tone: 'pink' },
  { id: 'snacks', label: 'Sweets & snacks', icon: Candy, tone: 'butter' },
  { id: 'drinks', label: 'Drinks', icon: CupSoda, tone: 'sky' },
  { id: 'wine', label: 'Beer & wine', icon: Wine, tone: 'lavender' },
  { id: 'halloween', label: 'Halloween & party', icon: Ghost, tone: 'pink' },
  { id: 'pets', label: 'Pets', icon: PawPrint, tone: 'lime' },
  { id: 'household', label: 'Household & beauty', icon: Sparkles, tone: 'sky' },
];

export const AISLE_FOR_CATEGORY: Record<Category, string> = {
  fresh: 'fresh',
  dairy: 'fresh',
  meals: 'fresh',
  bakery: 'cupboard',
  cupboard: 'cupboard',
  snacks: 'snacks',
  drinks: 'drinks',
  wine: 'wine',
  partyware: 'halloween',
  pets: 'pets',
  household: 'household',
};

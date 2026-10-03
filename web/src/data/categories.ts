import {
  Baby,
  Candy,
  Croissant,
  CupSoda,
  Home,
  PartyPopper,
  PawPrint,
  Salad,
  Sparkles,
  SprayCan,
  Wine,
  type LucideIcon,
} from 'lucide-react';
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
  { id: 'cupboard', label: 'Bakery & cupboard', icon: Croissant, tone: 'butter' },
  { id: 'snacks', label: 'Sweets & snacks', icon: Candy, tone: 'pink' },
  { id: 'drinks', label: 'Drinks', icon: CupSoda, tone: 'sky' },
  { id: 'wine', label: 'Beer, wine & spirits', icon: Wine, tone: 'lavender' },
  { id: 'party', label: 'Party & occasions', icon: PartyPopper, tone: 'pink' },
  { id: 'baby', label: 'Baby & kids', icon: Baby, tone: 'sky' },
  { id: 'pets', label: 'Pets', icon: PawPrint, tone: 'lime' },
  { id: 'household', label: 'Household', icon: SprayCan, tone: 'lime' },
  { id: 'beauty', label: 'Health & beauty', icon: Sparkles, tone: 'lavender' },
  { id: 'home', label: 'Home', icon: Home, tone: 'butter' },
];

export const AISLE_FOR_CATEGORY: Record<Category, string> = {
  fresh: 'fresh',
  meat: 'fresh',
  dairy: 'fresh',
  meals: 'fresh',
  bakery: 'cupboard',
  cupboard: 'cupboard',
  snacks: 'snacks',
  drinks: 'drinks',
  wine: 'wine',
  partyware: 'party',
  baby: 'baby',
  pets: 'pets',
  household: 'household',
  beauty: 'beauty',
  home: 'home',
};

import type { CSSProperties } from 'react';
import {
  Candy,
  CupSoda,
  Croissant,
  Ghost,
  Milk,
  Minus,
  PawPrint,
  Plus,
  Soup,
  Sparkles,
  Sprout,
  Utensils,
  Wine,
  type LucideIcon,
} from 'lucide-react';
import { useBasket } from '../state/basket';
import type { Category, Product } from '../types';

// Pastel sticker backgrounds per category.
const CATEGORY_TONE: Record<Category, string> = {
  snacks: 'butter',
  drinks: 'sky',
  wine: 'lavender',
  bakery: 'pink',
  fresh: 'lime',
  dairy: 'sky',
  meals: 'pink',
  cupboard: 'butter',
  pets: 'lime',
  household: 'lavender',
  partyware: 'pink',
};

const CATEGORY_ICON: Record<Category, LucideIcon> = {
  snacks: Candy,
  drinks: CupSoda,
  wine: Wine,
  bakery: Croissant,
  fresh: Sprout,
  dairy: Milk,
  meals: Soup,
  cupboard: Utensils,
  pets: PawPrint,
  household: Sparkles,
  partyware: Ghost,
};

export function ProductThumb({ product, size = 'md' }: { product: Product; size?: 'sm' | 'md' }) {
  const tone = CATEGORY_TONE[product.category];
  if (product.image) {
    return (
      <div className={`thumb thumb-${size} thumb-photo`} aria-hidden>
        <img src={product.image} alt="" draggable={false} />
      </div>
    );
  }
  const Icon = CATEGORY_ICON[product.category];
  return (
    <div className={`thumb thumb-${size} tone-${tone}`} aria-hidden>
      <span className="thumb-icon">
        <Icon strokeWidth={1.75} />
      </span>
    </div>
  );
}

const PACK_SHAPE: Record<Category, 'bag' | 'bottle' | 'tub' | 'box'> = {
  snacks: 'bag',
  drinks: 'bottle',
  wine: 'bottle',
  bakery: 'box',
  fresh: 'box',
  dairy: 'tub',
  meals: 'tub',
  cupboard: 'box',
  pets: 'bag',
  household: 'box',
  partyware: 'box',
};

/** Large product visual: the real photo when we have one, otherwise an illustrated pack. */
export function Packshot({ product }: { product: Product }) {
  const tone = CATEGORY_TONE[product.category];
  if (product.image) {
    return (
      <div className={`packshot tone-${tone}`}>
        <img src={product.image} alt={product.name} draggable={false} />
      </div>
    );
  }
  const Icon = CATEGORY_ICON[product.category];
  return (
    <div className={`packshot tone-${tone}`} aria-hidden>
      <div className={`pack pack-${PACK_SHAPE[product.category]}`}>
        <span className="pack-brand">{product.brand}</span>
        <Icon className="pack-icon" strokeWidth={1.75} />
        {product.size && <span className="pack-size">{product.size}</span>}
      </div>
    </div>
  );
}

export function Stars({ rating, count }: { rating: number; count?: number }) {
  if (count === 0) return <span className="rating rating-count">No reviews yet</span>;
  return (
    <span className="rating" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      <span className="stars" style={{ '--pct': `${(rating / 5) * 100}%` } as CSSProperties} />
      <span className="rating-value">{rating.toFixed(1)}</span>
      {count !== undefined && <span className="rating-count">({count.toLocaleString()})</span>}
    </span>
  );
}

export function QtyStepper({ id, qty, compact }: { id: string; qty: number; compact?: boolean }) {
  const { setQty } = useBasket();
  return (
    <div className={`stepper${compact ? ' stepper-compact' : ''}`}>
      <button type="button" onClick={() => setQty(id, qty - 1)} aria-label="Decrease quantity">
        <Minus size={14} />
      </button>
      <span aria-live="polite">{qty}</span>
      <button type="button" onClick={() => setQty(id, qty + 1)} aria-label="Increase quantity">
        <Plus size={14} />
      </button>
    </div>
  );
}

export function AddToBasket({ product }: { product: Product }) {
  const { qtyOf, add } = useBasket();
  const qty = qtyOf(product.id);
  if (qty > 0) return <QtyStepper id={product.id} qty={qty} />;
  return (
    <button type="button" className="btn btn-primary btn-sm" onClick={() => add(product.id)}>
      <Plus size={15} /> Add
    </button>
  );
}

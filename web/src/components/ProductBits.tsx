import type { CSSProperties } from 'react';
import {
  Apple,
  Beef,
  Cookie,
  Croissant,
  Milk,
  Minus,
  PartyPopper,
  Plus,
  Soup,
  Wine,
  type LucideIcon,
} from 'lucide-react';
import { useBasket } from '../state/basket';
import type { Category, Product } from '../types';

const CATEGORY_ICON: Record<Category, LucideIcon> = {
  snacks: Cookie,
  dips: Soup,
  drinks: Wine,
  bakery: Croissant,
  fresh: Apple,
  dairy: Milk,
  meat: Beef,
  partyware: PartyPopper,
};

export function ProductThumb({ product, size = 'md' }: { product: Product; size?: 'sm' | 'md' | 'lg' }) {
  const Icon = CATEGORY_ICON[product.category];
  return (
    <div className={`thumb thumb-${size}`} style={{ '--h': product.hue } as CSSProperties} aria-hidden>
      <Icon strokeWidth={1.5} />
    </div>
  );
}

export function Stars({ rating, count }: { rating: number; count?: number }) {
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

import { ShoppingBasket, SquarePen } from 'lucide-react';
import { formatPrice, useBasket } from '../state/basket';

export function Logo() {
  return (
    <span className="brand">
      <svg className="brand-mark" viewBox="0 0 28 28" aria-hidden>
        <rect width="28" height="28" rx="8" fill="currentColor" />
        <rect x="7" y="8" width="14" height="2.4" rx="1.2" fill="#fff" />
        <rect x="7" y="12.8" width="10" height="2.4" rx="1.2" fill="#fff" opacity=".8" />
        <rect x="7" y="17.6" width="12" height="2.4" rx="1.2" fill="#fff" opacity=".6" />
      </svg>
      <span className="brand-name">Shelf</span>
    </span>
  );
}

export function Header({
  onNewChat,
  onOpenBasket,
  canReset,
}: {
  onNewChat: () => void;
  onOpenBasket: () => void;
  canReset: boolean;
}) {
  const { count, subtotal } = useBasket();
  return (
    <header className="topbar">
      <Logo />
      <span className="retailer-pill">
        <span className="retailer-dot" />
        Shopping at <strong>Ocado</strong>
      </span>
      <div className="topbar-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onNewChat} disabled={!canReset}>
          <SquarePen size={15} />
          <span className="hide-sm">New chat</span>
        </button>
        <button type="button" className="basket-btn" onClick={onOpenBasket} aria-label={`Basket, ${count} items`}>
          <ShoppingBasket size={18} />
          <span>{formatPrice(subtotal)}</span>
          {count > 0 && <span className="count">{count}</span>}
        </button>
      </div>
    </header>
  );
}

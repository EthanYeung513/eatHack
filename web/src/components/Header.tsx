import { ShoppingBasket, SquarePen } from 'lucide-react';
import { formatPrice, useBasket } from '../state/basket';

export function Logo() {
  return (
    <span className="brand">
      <span className="brand-name">Shelf</span>
    </span>
  );
}

export function Header({
  onHome,
  onNewChat,
  onOpenBasket,
  canReset,
}: {
  /** Back to the welcome screen. */
  onHome: () => void;
  onNewChat: () => void;
  onOpenBasket: () => void;
  canReset: boolean;
}) {
  const { count, subtotal } = useBasket();
  return (
    <header className="topbar">
      <a
        href="/"
        className="brand-link"
        aria-label="Shelf home"
        onClick={(e) => {
          e.preventDefault();
          onHome();
        }}
      >
        <Logo />
      </a>
      <span className="retailer-pill">
        <span className="retailer-dot" />
        Shopping at <strong>Ocado</strong>
      </span>
      <div className="topbar-actions">
        <a href="/dashboard" className="topbar-link hide-sm">
          For brands
        </a>
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

import { ArrowRight, ShoppingBasket, Trash2, X } from 'lucide-react';
import { formatPrice, useBasket } from '../state/basket';
import { ProductThumb, QtyStepper } from './ProductBits';

export const OCADO_MINIMUM = 40;

export function BasketPanel({ onCheckout, onClose }: { onCheckout: () => void; onClose?: () => void }) {
  const { lines, count, subtotal, setQty, clear } = useBasket();
  const toMinimum = Math.max(0, OCADO_MINIMUM - subtotal);

  return (
    <div className="basket">
      <header className="basket-head">
        <div>
          <h2>Basket</h2>
          <span className="muted small">
            {count} item{count === 1 ? '' : 's'} · Ocado
          </span>
        </div>
        <div className="basket-head-actions">
          {lines.length > 0 && (
            <button type="button" className="link-btn" onClick={clear}>
              Clear
            </button>
          )}
          {onClose && (
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close basket">
              <X size={20} />
            </button>
          )}
        </div>
      </header>

      {lines.length === 0 ? (
        <div className="basket-empty">
          <span className="basket-empty-icon">
            <ShoppingBasket size={22} />
          </span>
          <strong>Your basket is empty</strong>
          <p className="muted small">Items you add from the chat or swipe decks will appear here.</p>
        </div>
      ) : (
        <ul className="basket-lines">
          {lines.map(({ product, qty }) => (
            <li key={product.id}>
              <ProductThumb product={product} size="sm" />
              <div className="basket-line-info">
                <span className="basket-line-name">{product.name}</span>
                <span className="muted small">
                  {product.size} · {formatPrice(product.price)}
                </span>
                <div className="basket-line-controls">
                  <QtyStepper id={product.id} qty={qty} compact />
                  <button
                    type="button"
                    className="icon-btn icon-btn-sm"
                    onClick={() => setQty(product.id, 0)}
                    aria-label={`Remove ${product.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <span className="price">{formatPrice(product.price * qty)}</span>
            </li>
          ))}
        </ul>
      )}

      <footer className="basket-foot">
        {lines.length > 0 && (
          <div className="minimum">
            <div className="minimum-bar">
              <span style={{ width: `${Math.min(100, (subtotal / OCADO_MINIMUM) * 100)}%` }} />
            </div>
            <span className="muted small">
              {toMinimum > 0
                ? `${formatPrice(toMinimum)} to reach Ocado's ${formatPrice(OCADO_MINIMUM)} minimum`
                : 'Minimum order reached'}
            </span>
          </div>
        )}
        <div className="basket-total">
          <span>Subtotal</span>
          <strong>{formatPrice(subtotal)}</strong>
        </div>
        <button type="button" className="btn btn-primary btn-block" disabled={!lines.length} onClick={onCheckout}>
          Checkout on Ocado <ArrowRight size={16} />
        </button>
      </footer>
    </div>
  );
}

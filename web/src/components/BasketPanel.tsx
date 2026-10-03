import { ArrowRight, ChevronDown, ShoppingBasket, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AISLES, AISLE_FOR_CATEGORY } from '../data/categories';
import { formatPrice, useBasket } from '../state/basket';
import { ProductThumb, QtyStepper } from './ProductBits';

export const OCADO_MINIMUM = 40;

export function BasketPanel({ onCheckout, onClose }: { onCheckout: () => void; onClose?: () => void }) {
  const { lines, count, subtotal, setQty, clear } = useBasket();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toMinimum = Math.max(0, OCADO_MINIMUM - subtotal);

  const groups = useMemo(
    () =>
      AISLES.map((aisle) => ({
        aisle,
        lines: lines.filter((l) => AISLE_FOR_CATEGORY[l.product.category] === aisle.id),
      })).filter((g) => g.lines.length > 0),
    [lines],
  );

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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
        <div className="basket-lines">
          {groups.map(({ aisle, lines: aisleLines }) => {
            const isCollapsed = collapsed.has(aisle.id);
            const aisleCount = aisleLines.reduce((n, l) => n + l.qty, 0);
            const aisleTotal = aisleLines.reduce((sum, l) => sum + l.qty * l.product.price, 0);
            const Icon = aisle.icon;
            return (
              <section key={aisle.id} className="basket-group">
                <button
                  type="button"
                  className="basket-group-head"
                  onClick={() => toggle(aisle.id)}
                  aria-expanded={!isCollapsed}
                >
                  <span className={`basket-group-icon tone-${aisle.tone}`}>
                    <Icon size={15} />
                  </span>
                  <span className="basket-group-label">
                    {aisle.label}
                    <span className="muted small">
                      {aisleCount} item{aisleCount === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className="price">{formatPrice(aisleTotal)}</span>
                  <ChevronDown size={16} className={`basket-group-chevron${isCollapsed ? ' collapsed' : ''}`} />
                </button>
                {!isCollapsed && (
                  <ul>
                    {aisleLines.map(({ product, qty }) => (
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
              </section>
            );
          })}
        </div>
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

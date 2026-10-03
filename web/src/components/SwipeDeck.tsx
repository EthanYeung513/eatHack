import { Check, Heart, RotateCcw, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { formatPrice, useBasket } from '../state/basket';
import type { Product, SwipeResult } from '../types';
import { ProductThumb, Stars } from './ProductBits';

type Direction = 'left' | 'right';

interface Decision {
  product: Product;
  dir: Direction;
}

const THRESHOLD = 110;
const EXIT_MS = 260;

export function SwipeDeck({
  title,
  products,
  onClose,
}: {
  title: string;
  products: Product[];
  onClose: (result: SwipeResult) => void;
}) {
  const { add, qtyOf, setQty } = useBasket();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [exiting, setExiting] = useState<Direction | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);

  const index = decisions.length;
  const current = products[index];
  const done = index >= products.length;
  const added = decisions.filter((d) => d.dir === 'right').map((d) => d.product);

  const decide = useCallback(
    (dir: Direction) => {
      if (exiting || !current) return;
      setExiting(dir);
      if (dir === 'right') add(current.id);
      window.setTimeout(() => {
        setDecisions((d) => [...d, { product: current, dir }]);
        setExiting(null);
        setDrag({ x: 0, y: 0, active: false });
      }, EXIT_MS);
    },
    [add, current, exiting],
  );

  const undo = useCallback(() => {
    const last = decisions[decisions.length - 1];
    if (!last || exiting) return;
    if (last.dir === 'right') setQty(last.product.id, qtyOf(last.product.id) - 1);
    setDecisions((d) => d.slice(0, -1));
  }, [decisions, exiting, qtyOf, setQty]);

  const close = useCallback(() => {
    onClose({
      added,
      skipped: decisions.filter((d) => d.dir === 'left').map((d) => d.product),
    });
  }, [added, decisions, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') decide('right');
      else if (e.key === 'ArrowLeft') decide('left');
      else if (e.key === 'Escape') close();
      else if (e.key === 'Backspace' || (e.key === 'z' && (e.metaKey || e.ctrlKey))) undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [decide, close, undo]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const onPointerDown = (e: PointerEvent) => {
    if (exiting) return;
    origin.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ x: 0, y: 0, active: true });
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!origin.current) return;
    setDrag({ x: e.clientX - origin.current.x, y: e.clientY - origin.current.y, active: true });
  };
  const onPointerUp = () => {
    if (!origin.current) return;
    origin.current = null;
    if (Math.abs(drag.x) > THRESHOLD) decide(drag.x > 0 ? 'right' : 'left');
    else setDrag({ x: 0, y: 0, active: false });
  };

  const topTransform = exiting
    ? `translate(${exiting === 'right' ? 140 : -140}%, ${drag.y}px) rotate(${exiting === 'right' ? 18 : -18}deg)`
    : `translate(${drag.x}px, ${drag.y * 0.3}px) rotate(${drag.x / 18}deg)`;
  const intent = exiting ? (exiting === 'right' ? 1 : -1) : Math.max(-1, Math.min(1, drag.x / THRESHOLD));
  const addedTotal = added.reduce((sum, p) => sum + p.price, 0);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={`${title} swipe deck`}>
      <div className="deck">
        <header className="deck-head">
          <button type="button" className="icon-btn" onClick={close} aria-label="Close">
            <X size={20} />
          </button>
          <div className="deck-title">
            <strong>{title}</strong>
            <span className="muted small">
              {done ? 'All done' : `${index + 1} of ${products.length}`} · {added.length} added
            </span>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={undo}
            disabled={!decisions.length}
            aria-label="Undo last swipe"
            title="Undo"
          >
            <RotateCcw size={18} />
          </button>
        </header>

        <div className="deck-progress">
          <span style={{ width: `${(index / products.length) * 100}%` }} />
        </div>

        {done ? (
          <div className="deck-summary">
            <div className="summary-icon">
              <Check size={26} />
            </div>
            <h3>{added.length ? `${added.length} added to your basket` : 'Nothing added this time'}</h3>
            <p className="muted">
              {added.length
                ? `${formatPrice(addedTotal)} of ${title.toLowerCase()} from ${products.length} reviewed.`
                : 'No problem. Head back to the chat and try a different angle.'}
            </p>
            {added.length > 0 && (
              <ul className="summary-list">
                {added.map((p) => (
                  <li key={p.id}>
                    <ProductThumb product={p} size="sm" />
                    <span>{p.name}</span>
                    <span className="price">{formatPrice(p.price)}</span>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="btn btn-primary btn-block" onClick={close}>
              Back to chat
            </button>
          </div>
        ) : (
          <>
            <div className="deck-stack">
              {products
                .slice(index, index + 3)
                .map((p, i) => {
                  const isTop = i === 0;
                  const style = isTop
                    ? {
                        transform: topTransform,
                        transition: drag.active ? 'none' : `transform ${EXIT_MS}ms ease`,
                      }
                    : {
                        transform: `translateY(${i * 10}px) scale(${1 - i * 0.04})`,
                      };
                  return (
                    <div
                      key={p.id}
                      className={`swipe-card${isTop ? ' is-top' : ''}`}
                      style={style}
                      onPointerDown={isTop ? onPointerDown : undefined}
                      onPointerMove={isTop ? onPointerMove : undefined}
                      onPointerUp={isTop ? onPointerUp : undefined}
                      onPointerCancel={isTop ? onPointerUp : undefined}
                      aria-hidden={!isTop}
                    >
                      {isTop && (
                        <>
                          <span className="stamp stamp-add" style={{ opacity: Math.max(0, intent) }}>
                            Add
                          </span>
                          <span className="stamp stamp-skip" style={{ opacity: Math.max(0, -intent) }}>
                            Skip
                          </span>
                        </>
                      )}
                      <SwipeCardBody product={p} />
                    </div>
                  );
                })
                .reverse()}
            </div>

            <div className="deck-actions">
              <button type="button" className="round-btn skip" onClick={() => decide('left')} aria-label="Skip">
                <X size={26} />
              </button>
              <button type="button" className="round-btn add" onClick={() => decide('right')} aria-label="Add to basket">
                <Heart size={26} />
              </button>
            </div>
            <p className="deck-hint muted small">
              Drag the card, or use <kbd>←</kbd> <kbd>→</kbd> on your keyboard
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function SwipeCardBody({ product }: { product: Product }) {
  const review = product.reviews[0];
  return (
    <>
      <div className="swipe-media">
        <ProductThumb product={product} size="lg" />
        {product.badge && <span className="badge-pill">{product.badge}</span>}
      </div>
      <div className="swipe-body">
        <div className="swipe-row">
          <span className="muted small">{product.brand}</span>
          <span className="muted small">{product.size}</span>
        </div>
        <h3>{product.name}</h3>
        <div className="swipe-row">
          <Stars rating={product.rating} count={product.reviewCount} />
          <span className="price price-lg">{formatPrice(product.price)}</span>
        </div>
        {review && <p className="swipe-quote">“{review.text}”</p>}
        {product.dietary.length > 0 && (
          <div className="chips">
            {product.dietary.map((d) => (
              <span key={d} className="chip">
                {d}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

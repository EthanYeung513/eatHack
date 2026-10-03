import { Check, Heart, RotateCcw, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { formatPrice, useBasket } from '../state/basket';
import type { Product, SwipeResult } from '../types';
import { Packshot, ProductThumb, Stars } from './ProductBits';
import { VideoPill } from './VideoReviews';

type Direction = 'left' | 'right';

interface Decision {
  product: Product;
  dir: Direction;
}

const THRESHOLD = 90;
const EXIT_MS = 260;

const isTyping = () => {
  const el = document.activeElement;
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el as HTMLElement)?.isContentEditable;
};

/** Swipe deck rendered inline in a chat message. */
export function SwipeDeck({
  title,
  products,
  keyboardActive,
  onComplete,
}: {
  title: string;
  products: Product[];
  /** Only the newest deck in the chat listens to arrow keys. */
  keyboardActive: boolean;
  onComplete: (result: SwipeResult) => void;
}) {
  const { add, qtyOf, setQty } = useBasket();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [finished, setFinished] = useState(false);
  const [drag, setDrag] = useState({ x: 0, active: false });
  const [exiting, setExiting] = useState<Direction | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);

  const index = decisions.length;
  const current = products[index];
  const done = finished || index >= products.length;
  const added = decisions.filter((d) => d.dir === 'right').map((d) => d.product);

  const finish = useCallback(
    (all: Decision[]) => {
      setFinished(true);
      onComplete({
        added: all.filter((d) => d.dir === 'right').map((d) => d.product),
        skipped: all.filter((d) => d.dir === 'left').map((d) => d.product),
      });
    },
    [onComplete],
  );

  const decide = useCallback(
    (dir: Direction) => {
      if (exiting || !current || done) return;
      setExiting(dir);
      if (dir === 'right') add(current.id);
      window.setTimeout(() => {
        const next = [...decisions, { product: current, dir }];
        setDecisions(next);
        setExiting(null);
        setDrag({ x: 0, active: false });
        if (next.length >= products.length) finish(next);
      }, EXIT_MS);
    },
    [add, current, decisions, done, exiting, finish, products.length],
  );

  const undo = useCallback(() => {
    const last = decisions[decisions.length - 1];
    if (!last || exiting || done) return;
    if (last.dir === 'right') setQty(last.product.id, qtyOf(last.product.id) - 1);
    setDecisions((d) => d.slice(0, -1));
  }, [decisions, done, exiting, qtyOf, setQty]);

  const restart = () => {
    setDecisions([]);
    setFinished(false);
  };

  useEffect(() => {
    if (!keyboardActive || done) return;
    const onKey = (e: KeyboardEvent) => {
      if (isTyping()) return;
      if (e.key === 'ArrowRight') decide('right');
      else if (e.key === 'ArrowLeft') decide('left');
      else if (e.key === 'z' && (e.metaKey || e.ctrlKey)) undo();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [keyboardActive, done, decide, undo]);

  const onPointerDown = (e: PointerEvent) => {
    if (exiting) return;
    origin.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ x: 0, active: true });
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!origin.current) return;
    setDrag({ x: e.clientX - origin.current.x, active: true });
  };
  const onPointerUp = () => {
    if (!origin.current) return;
    origin.current = null;
    if (Math.abs(drag.x) > THRESHOLD) decide(drag.x > 0 ? 'right' : 'left');
    else setDrag({ x: 0, active: false });
  };

  const topTransform = exiting
    ? `translate(${exiting === 'right' ? 130 : -130}%, 0) rotate(${exiting === 'right' ? 16 : -16}deg)`
    : `translate(${drag.x}px, 0) rotate(${drag.x / 20}deg)`;
  const intent = exiting ? (exiting === 'right' ? 1 : -1) : Math.max(-1, Math.min(1, drag.x / THRESHOLD));
  const addedTotal = added.reduce((sum, p) => sum + p.price, 0);

  return (
    <section className="deck" aria-label={`${title} swipe deck`}>
      <header className="deck-head">
        <div className="deck-title">
          <strong>{title}</strong>
          <span className="muted small">
            {done ? `${index} of ${products.length} reviewed` : `${index + 1} of ${products.length}`} ·{' '}
            {added.length} added
          </span>
        </div>
        {!done && (
          <div className="deck-head-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={undo}
              disabled={!decisions.length}
              aria-label="Undo last swipe"
              title="Undo"
            >
              <RotateCcw size={17} />
            </button>
            <button
              type="button"
              className="deck-finish"
              onClick={() => finish(decisions)}
              disabled={!decisions.length}
            >
              Done
            </button>
          </div>
        )}
      </header>

      <div className="deck-progress">
        <span style={{ width: `${(done ? 1 : index / products.length) * 100}%` }} />
      </div>

      {done ? (
        <div className="deck-summary">
          <div className="summary-icon">
            <Check size={24} />
          </div>
          <h3>{added.length ? `${added.length} added to your basket` : 'Nothing added this time'}</h3>
          <p className="muted">
            {added.length
              ? `${formatPrice(addedTotal)} from ${index} reviewed.`
              : 'No problem. Try a different angle in the chat.'}
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
          <button type="button" className="btn btn-primary btn-sm" onClick={restart}>
            <RotateCcw size={15} /> Swipe again
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
                  : { transform: `translateY(${i * 10}px) scale(${1 - i * 0.04})` };
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
              <X size={24} />
            </button>
            <button type="button" className="round-btn add" onClick={() => decide('right')} aria-label="Add to basket">
              <Heart size={24} />
            </button>
          </div>
          {keyboardActive && (
            <p className="deck-hint muted small">
              Drag the card, or use <kbd>←</kbd> <kbd>→</kbd>
            </p>
          )}
        </>
      )}
    </section>
  );
}

const GREAT_FOR: Record<string, string> = {
  halloween: 'Halloween',
  party: 'Parties',
  sparkling: 'Celebrations',
  breakfast: 'Breakfast',
  dinner: 'Easy dinners',
  kids: 'Kids',
  pets: 'Pets',
  snacks: 'Snacking',
};

function SwipeCardBody({ product }: { product: Product }) {
  const greatFor = product.tags.map((t) => GREAT_FOR[t]).filter(Boolean).slice(0, 3);
  return (
    <>
      <div className="swipe-media">
        <Packshot product={product} />
        {product.badge && <span className="badge-pill">{product.badge}</span>}
        {product.offer && <span className="offer-pill">{product.offer}</span>}
        <VideoPill product={product} />
        <span className="swipe-price">
          {product.wasPrice && <s>{formatPrice(product.wasPrice)}</s>}
          {formatPrice(product.price)}
        </span>
      </div>
      <div className="swipe-body">
        <div>
          <h3>{product.name}</h3>
          <div className="swipe-meta">
            <span className="muted small">{[product.brand, product.size].filter(Boolean).join(' · ')}</span>
            <Stars rating={product.rating} count={product.reviewCount} />
          </div>
        </div>
        <p className="swipe-bio">{product.bio}</p>
        {(greatFor.length > 0 || product.dietary.length > 0) && (
          <div className="swipe-tags">
            <span className="swipe-tags-label">Great for</span>
            {greatFor.map((g) => (
              <span key={g} className="chip chip-outline">
                {g}
              </span>
            ))}
            {product.dietary.map((d) => (
              <span key={d} className="chip chip-pos">
                {d}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

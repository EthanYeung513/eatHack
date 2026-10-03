import { Check, Dumbbell, Handshake, Heart, Layers, Play, RotateCcw, Tag, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { getVideoReviews } from '../data/videoReviews';
import { nextSet, SET_SIZE, type NextSet as NextSetResult } from '../services/narrowing';
import { nudgeFor } from '../services/partyPlanner';
import { formatPrice, useBasket } from '../state/basket';
import { logNudge } from '../state/nudgeLog';
import type { DeckConfig, DeckEndReason, Direction, NudgeType, Product, SwipeLogEntry, SwipeResult } from '../types';
import { Packshot, ProductThumb, Stars } from './ProductBits';
import { useOpenVideoReviews, VideoPill } from './VideoReviews';

type Decision = SwipeLogEntry;

const THRESHOLD = 90;
const EXIT_MS = 260;
/** Cards are served in sets of this size, with a checkpoint between sets. */
const BATCH = SET_SIZE;

// Slowdown: after a few swipes, the latest decisions take much longer than the first ones.
const SLOW_MIN_SWIPES = 6;
const average = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
function slowedDown(decisions: Decision[]) {
  if (decisions.length < SLOW_MIN_SWIPES) return false;
  const ms = decisions.map((d) => d.ms);
  return average(ms.slice(-3)) > Math.max(2500, average(ms.slice(0, 3)) * 1.8);
}

const SUMMARY_TITLE: Record<DeckEndReason, (added: number) => string> = {
  complete: (n) => (n ? `${n} added to your basket` : 'Nothing added this time'),
  manual: (n) => (n ? `${n} added to your basket` : 'Nothing added this time'),
  checkpoint: (n) => (n ? `Great start: ${n} added` : 'Got it, noted'),
  slowdown: () => 'Looks like you’ve found the good stuff',
};

const isTyping = () => {
  const el = document.activeElement;
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el as HTMLElement)?.isContentEditable;
};

interface SetBounds {
  start: number;
  end: number;
  label?: string;
}

/** Fixed decks are cut into sets of five up front. */
const chunk = (n: number): SetBounds[] =>
  Array.from({ length: Math.ceil(n / BATCH) }, (_, i) => ({ start: i * BATCH, end: Math.min(n, (i + 1) * BATCH) }));

/** Swipe deck rendered inline in a chat message. */
export function SwipeDeck({
  title,
  products,
  config = { kind: 'standard' },
  keyboardActive,
  onComplete,
}: {
  title: string;
  /** The cards, or for a narrowing deck the pool each set is drawn from. */
  products: Product[];
  config?: DeckConfig;
  /** Only the newest deck in the chat listens to arrow keys. */
  keyboardActive: boolean;
  onComplete: (result: SwipeResult) => void;
}) {
  const { add, qtyOf, setQty } = useBasket();
  const narrow = config.narrow;
  const nudgeOf = useCallback(
    (p: Product): NudgeType | undefined =>
      config.nudges?.[p.id] ?? (config.kind === 'targeted' ? nudgeFor(p) : undefined),
    [config],
  );

  // A narrowing deck builds each set from the swipes so far; a fixed deck has all its cards up front.
  const initial = useCallback(() => {
    if (!narrow) return { queue: products, bounds: chunk(products.length) };
    const first = nextSet(products, narrow.seed ?? [], narrow.startStage, {
      nudgeOf: (p) => nudgeOf(p) ?? 'none',
      areas: narrow.areas,
    });
    return { queue: first.products, bounds: [{ start: 0, end: first.products.length, label: first.label }] };
  }, [narrow, nudgeOf, products]);

  const [{ queue, bounds }, setDeck] = useState(initial);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [endReason, setEndReason] = useState<DeckEndReason | null>(null);
  const [drag, setDrag] = useState({ x: 0, active: false });
  const [exiting, setExiting] = useState<Direction | null>(null);
  // Between sets of five: the next set waits until the shopper asks for it.
  const [paused, setPaused] = useState(false);
  const [upcoming, setUpcoming] = useState<NextSetResult | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const shownAt = useRef(performance.now());

  const index = decisions.length;
  const current = queue[index];
  const done = endReason !== null;
  const added = decisions.filter((d) => d.dir === 'right').map((d) => d.product);
  // While paused, the set just finished is still the one on show.
  const setIdx = Math.max(
    0,
    bounds.findIndex((b) => (paused ? b.end === index : index >= b.start && index < b.end)),
  );
  const bound = bounds[setIdx] ?? bounds[bounds.length - 1];
  const totalSets = narrow ? narrow.maxSets : bounds.length;

  // Response time is measured from when each card reaches the top of the stack.
  useEffect(() => {
    shownAt.current = performance.now();
  }, [index]);

  const finish = useCallback(
    (all: Decision[], reason: DeckEndReason) => {
      setEndReason(reason);
      setPaused(false);
      onComplete({
        added: all.filter((d) => d.dir === 'right').map((d) => d.product),
        skipped: all.filter((d) => d.dir === 'left').map((d) => d.product),
        log: all,
        reason,
      });
    },
    [onComplete],
  );

  /** At the end of a set: line up the next one, or finish if there isn't one. */
  const endOfSet = useCallback(
    (all: Decision[]) => {
      if (!narrow) {
        if (all.length < queue.length) setPaused(true);
        else finish(all, 'complete');
        return;
      }
      const shownSets = bounds.length;
      const next =
        shownSets < narrow.maxSets
          ? nextSet(products, [...(narrow.seed ?? []), ...all], narrow.startStage + shownSets, {
              exclude: new Set(queue.map((p) => p.id)),
              nudgeOf: (p) => nudgeOf(p) ?? 'none',
              areas: narrow.areas,
            })
          : null;
      if (next?.products.length) {
        setUpcoming(next);
        setPaused(true);
      } else finish(all, 'complete');
    },
    [bounds.length, finish, narrow, nudgeOf, products, queue],
  );

  const decide = useCallback(
    (dir: Direction) => {
      if (exiting || !current || done || paused) return;
      const ms = performance.now() - shownAt.current;
      if (nudgeOf(current) === 'partner') {
        logNudge({
          experiment: 'social-proof',
          productId: current.id,
          outcome: dir === 'right' ? 'converted' : 'skipped',
          ms: Math.round(ms),
        });
      }
      setExiting(dir);
      if (dir === 'right') add(current.id);
      window.setTimeout(() => {
        const next = [...decisions, { product: current, dir, ms, nudge: nudgeOf(current) }];
        setDecisions(next);
        setExiting(null);
        setDrag({ x: 0, active: false });
        if (config.stopAfter && next.length >= config.stopAfter) finish(next, 'checkpoint');
        else if (config.detectSlowdown && slowedDown(next)) finish(next, 'slowdown');
        else if (next.length >= bound.end) endOfSet(next);
      }, EXIT_MS);
    },
    [add, bound.end, config, current, decisions, done, endOfSet, exiting, finish, nudgeOf, paused],
  );

  // Undo stays within the current set once a narrowed set has been built from it.
  const canUndo = decisions.length > 0 && !(narrow && !paused && index === bound.start && setIdx > 0);

  const undo = useCallback(() => {
    const last = decisions[decisions.length - 1];
    if (!last || exiting || done || !canUndo) return;
    if (last.dir === 'right') setQty(last.product.id, qtyOf(last.product.id) - 1);
    setPaused(false);
    setUpcoming(null);
    setDecisions((d) => d.slice(0, -1));
  }, [canUndo, decisions, done, exiting, qtyOf, setQty]);

  const restart = () => {
    setDeck(initial());
    setDecisions([]);
    setEndReason(null);
    setPaused(false);
    setUpcoming(null);
  };

  const showNextSet = () => {
    if (narrow && upcoming) {
      setDeck((d) => ({
        queue: [...d.queue, ...upcoming.products],
        bounds: [
          ...d.bounds,
          { start: d.queue.length, end: d.queue.length + upcoming.products.length, label: upcoming.label },
        ],
      }));
      setUpcoming(null);
    }
    setPaused(false);
    // Time spent on the checkpoint doesn't count towards the next card's response time.
    shownAt.current = performance.now();
  };

  useEffect(() => {
    if (!keyboardActive || done) return;
    const onKey = (e: KeyboardEvent) => {
      if (isTyping()) return;
      if (paused && e.key === 'Enter') showNextSet();
      else if (e.key === 'ArrowRight') decide('right');
      else if (e.key === 'ArrowLeft') decide('left');
      else if (e.key === 'z' && (e.metaKey || e.ctrlKey)) undo();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const openVideo = useOpenVideoReviews();
  // Whether the press started on the card's video, so a tap there opens the full review.
  const pressedVideo = useRef(false);

  const onPointerDown = (e: PointerEvent) => {
    if (exiting) return;
    origin.current = { x: e.clientX, y: e.clientY };
    pressedVideo.current = !!(e.target as HTMLElement).closest('.swipe-video');
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ x: 0, active: true });
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!origin.current) return;
    setDrag({ x: e.clientX - origin.current.x, active: true });
  };
  const onPointerUp = (e: PointerEvent) => {
    if (!origin.current) return;
    const moved = Math.hypot(e.clientX - origin.current.x, e.clientY - origin.current.y);
    origin.current = null;
    if (Math.abs(drag.x) > THRESHOLD) decide(drag.x > 0 ? 'right' : 'left');
    else {
      setDrag({ x: 0, active: false });
      // A tap (not a drag) on the video opens the full review.
      if (pressedVideo.current && moved < 8 && current) openVideo(current);
    }
  };
  // Scrolling past the card cancels the press: never counts as a swipe or a tap.
  const onPointerCancel = () => {
    origin.current = null;
    setDrag({ x: 0, active: false });
  };

  const topTransform = exiting
    ? `translate(${exiting === 'right' ? 130 : -130}%, 0) rotate(${exiting === 'right' ? 16 : -16}deg)`
    : `translate(${drag.x}px, 0) rotate(${drag.x / 20}deg)`;
  const intent = exiting ? (exiting === 'right' ? 1 : -1) : Math.max(-1, Math.min(1, drag.x / THRESHOLD));
  const addedTotal = added.reduce((sum, p) => sum + p.price, 0);
  const setSize = bound.end - bound.start;
  const remaining = queue.length - index;

  return (
    <section className="deck" aria-label={`${title} swipe deck`}>
      <header className="deck-head">
        <div className="deck-title">
          <strong>{title}</strong>
          <span className="muted small">
            {done
              ? `${index} reviewed`
              : paused
                ? `Set ${setIdx + 1} done`
                : `${index - bound.start + 1} of ${setSize}${totalSets > 1 ? ` · set ${setIdx + 1}/${totalSets}` : ''}`}{' '}
            · {added.length} added
          </span>
        </div>
        {!done && (
          <div className="deck-head-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={undo}
              disabled={!canUndo}
              aria-label="Undo last swipe"
              title="Undo"
            >
              <RotateCcw size={17} />
            </button>
            <button
              type="button"
              className="deck-finish"
              onClick={() => finish(decisions, 'manual')}
              disabled={!decisions.length}
            >
              Done
            </button>
          </div>
        )}
      </header>

      {narrow && !done && bound.label && (
        <span className={`deck-focus stage-${Math.min(narrow.startStage + setIdx, 2)}`}>{bound.label}</span>
      )}

      <div className="deck-progress">
        <span style={{ width: `${(done || paused ? 1 : (index - bound.start) / setSize) * 100}%` }} />
      </div>

      {done ? (
        <div className="deck-summary">
          <div className="summary-icon">
            <Check size={24} />
          </div>
          <h3>{SUMMARY_TITLE[endReason ?? 'complete'](added.length)}</h3>
          <p className="muted">
            {added.length
              ? `${added.length} added · ${formatPrice(addedTotal)} from ${index} reviewed.`
              : config.kind === 'standard'
                ? 'No problem. Try a different angle in the chat.'
                : 'No problem, that helps me too.'}
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
          {/* Party decks move the conversation on, so they aren't replayable. */}
          {config.kind === 'standard' && (
            <button type="button" className="btn btn-primary btn-sm" onClick={restart}>
              <RotateCcw size={15} /> Swipe again
            </button>
          )}
        </div>
      ) : paused ? (
        <div className="deck-summary">
          <div className="summary-icon">
            <Check size={24} />
          </div>
          <h3>That’s {setSize}</h3>
          <p className="muted">
            {decisions.slice(bound.start, bound.end).filter((d) => d.dir === 'right').length} added from this set
            {narrow ? '.' : ` · ${remaining} more to go.`}
          </p>
          {upcoming && (
            <p className="deck-next">
              Next up, based on your swipes: <strong>{upcoming.label}</strong>
            </p>
          )}
          <button type="button" className="btn btn-primary btn-sm" onClick={showNextSet}>
            <Layers size={15} /> Show {upcoming ? upcoming.products.length : Math.min(BATCH, remaining)} more
          </button>
          <button type="button" className="link-btn" onClick={() => finish(decisions, 'manual')}>
            That’s enough
          </button>
        </div>
      ) : (
        <>
          <div className="deck-stack">
            {queue
              // Only this set's cards are stacked; the next set doesn't peek through.
              .slice(index, Math.min(index + 3, bound.end))
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
                    onPointerCancel={isTop ? onPointerCancel : undefined}
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
                    <SwipeCardBody product={p} nudge={nudgeOf(p)} isTop={isTop} />
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

function SwipeCardBody({ product, nudge, isTop }: { product: Product; nudge?: NudgeType; isTop: boolean }) {
  const greatFor = product.tags
    .map((t) => GREAT_FOR[t])
    .filter(Boolean)
    .slice(0, 3);
  const video = nudge === 'partner' ? getVideoReviews(product)[0] : undefined;
  return (
    <>
      <div className="swipe-media">
        {video ? (
          // Partner nudge: the shopper video plays right on the card.
          <div className="swipe-video" title="Tap to watch the full review">
            {isTop && <video src={video.src} poster={video.poster} autoPlay muted loop playsInline />}
            <span className="swipe-video-play" aria-hidden>
              <Play size={22} fill="currentColor" />
            </span>
            <span className="swipe-video-label">
              {video.author} · {video.handle}
            </span>
            <span className="swipe-video-thumb">
              <ProductThumb product={product} size="sm" />
            </span>
          </div>
        ) : (
          <Packshot product={product} />
        )}
        {product.badge && !video && <span className="badge-pill">{product.badge}</span>}
        {product.offer && nudge !== 'offer' && <span className="offer-pill">{product.offer}</span>}
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
        {nudge && nudge !== 'none' ? (
          <NudgeCallout product={product} nudge={nudge} />
        ) : (
          <>
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
          </>
        )}
      </div>
    </>
  );
}

function NudgeCallout({ product, nudge }: { product: Product; nudge: Exclude<NudgeType, 'none'> }) {
  if (nudge === 'offer') {
    const saving = product.wasPrice ? product.wasPrice - product.price : 0;
    return (
      <div className="nudge nudge-offer">
        <span className="nudge-icon">
          <Tag size={16} />
        </span>
        <div>
          <strong>Good deal: {product.offer}</strong>
          <span>
            {saving > 0 ? `You save ${formatPrice(saving)} today.` : 'One of the best offers in this aisle right now.'}
          </span>
        </div>
      </div>
    );
  }
  if (nudge === 'nutrition') {
    return (
      <div className="nudge nudge-nutrition">
        <span className="nudge-icon">
          <Dumbbell size={16} />
        </span>
        <div>
          <strong>{product.nutrition}</strong>
          <span>A smarter pick that still feels like a treat.</span>
        </div>
      </div>
    );
  }
  return (
    <div className="nudge nudge-partner">
      <span className="nudge-icon">
        <Handshake size={16} />
      </span>
      <div>
        <strong>Watch Humans · real shoppers on video</strong>
        <span>{product.brand} is a partner brand. Tap the video button for the full review.</span>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { useBasket } from '../state/basket';
import { logNudge } from '../state/nudgeLog';
import type { ShelfPick } from '../services/partyUsage';
import type { Product } from '../types';

// Loss-aversion nudge on one last-minute shelf pick at checkout: "The special
// offer for this product will go in 10s". The countdown starts once the card is
// actually on screen, and runs once per session.

export const FLASH_SECONDS = 10;

/** Roughly 20% off, in 5p steps, at least 25p. */
export const flashSaving = (price: number) => Math.max(0.25, Math.round(price * 0.2 * 20) / 20);

/** The pick most likely to tip into a buy: not already in the trolley, and an easy impulse price. */
export function pickFlashTarget(picks: ShelfPick[]): Product | undefined {
  const fresh = picks.filter((p) => !p.again);
  return (fresh.find((p) => p.product.price <= 5) ?? fresh[0])?.product;
}

export type FlashState = 'waiting' | 'live' | 'taken' | 'expired';

export function useFlashOffer(product: Product | undefined, onDone?: () => void) {
  const { add, applyFlash } = useBasket();
  const [state, setState] = useState<FlashState>('waiting');
  const [left, setLeft] = useState(FLASH_SECONDS);
  const startedAt = useRef(0);
  const observed = useRef<HTMLElement | null>(null);
  const saving = product ? flashSaving(product.price) : 0;

  // Start the clock when at least half the card is visible.
  const ref = useCallback(
    (el: HTMLElement | null) => {
      observed.current = el;
      if (!el || state !== 'waiting') return;
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            startedAt.current = performance.now();
            setState('live');
            io.disconnect();
          }
        },
        { threshold: 0.5 },
      );
      io.observe(el);
    },
    [state],
  );

  useEffect(() => {
    if (state !== 'live' || !product) return;
    if (left <= 0) {
      setState('expired');
      logNudge({ experiment: 'loss-aversion', productId: product.id, outcome: 'expired', ms: FLASH_SECONDS * 1000 });
      onDone?.();
      return;
    }
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left, onDone, product, state]);

  const take = () => {
    if (!product || state !== 'live') return;
    add(product.id);
    applyFlash({ id: product.id, saving });
    setState('taken');
    logNudge({
      experiment: 'loss-aversion',
      productId: product.id,
      outcome: 'converted',
      ms: Math.round(performance.now() - startedAt.current),
    });
    onDone?.();
  };

  return { state, left, saving, ref, take };
}

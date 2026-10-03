import { Check, Timer, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PRODUCTS_BY_ID } from '../data/products';
import { formatPrice, useBasket } from '../state/basket';
import { logNudge } from '../state/nudgeLog';
import { ProductThumb } from './ProductBits';

// Loss-aversion nudge at checkout: a special offer that disappears in 10 seconds.
export const FLASH_PRODUCT_ID = 'well-and-truly-cheddar-gouda-thins';
const SECONDS = 10;
const SAVING = 0.5;

export function FlashOffer({ onDone }: { onDone: () => void }) {
  const product = PRODUCTS_BY_ID[FLASH_PRODUCT_ID];
  const { add, qtyOf, applyFlash } = useBasket();
  const [left, setLeft] = useState(SECONDS);
  const [state, setState] = useState<'live' | 'taken' | 'expired' | 'dismissed'>('live');
  const startedAt = useRef(performance.now());
  const inBasket = qtyOf(FLASH_PRODUCT_ID) > 0;

  useEffect(() => {
    if (state !== 'live') return;
    if (left <= 0) {
      setState('expired');
      logNudge({ experiment: 'loss-aversion', productId: FLASH_PRODUCT_ID, outcome: 'expired', ms: SECONDS * 1000 });
      return;
    }
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left, state]);

  // Let the result sit for a moment, then get out of the way.
  useEffect(() => {
    if (state === 'live') return;
    const t = window.setTimeout(onDone, state === 'taken' ? 2500 : 1800);
    return () => window.clearTimeout(t);
  }, [onDone, state]);

  if (!product) return null;
  const offerPrice = product.price - SAVING;
  const ms = () => Math.round(performance.now() - startedAt.current);

  const take = () => {
    add(FLASH_PRODUCT_ID);
    applyFlash({ id: FLASH_PRODUCT_ID, saving: SAVING });
    setState('taken');
    logNudge({ experiment: 'loss-aversion', productId: FLASH_PRODUCT_ID, outcome: 'converted', ms: ms() });
  };
  const dismiss = () => {
    setState('dismissed');
    logNudge({ experiment: 'loss-aversion', productId: FLASH_PRODUCT_ID, outcome: 'skipped', ms: ms() });
  };

  return (
    <section className={`flash flash-${state}`} role="alert" aria-live="assertive">
      <ProductThumb product={product} size="md" />
      <div className="flash-body">
        {state === 'live' && (
          <>
            <span className="flash-kicker">
              <Timer size={14} /> Special offer
            </span>
            <strong>
              The special offer for this product will go in <span className="flash-count">{left}s</span>
            </strong>
            <span className="flash-product">
              {product.name} · <b>{formatPrice(offerPrice)}</b> <s>{formatPrice(product.price)}</s>
              {inBasket && ' · add another'}
            </span>
          </>
        )}
        {state === 'taken' && (
          <strong>
            <Check size={16} /> Got it: {formatPrice(offerPrice)} applied to your trolley.
          </strong>
        )}
        {state === 'expired' && <strong>The offer has gone.</strong>}
        {state === 'dismissed' && <strong>No problem.</strong>}
      </div>
      {state === 'live' && (
        <div className="flash-actions">
          <button type="button" className="oc-btn" onClick={take}>
            Add for {formatPrice(offerPrice)}
          </button>
          <button type="button" className="flash-close" onClick={dismiss} aria-label="No thanks">
            <X size={16} />
          </button>
        </div>
      )}
      {state === 'live' && (
        <span className="flash-bar" aria-hidden>
          <i style={{ animationDuration: `${SECONDS}s` }} />
        </span>
      )}
    </section>
  );
}

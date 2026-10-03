import {
  ArrowLeft,
  Check,
  CreditCard,
  Leaf,
  Lock,
  MapPin,
  Search,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { formatPrice, useBasket } from '../state/basket';
import { OCADO_MINIMUM } from './BasketPanel';
import { Logo } from './Header';
import { shelfPicks } from '../services/partyUsage';
import type { SwipeLogEntry } from '../types';
import { PartyPreview, PickCards } from './PartyPreview';
import { ProductThumb, QtyStepper } from './ProductBits';

// Mock of the retailer's checkout. Once integrated this hands off to Ocado itself.

type Step = 'trolley' | 'slot' | 'payment' | 'confirmed';

const STEPS: { id: Exclude<Step, 'confirmed'>; label: string }[] = [
  { id: 'trolley', label: 'Trolley' },
  { id: 'slot', label: 'Delivery' },
  { id: 'payment', label: 'Payment' },
];

const TIMES = ['7–8am', '9–10am', '12–1pm', '3–4pm', '6–7pm', '8–9pm'];

interface Slot {
  id: string;
  day: string;
  date: string;
  time: string;
  price: number;
  eco: boolean;
  available: boolean;
}

function buildSlots(): { day: string; date: string; slots: Slot[] }[] {
  const days = [];
  const today = new Date();
  for (let d = 1; d <= 4; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    const day = d === 1 ? 'Tomorrow' : date.toLocaleDateString('en-GB', { weekday: 'short' });
    const dateLabel = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const slots = TIMES.map((time, t) => {
      const seed = (d * 7 + t * 3) % 10;
      return {
        id: `${d}-${t}`,
        day,
        date: dateLabel,
        time,
        price: [1.99, 2.99, 3.99, 4.99, 5.99, 6.99][(t + d) % 6],
        eco: seed % 4 === 0,
        available: seed !== 7 && seed !== 2,
      };
    });
    days.push({ day, date: dateLabel, slots });
  }
  return days;
}

export function OcadoCheckout({
  partyGuests,
  swipeHistory,
  showFlash,
  onFlashDone,
  onHome,
  onExit,
}: {
  /** Set when the basket came from the party planner: the trolley becomes the party preview. */
  partyGuests?: number | null;
  /** Every swipe from the chat, used for the last-minute recommendations. */
  swipeHistory: SwipeLogEntry[];
  /** Run the 10-second loss-aversion offer on one last-minute pick (once per session). */
  showFlash: boolean;
  onFlashDone: () => void;
  /** Leave checkout for the Shelf welcome screen. */
  onHome: () => void;
  onExit: (orderPlaced: boolean) => void;
}) {
  const { lines, count, subtotal, flash } = useBasket();
  // Decided when checkout opens, so the offer card stays put after it finishes.
  const [flashOn] = useState(showFlash);
  const flashProps = flashOn ? { onDone: onFlashDone } : undefined;
  // Snapshot on arrival so a card doesn't vanish once its product is added.
  const [picks] = useState(() => (partyGuests ? [] : shelfPicks(lines, null, swipeHistory)));
  const [step, setStep] = useState<Step>('trolley');
  const [slotId, setSlotId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const days = useMemo(buildSlots, []);
  const slot = days.flatMap((d) => d.slots).find((s) => s.id === slotId);
  const orderNumber = useMemo(() => `OC-${Math.floor(10_000_000 + Math.random() * 89_999_999)}`, []);

  const delivery = slot?.price ?? 0;
  const bagCharge = 0.4;
  const total = subtotal + delivery + bagCharge;
  const belowMinimum = subtotal < OCADO_MINIMUM;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const placeOrder = () => {
    setPlacing(true);
    window.setTimeout(() => {
      setPlacing(false);
      setStep('confirmed');
    }, 1200);
  };

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="shell">
      <div className="handoff-bar">
        <div className="handoff-nav">
          <button type="button" className="link-btn" onClick={() => onExit(step === 'confirmed')}>
            <ArrowLeft size={15} /> Back
          </button>
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
        </div>
        <span className="handoff-note">
          <Lock size={13} /> Basket handed off to Ocado
        </span>
      </div>

      <header className="oc-header">
        <div className="oc-header-inner">
          <span className="oc-wordmark">ocado</span>
          <div className="oc-search" aria-hidden>
            <Search size={16} />
            <span>Search 50,000+ products</span>
          </div>
          <span className="oc-trolley">
            <ShoppingCart size={18} />
            <strong>{formatPrice(subtotal)}</strong>
          </span>
        </div>
      </header>

      <main className="oc-main">
        {step !== 'confirmed' && (
          <ol className="oc-steps">
            {STEPS.map((s, i) => (
              <li key={s.id} className={i < stepIndex ? 'done' : i === stepIndex ? 'active' : ''}>
                <span className="oc-step-num">{i < stepIndex ? <Check size={13} /> : i + 1}</span>
                {s.label}
              </li>
            ))}
          </ol>
        )}

        {step === 'confirmed' ? (
          <div className="oc-confirm">
            <div className="oc-confirm-icon">
              <Check size={30} />
            </div>
            <h1>Order confirmed</h1>
            <p className="muted">
              Order <strong>{orderNumber}</strong> · {count} items · {formatPrice(total)}
            </p>
            {slot && (
              <div className="oc-confirm-slot">
                <Truck size={18} />
                <span>
                  Arriving{' '}
                  <strong>
                    {slot.day}, {slot.date}
                  </strong>{' '}
                  between <strong>{slot.time}</strong>
                </span>
              </div>
            )}
            <p className="muted small">You can edit this order until 11pm the night before delivery.</p>
            <button type="button" className="oc-btn" onClick={() => onExit(true)}>
              Back to Shelf
            </button>
          </div>
        ) : step === 'trolley' && partyGuests ? (
          <PartyPreview
            guests={partyGuests}
            history={swipeHistory}
            flash={flashProps}
            onContinue={() => setStep('slot')}
          />
        ) : (
          <div className="oc-layout">
            <section className="oc-panel">
              {step === 'trolley' && (
                <>
                  <h2>Your trolley</h2>
                  <div className="oc-notice">
                    <ShieldCheck size={16} />
                    <span>
                      {count} items were added from <strong>Shelf</strong>. Review them before choosing a slot.
                    </span>
                  </div>
                  {lines.length === 0 ? (
                    <p className="muted">Your trolley is empty.</p>
                  ) : (
                    <ul className="oc-lines">
                      {lines.map(({ product, qty }) => (
                        <li key={product.id}>
                          <ProductThumb product={product} size="sm" />
                          <div className="oc-line-info">
                            <span className="oc-line-name">{product.name}</span>
                            <span className="muted small">
                              {[product.brand, product.size, product.unitPrice].filter(Boolean).join(' · ')}
                            </span>
                          </div>
                          <QtyStepper id={product.id} qty={qty} compact />
                          <strong className="oc-line-price">{formatPrice(product.price * qty)}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                  {picks.length > 0 && (
                    <section className="oc-picks">
                      <h3>Before you check out</h3>
                      <p className="muted small">Picked from your basket and what you swiped in Shelf.</p>
                      <PickCards picks={picks} flash={flashProps} />
                    </section>
                  )}
                </>
              )}

              {step === 'slot' && (
                <>
                  <h2>Choose a delivery slot</h2>
                  <p className="muted small oc-legend">
                    <Leaf size={14} /> Greener slots: we already have a van in your area
                  </p>
                  <div className="oc-slots">
                    {days.map((d) => (
                      <div key={d.day} className="oc-day">
                        <div className="oc-day-head">
                          <strong>{d.day}</strong>
                          <span className="muted small">{d.date}</span>
                        </div>
                        {d.slots.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            disabled={!s.available}
                            className={`oc-slot${slotId === s.id ? ' selected' : ''}${s.eco ? ' eco' : ''}`}
                            onClick={() => setSlotId(s.id)}
                          >
                            <span>{s.time}</span>
                            <span className="oc-slot-price">
                              {s.available ? (
                                <>
                                  {s.eco && <Leaf size={12} />}
                                  {formatPrice(s.price)}
                                </>
                              ) : (
                                'Full'
                              )}
                            </span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {step === 'payment' && (
                <>
                  <h2>Review & pay</h2>
                  <div className="oc-detail">
                    <MapPin size={18} />
                    <div>
                      <strong>Delivery address</strong>
                      <span className="muted small">Flat 4, 12 Example Road, London, N1 2AB</span>
                    </div>
                    <button type="button" className="link-btn">
                      Change
                    </button>
                  </div>
                  {slot && (
                    <div className="oc-detail">
                      <Truck size={18} />
                      <div>
                        <strong>
                          {slot.day}, {slot.date} · {slot.time}
                        </strong>
                        <span className="muted small">{slot.eco ? 'Greener slot' : 'Standard slot'}</span>
                      </div>
                      <button type="button" className="link-btn" onClick={() => setStep('slot')}>
                        Change
                      </button>
                    </div>
                  )}
                  <div className="oc-detail">
                    <CreditCard size={18} />
                    <div>
                      <strong>Visa ending 4242</strong>
                      <span className="muted small">Expires 08/29</span>
                    </div>
                    <button type="button" className="link-btn">
                      Change
                    </button>
                  </div>
                  <label className="oc-promo">
                    <span className="small">Voucher code</span>
                    <div>
                      <input placeholder="Enter code" />
                      <button type="button" className="oc-btn oc-btn-outline">
                        Apply
                      </button>
                    </div>
                  </label>
                </>
              )}
            </section>

            <aside className="oc-summary">
              <h3>Order summary</h3>
              <dl>
                <div>
                  <dt>Items ({count})</dt>
                  <dd>{formatPrice(subtotal + (flash?.saving ?? 0))}</dd>
                </div>
                {flash && (
                  <div className="oc-flash-line">
                    <dt>Special offer</dt>
                    <dd>−{formatPrice(flash.saving)}</dd>
                  </div>
                )}
                <div>
                  <dt>Delivery</dt>
                  <dd>{slot ? formatPrice(delivery) : '—'}</dd>
                </div>
                <div>
                  <dt>Bag charge</dt>
                  <dd>{formatPrice(bagCharge)}</dd>
                </div>
                <div className="oc-total">
                  <dt>Total</dt>
                  <dd>{formatPrice(total)}</dd>
                </div>
              </dl>
              {belowMinimum && (
                <p className="oc-warn small">
                  Ocado's minimum order is {formatPrice(OCADO_MINIMUM)}. Allowed here for the demo.
                </p>
              )}
              {step === 'trolley' && (
                <button type="button" className="oc-btn" disabled={!lines.length} onClick={() => setStep('slot')}>
                  Choose delivery slot
                </button>
              )}
              {step === 'slot' && (
                <button type="button" className="oc-btn" disabled={!slot} onClick={() => setStep('payment')}>
                  {slot ? 'Continue to payment' : 'Select a slot'}
                </button>
              )}
              {step === 'payment' && (
                <button type="button" className="oc-btn" disabled={placing} onClick={placeOrder}>
                  {placing ? 'Placing order…' : `Place order · ${formatPrice(total)}`}
                </button>
              )}
              {step !== 'trolley' && (
                <button
                  type="button"
                  className="link-btn oc-back"
                  onClick={() => setStep(step === 'payment' ? 'slot' : 'trolley')}
                >
                  <ArrowLeft size={14} /> Back
                </button>
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

import { Clock, Hourglass, RotateCcw, User, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ProductThumb } from '../components/ProductBits';
import { PRODUCTS, PRODUCTS_BY_ID } from '../data/products';
import { VIDEO_PRODUCT_IDS } from '../data/videoReviews';
import { clearNudgeEvents, readNudgeEvents, type NudgeEvent, type NudgeExperiment } from '../state/nudgeLog';
import type { Period } from './metrics';

// Behavioural nudge experiments: one mechanism, one product, measured against a
// control (the same product without the nudge), plus how this shopper responded.

interface Experiment {
  id: NudgeExperiment;
  title: string;
  mechanism: string;
  how: string;
  /** The product shown on the card. */
  productId: string;
  /** Every product the nudge runs on; empty means it can run on any product. */
  productIds: string[];
  /** Per 30 days, before scaling to the selected period. */
  base: {
    shown: number;
    converted: number;
    controlShown: number;
    controlConverted: number;
    secs: number;
    controlSecs: number;
  };
  breakdown: (shown: number, converted: number) => { label: string; value: number }[];
}

export const EXPERIMENTS: Experiment[] = [
  {
    id: 'social-proof',
    title: 'Social proof',
    mechanism: 'Watch Humans video on the swipe card',
    how: 'A real shopper trying the product plays on the card, with the full review one tap away. Runs on OOM, Well & Truly and Flow.',
    productId: 'oom-balance-12-pack',
    productIds: VIDEO_PRODUCT_IDS,
    base: { shown: 2840, converted: 1022, controlShown: 2610, controlConverted: 496, secs: 6.8, controlSecs: 2.9 },
    breakdown: (shown, converted) => [
      { label: 'Watched the full review', value: Math.round(shown * 0.31) },
      { label: 'Added to basket', value: converted },
      { label: 'Skipped', value: shown - converted },
    ],
  },
  {
    id: 'loss-aversion',
    title: 'Loss aversion',
    mechanism: '“The special offer for this product will go in 10s” on a last-minute shelf pick',
    how: 'One last-minute pick at checkout gets ~20% off for 10 seconds, starting when the card comes into view. Shown once per session.',
    productId: PRODUCTS.find((p) => /pringles prawn cocktail/i.test(p.name))?.id ?? PRODUCTS[0].id,
    productIds: [],
    base: { shown: 1960, converted: 862, controlShown: 1840, controlConverted: 349, secs: 3.4, controlSecs: 7.9 },
    breakdown: (shown, converted) => [
      { label: 'Took the offer in time', value: converted },
      { label: 'Let it run out', value: Math.round((shown - converted) * 0.64) },
      { label: 'Said no thanks', value: shown - converted - Math.round((shown - converted) * 0.64) },
    ],
  },
];

const SCALE: Record<Period, number> = { 7: 0.24, 30: 1, 90: 2.75 };
const pct = (a: number, b: number) => (b ? (a / b) * 100 : 0);
const num = (n: number) => n.toLocaleString('en-GB');

/** Live events from this browser's shopper session, refreshed when the tab regains focus. */
function useSessionEvents() {
  const [events, setEvents] = useState<NudgeEvent[]>(readNudgeEvents);
  useEffect(() => {
    const refresh = () => setEvents(readNudgeEvents());
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return {
    events,
    clear: () => {
      clearNudgeEvents();
      setEvents([]);
    },
  };
}

export function Experiments({ productIds, period }: { productIds: Set<string>; period: Period }) {
  const { events, clear } = useSessionEvents();
  const runsOn = (e: Experiment, id: string) => e.productIds.length === 0 || e.productIds.includes(id);
  // Experiments that can run on any product show the one this shopper actually got.
  const visible = EXPERIMENTS.filter((e) => !e.productIds.length || e.productIds.some((id) => productIds.has(id))).map(
    (e) => {
      const last = [...events].reverse().find((x) => x.experiment === e.id && PRODUCTS_BY_ID[x.productId]);
      return e.productIds.length || !last ? e : { ...e, productId: last.productId };
    },
  );
  if (!visible.length) return null;

  return (
    <section className="dash-card">
      <header className="dash-exp-head">
        <div>
          <h2>Nudge experiments</h2>
          <p className="muted small">
            Each nudge runs on one product and is compared with the same product shown without it. “This shopper” is
            live from the shopper app in this browser.
          </p>
        </div>
        {events.length > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>
            <RotateCcw size={14} /> Reset session
          </button>
        )}
      </header>
      <div className="dash-exp-grid">
        {visible.map((e) => (
          <ExperimentCard
            key={e.id}
            experiment={e}
            period={period}
            events={events.filter((x) => x.experiment === e.id && runsOn(e, x.productId))}
          />
        ))}
      </div>
    </section>
  );
}

function ExperimentCard({
  experiment: e,
  period,
  events,
}: {
  experiment: Experiment;
  period: Period;
  events: NudgeEvent[];
}) {
  const product = PRODUCTS_BY_ID[e.productId];
  const k = SCALE[period];
  const shown = Math.round(e.base.shown * k);
  const converted = Math.round(e.base.converted * k);
  const controlShown = Math.round(e.base.controlShown * k);
  const controlConverted = Math.round(e.base.controlConverted * k);
  const rate = pct(converted, shown);
  const controlRate = pct(controlConverted, controlShown);
  const max = Math.max(rate, controlRate, 1);
  const Icon = e.id === 'social-proof' ? Video : Hourglass;

  return (
    <article className="dash-exp">
      <header>
        <span className={`dash-exp-icon exp-${e.id}`}>
          <Icon size={16} />
        </span>
        <div>
          <h3>{e.title}</h3>
          <span className="muted small">{e.mechanism}</span>
        </div>
      </header>

      {product && (
        <div className="dash-exp-product">
          <ProductThumb product={product} size="sm" />
          <span>
            <strong>{product.name}</strong>
            <span className="muted small">{e.how}</span>
          </span>
        </div>
      )}

      <ul className="dash-exp-bars">
        <li>
          <span className="dash-exp-bar-label">With nudge</span>
          <span className="dash-exp-track">
            <i className={`exp-${e.id}`} style={{ width: `${(rate / max) * 100}%` }} />
          </span>
          <strong>{rate.toFixed(1)}%</strong>
        </li>
        <li>
          <span className="dash-exp-bar-label">Control</span>
          <span className="dash-exp-track">
            <i className="exp-control" style={{ width: `${(controlRate / max) * 100}%` }} />
          </span>
          <strong>{controlRate.toFixed(1)}%</strong>
        </li>
      </ul>

      <div className="dash-exp-stats">
        <span>
          <b>{(rate / controlRate).toFixed(1)}×</b> conversion vs control
        </span>
        <span>
          <b>{num(converted)}</b> of {num(shown)} converted
        </span>
        <span>
          <Clock size={12} /> {e.base.secs}s to decide <em>(control {e.base.controlSecs}s)</em>
        </span>
      </div>

      <ul className="dash-exp-breakdown">
        {e.breakdown(shown, converted).map((b) => (
          <li key={b.label}>
            <span>{b.label}</span>
            <b>{num(b.value)}</b>
          </li>
        ))}
      </ul>

      <ThisShopper experiment={e} events={events} />
    </article>
  );
}

const OUTCOME_TEXT: Record<NudgeExperiment, Record<NudgeEvent['outcome'], string>> = {
  'social-proof': {
    watched: 'Opened the Watch Humans video',
    converted: 'Added it after the video',
    skipped: 'Swiped past the video card',
    expired: 'Let it pass',
  },
  'loss-aversion': {
    watched: 'Saw the offer',
    converted: 'Took the offer before the timer ran out',
    skipped: 'Said no thanks',
    expired: 'Let the offer run out',
  },
};

function ThisShopper({ experiment, events }: { experiment: Experiment; events: NudgeEvent[] }) {
  const responses = events.filter((x) => x.outcome !== 'watched');
  const converted = responses.filter((x) => x.outcome === 'converted').length;
  const verdict = !responses.length
    ? null
    : converted / responses.length >= 0.5
      ? { text: `Responds to ${experiment.title.toLowerCase()}`, good: true }
      : { text: `Not moved by ${experiment.title.toLowerCase()}`, good: false };

  return (
    <div className="dash-exp-shopper">
      <span className="dash-exp-shopper-title">
        <User size={13} /> This shopper
      </span>
      {events.length === 0 ? (
        <span className="muted small">
          No response yet. {experiment.id === 'social-proof' ? 'Swipe the video card' : 'Open the Ocado checkout'} in
          the <a href="/">shopper app</a>.
        </span>
      ) : (
        <>
          {verdict && <span className={`dash-exp-verdict ${verdict.good ? 'good' : 'bad'}`}>{verdict.text}</span>}
          <ul>
            {events.slice(-4).map((x) => (
              <li key={x.at}>
                {OUTCOME_TEXT[experiment.id][x.outcome]}
                {x.ms !== undefined && x.outcome !== 'expired' && <em> · {(x.ms / 1000).toFixed(1)}s</em>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

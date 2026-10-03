import {
  Anchor,
  Award,
  BookOpen,
  ChevronDown,
  Coins,
  Flame,
  HeartPulse,
  Hourglass,
  Minus,
  Puzzle,
  Sparkles,
  Star,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { ProductThumb } from '../components/ProductBits';
import { NUDGE_BY_ID, NUDGES, nudgeRanking, type NudgeId, type NudgeRow } from './nudgeData';

export const NUDGE_ICON: Record<NudgeId, LucideIcon> = {
  'social-proof': Users,
  'loss-aversion': Hourglass,
  scarcity: Flame,
  anchoring: Anchor,
  'price-framing': Coins,
  'health-halo': HeartPulse,
  authority: Award,
  bundling: Puzzle,
  novelty: Sparkles,
  control: Minus,
};

// Sequential blue ramp (reference palette steps 100→650): one hue, light = low.
const RAMP = ['#cde2fb', '#b7d3f6', '#9ec5f4', '#6da7ec', '#3987e5', '#2a78d6', '#1c5cab', '#104281'];

type Bind = (content: ReactNode) => object;

/** Which nudge works best for each product: ranking across the range, then the full matrix. */
export function NudgeLab({ rows, bind }: { rows: NudgeRow[]; bind: Bind }) {
  if (!rows.length) return null;
  const ranking = nudgeRanking(rows);
  const maxUplift = Math.max(...ranking.map((r) => r.uplift));
  const rates = rows.flatMap((r) => r.cells.filter((c) => c.nudge !== 'control').map((c) => c.rate));
  const lo = Math.min(...rates);
  const hi = Math.max(...rates);
  const shade = (rate: number) => {
    const i = Math.min(RAMP.length - 1, Math.floor(((rate - lo) / Math.max(0.0001, hi - lo)) * RAMP.length));
    return { background: RAMP[i], color: i >= 4 ? '#fff' : 'var(--ink)' };
  };
  const top = ranking[0];

  return (
    <>
      <div className="lab-summary">
        <div className="lab-headline">
          <span className="muted small">Works best across this range</span>
          <strong>
            {top.nudge.name} <em>{top.uplift.toFixed(1)}× control</em>
          </strong>
          <span className="muted small">
            Best nudge for {top.wins} of {rows.length} product{rows.length === 1 ? '' : 's'}
          </span>
        </div>
        <ul className="lab-ranking" aria-label="Average uplift over control, by nudge">
          {ranking.map((r) => {
            const Icon = NUDGE_ICON[r.nudge.id];
            return (
              <li key={r.nudge.id}>
                <span className="lab-ranking-label">
                  <Icon size={13} /> {r.nudge.name}
                </span>
                <span
                  className="lab-ranking-track"
                  {...bind(
                    <>
                      <strong>{r.nudge.name}</strong>
                      <span>{r.uplift.toFixed(2)}× the control’s buy rate, on average</span>
                      <span>Best nudge for {r.wins} product(s)</span>
                    </>,
                  )}
                >
                  <i style={{ width: `${(r.uplift / maxUplift) * 100}%` }} />
                </span>
                <span className="lab-ranking-value">
                  <b>{r.uplift.toFixed(1)}×</b>
                  {r.wins > 0 && <em>best for {r.wins}</em>}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="lab-matrix-wrap">
        <table className="lab-matrix">
          <thead>
            <tr>
              <th className="lab-product-col">Product</th>
              {NUDGES.map((n) => {
                const Icon = NUDGE_ICON[n.id];
                return (
                  <th key={n.id} title={n.name}>
                    <span className="lab-col-head">
                      <Icon size={14} />
                      {n.short}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.product.id}>
                <th className="lab-product-col" scope="row">
                  <span className="lab-product">
                    <ProductThumb product={r.product} size="sm" />
                    <span>{r.product.name}</span>
                  </span>
                </th>
                {r.cells.map((c) => {
                  const isBest = c.nudge === r.best.nudge;
                  const isControl = c.nudge === 'control';
                  return (
                    <td key={c.nudge}>
                      <span
                        className={`lab-cell${isBest ? ' best' : ''}${isControl ? ' control' : ''}`}
                        style={isControl ? undefined : shade(c.rate)}
                        {...bind(
                          <>
                            <strong>
                              {NUDGE_BY_ID[c.nudge].name} · {r.product.name}
                            </strong>
                            <span>{c.rate.toFixed(1)} buys per 100 shown</span>
                            {!isControl && <span>{c.uplift.toFixed(1)}× control</span>}
                            <span>
                              {c.bought.toLocaleString('en-GB')} bought of {c.shown.toLocaleString('en-GB')} shown
                            </span>
                          </>,
                        )}
                      >
                        {isBest && <Star size={10} fill="currentColor" />}
                        {c.rate.toFixed(1)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="lab-legend muted small">
        Buys per 100 nudges shown. Darker means more buys; <Star size={10} fill="currentColor" /> marks each product’s
        best nudge. Hover a cell for the uplift over control.
      </p>
    </>
  );
}

/** The research behind each nudge, for brands deciding what to run. */
export function NudgePlaybook() {
  const [open, setOpen] = useState(false);
  return (
    <div className="lab-playbook">
      <button type="button" className="lab-playbook-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <BookOpen size={15} /> The nudge playbook: what each one is and why it works
        <ChevronDown size={15} className={open ? 'flip' : ''} />
      </button>
      {open && (
        <ul className="lab-playbook-grid">
          {NUDGES.filter((n) => n.id !== 'control').map((n) => {
            const Icon = NUDGE_ICON[n.id];
            return (
              <li key={n.id}>
                <span className="lab-playbook-name">
                  <Icon size={15} /> {n.name}
                </span>
                <p>{n.principle}</p>
                <span className="lab-playbook-example">{n.example}</span>
                <span className="muted small">
                  {n.where} · {n.source}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

import { ArrowDown, ArrowLeft, ArrowUp, Bot, Dumbbell, Handshake, Minus, ShoppingBag, Tag, User } from 'lucide-react';
import { useMemo, useState, type FocusEvent, type MouseEvent, type ReactNode } from 'react';
import { Logo } from '../components/Header';
import { ProductThumb } from '../components/ProductBits';
import { formatPrice } from '../state/basket';
import type { NudgeType } from '../types';
import {
  bestNudge,
  byNudge,
  COMPANIES,
  DEFAULT_COMPANY,
  isNewLaunch,
  productMetrics,
  totals,
  type FunnelCounts,
  type Period,
  type ProductMetrics,
} from './metrics';
import { Experiments } from './Experiments';
import { NUDGE_ICON, NudgeLab, NudgePlaybook } from './NudgeLab';
import { NUDGE_BY_ID, nudgeMatrix, type NudgeRow } from './nudgeData';
import './dashboard.css';

const NUDGE: Record<NudgeType, { label: string; icon: typeof Tag }> = {
  offer: { label: 'Deal', icon: Tag },
  partner: { label: 'Social proof video', icon: Handshake },
  nutrition: { label: 'Nutrition', icon: Dumbbell },
  none: { label: 'No nudge (control)', icon: Minus },
};

const PERIODS: Period[] = [7, 30, 90];

const num = (n: number) => n.toLocaleString('en-GB');
const pct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`;
const ratio = (a: number, b: number) => (b ? a / b : 0);

// ---------- Tooltip ----------

interface Tip {
  x: number;
  y: number;
  content: ReactNode;
}

function useTooltip() {
  const [tip, setTip] = useState<Tip | null>(null);
  const bind = (content: ReactNode) => ({
    onMouseMove: (e: MouseEvent) => setTip({ x: e.clientX, y: e.clientY, content }),
    onMouseLeave: () => setTip(null),
    onFocus: (e: FocusEvent) => {
      const r = e.currentTarget.getBoundingClientRect();
      setTip({ x: r.left + r.width / 2, y: r.top, content });
    },
    onBlur: () => setTip(null),
    tabIndex: 0,
  });
  const node = tip && (
    <div className="dash-tip" role="tooltip" style={{ left: tip.x, top: tip.y }}>
      {tip.content}
    </div>
  );
  return { bind, node };
}

type Bind = ReturnType<typeof useTooltip>['bind'];

// ---------- Page ----------

// Each brand has its own link: /dashboard?brand=Pip%20%26%20Nut
function initialCompany() {
  const brand = new URLSearchParams(window.location.search).get('brand');
  return COMPANIES.some((c) => c.id === brand) ? brand! : DEFAULT_COMPANY;
}

export function Dashboard() {
  const [companyId, setCompanyIdState] = useState(initialCompany);
  const setCompanyId = (id: string) => {
    setCompanyIdState(id);
    const url = new URL(window.location.href);
    url.searchParams.set('brand', id);
    window.history.replaceState(null, '', url);
  };
  const [period, setPeriod] = useState<Period>(30);
  const { bind, node } = useTooltip();

  const rows = useMemo(() => productMetrics(companyId, period), [companyId, period]);
  const company = COMPANIES.find((c) => c.id === companyId)!;
  const total = totals(rows);
  const nudges = byNudge(rows);
  const lab = useMemo(
    () =>
      nudgeMatrix(
        rows.map((r) => r.product),
        period,
      ),
    [rows, period],
  );

  return (
    <div className="dash">
      <header className="dash-top">
        <a href="/" className="dash-back">
          <ArrowLeft size={15} />
          <Logo />
        </a>
        <span className="dash-top-label">for brands</span>
        <a href="/" className="btn btn-ghost btn-sm dash-top-link">
          Open shopper app
        </a>
      </header>

      <main className="dash-main">
        <section className="dash-hero">
          <span className="dash-kicker">Behavioural nudge report</span>
          <h1>{company.label}</h1>
          <p className="muted">
            {rows.length} product{rows.length === 1 ? '' : 's'} on Ocado. How Shelf’s agent surfaced them, which nudges
            it used, and what shoppers actually bought.
          </p>
        </section>

        <div className="dash-filters" role="group" aria-label="Filters">
          <label className="dash-select">
            <span>Brand</span>
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              {COMPANIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <div className="dash-segment" role="radiogroup" aria-label="Time period">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={period === p}
                className={period === p ? 'active' : ''}
                onClick={() => setPeriod(p)}
              >
                {p}d
              </button>
            ))}
          </div>
          <span className="dash-filter-note">Placeholder data · last {period} days</span>
        </div>

        <section className="dash-kpis">
          <Kpi
            label="Products launched"
            value={num(rows.length)}
            note={`${rows.filter((r) => isNewLaunch(r.launched)).length} in the last 60 days`}
          />
          <Kpi label="Nudges delivered" value={num(total.delivered)} note="Shown to shoppers in chat" />
          <Kpi
            label="Picked by agent"
            value={num(total.picked)}
            note={`${pct(ratio(total.picked, total.delivered))} of nudges`}
          />
          <Kpi
            label="Successful buys"
            value={num(total.bought)}
            note={`${pct(ratio(total.bought, total.picked), 1)} of agent picks`}
          />
        </section>

        <Experiments productIds={new Set(rows.map((r) => r.product.id))} period={period} />

        <Card
          title="Which nudge works best for each product"
          subtitle="Nine behavioural nudges, each tested against the same product shown without one. Use it to decide what to run on each launch."
        >
          <NudgeLab rows={lab} bind={bind} />
          <NudgePlaybook />
        </Card>

        <Card
          title="Your range on Shelf"
          subtitle="Every product this brand sells through Ocado, with how each one performed."
        >
          <ProductRange rows={rows} lab={lab} />
        </Card>

        <div className="dash-grid">
          <Card title="From nudge to purchase" subtitle="All products, all nudges">
            <Funnel total={total} bind={bind} />
          </Card>
          <Card title="Which nudges convert" subtitle="Purchases per 100 nudges delivered">
            <NudgeBars nudges={nudges} bind={bind} />
          </Card>
        </div>

        <Card
          title="Agent decisions vs human buys"
          subtitle="Each product’s share of agent picks compared with its share of actual purchases. Big gaps are where the agent and shoppers disagree."
        >
          <AgentVsHuman rows={rows} bind={bind} />
        </Card>

        <Card
          title="Launched products"
          subtitle="Click a column to sort. This table is also the accessible view of the charts above."
        >
          <ProductTable rows={rows} />
        </Card>
      </main>
      {node}
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="dash-card">
      <header>
        <h2>{title}</h2>
        {subtitle && <p className="muted small">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="dash-kpi">
      <span className="dash-kpi-label">{label}</span>
      <strong>{value}</strong>
      <span className="muted small">{note}</span>
    </div>
  );
}

// ---------- Funnel ----------

const STAGES: { key: keyof FunnelCounts; label: string; icon: typeof Tag }[] = [
  { key: 'delivered', label: 'Nudges delivered', icon: Tag },
  { key: 'picked', label: 'Picked by agent', icon: Bot },
  { key: 'added', label: 'Added by shopper', icon: User },
  { key: 'bought', label: 'Bought', icon: ShoppingBag },
];

function Funnel({ total, bind }: { total: FunnelCounts; bind: Bind }) {
  return (
    <ol className="funnel">
      {STAGES.map((s, i) => {
        const value = total[s.key];
        const prev = i ? total[STAGES[i - 1].key] : 0;
        const Icon = s.icon;
        return (
          <li key={s.key}>
            <span className="funnel-label">
              <Icon size={14} /> {s.label}
            </span>
            <span
              className="funnel-track"
              {...bind(
                <>
                  <strong>{s.label}</strong>
                  <span>{num(value)}</span>
                  {i > 0 && <span>{pct(ratio(value, prev), 1)} of previous step</span>}
                </>,
              )}
            >
              <i style={{ width: `${Math.max(1, ratio(value, total.delivered) * 100)}%` }} />
            </span>
            <span className="funnel-value">
              <strong>{num(value)}</strong>
              {i > 0 && <span className="muted">{pct(ratio(value, prev))}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ---------- Nudge effectiveness ----------

function NudgeBars({ nudges, bind }: { nudges: ReturnType<typeof byNudge>; bind: Bind }) {
  const control = nudges.find((n) => n.type === 'none');
  const controlRate = control ? ratio(control.bought, control.delivered) : 0;
  const max = Math.max(...nudges.map((n) => ratio(n.bought, n.delivered)), 0.0001);

  return (
    <ul className="nudge-bars">
      {nudges.map((n) => {
        const rate = ratio(n.bought, n.delivered);
        const uplift = controlRate ? rate / controlRate : 0;
        const Icon = NUDGE[n.type].icon;
        return (
          <li key={n.type}>
            <span className="nudge-bars-label">
              <span className={`swatch swatch-${n.type}`}>
                <Icon size={12} />
              </span>
              {NUDGE[n.type].label}
            </span>
            <span
              className="nudge-bars-track"
              {...bind(
                <>
                  <strong>{NUDGE[n.type].label}</strong>
                  <span>{num(n.delivered)} delivered</span>
                  <span>
                    {num(n.picked)} picked by agent ({pct(ratio(n.picked, n.delivered))})
                  </span>
                  <span>{num(n.bought)} bought</span>
                </>,
              )}
            >
              <i className={`fill-${n.type}`} style={{ width: `${(rate / max) * 100}%` }} />
            </span>
            <span className="nudge-bars-value">
              <strong>{(rate * 100).toFixed(1)}</strong>
              {n.type !== 'none' && controlRate > 0 && (
                <span className={uplift >= 1 ? 'up' : 'down'}>
                  {uplift >= 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                  {uplift.toFixed(1)}× control
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ---------- Agent vs human ----------

function AgentVsHuman({ rows, bind }: { rows: ProductMetrics[]; bind: Bind }) {
  const top = [...rows]
    .sort((a, b) => Math.abs(b.humanShare - b.agentShare) - Math.abs(a.humanShare - a.agentShare))
    .slice(0, 8);
  const max = Math.max(...top.flatMap((r) => [r.agentShare, r.humanShare]), 0.01) * 1.1;

  if (!top.length) return <p className="muted">No products for this company.</p>;

  return (
    <div className="dumbbell">
      <div className="dash-legend">
        <span>
          <i className="legend-agent" /> Share of agent picks
        </span>
        <span>
          <i className="legend-human" /> Share of shopper buys
        </span>
      </div>
      <ul>
        {top.map((r) => {
          const gap = (r.humanShare - r.agentShare) * 100;
          const lo = Math.min(r.agentShare, r.humanShare) / max;
          const hi = Math.max(r.agentShare, r.humanShare) / max;
          return (
            <li key={r.product.id}>
              <span className="dumbbell-name">
                <ProductThumb product={r.product} size="sm" />
                <span>{r.product.name}</span>
              </span>
              <span
                className="dumbbell-track"
                {...bind(
                  <>
                    <strong>{r.product.name}</strong>
                    <span>
                      Agent picks: {pct(r.agentShare, 1)} ({num(r.picked)})
                    </span>
                    <span>
                      Shopper buys: {pct(r.humanShare, 1)} ({num(r.bought)})
                    </span>
                  </>,
                )}
              >
                <span className="dumbbell-line" style={{ left: `${lo * 100}%`, width: `${(hi - lo) * 100}%` }} />
                <span className="dumbbell-dot agent" style={{ left: `${(r.agentShare / max) * 100}%` }} />
                <span className="dumbbell-dot human" style={{ left: `${(r.humanShare / max) * 100}%` }} />
              </span>
              <span className={`dumbbell-gap ${gap >= 0 ? 'human-wins' : 'agent-wins'}`}>
                {gap >= 0 ? <User size={12} /> : <Bot size={12} />}
                {gap >= 0 ? '+' : '−'}
                {Math.abs(gap).toFixed(1)} pts
                <em>{gap >= 0 ? 'shoppers buy more' : 'agent over-picks'}</em>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------- Product range ----------

function ProductRange({ rows, lab }: { rows: ProductMetrics[]; lab: NudgeRow[] }) {
  return (
    <ul className="dash-range">
      {rows.map((r) => {
        const best = lab.find((l) => l.product.id === r.product.id)?.best;
        const Icon = best ? NUDGE_ICON[best.nudge] : Minus;
        return (
          <li key={r.product.id}>
            <span className="dash-range-img">
              <ProductThumb product={r.product} size="md" />
              {isNewLaunch(r.launched) && <span className="dash-new">New</span>}
            </span>
            <strong>{r.product.name}</strong>
            <span className="muted small">
              {[r.product.size, formatPrice(r.product.price)].filter(Boolean).join(' · ')}
            </span>
            {r.product.offer && <span className="dash-range-offer">{r.product.offer}</span>}
            <span className="dash-range-stats">
              <span>
                <b>{num(r.picked)}</b> agent picks
              </span>
              <span>
                <b>{num(r.bought)}</b> bought
              </span>
            </span>
            <span className="dash-best">
              <span className="swatch swatch-lab">
                <Icon size={11} />
              </span>
              Best: {best ? NUDGE_BY_ID[best.nudge].name : 'not enough data'}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ---------- Table ----------

type SortKey = 'name' | 'launched' | 'delivered' | 'picked' | 'added' | 'bought' | 'conversion' | 'gap';

const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: 'name', label: 'Product' },
  { key: 'launched', label: 'Launched' },
  { key: 'delivered', label: 'Nudges', numeric: true },
  { key: 'picked', label: 'Agent picks', numeric: true },
  { key: 'added', label: 'Added', numeric: true },
  { key: 'bought', label: 'Bought', numeric: true },
  { key: 'conversion', label: 'Buy rate', numeric: true },
  { key: 'gap', label: 'Agent vs human', numeric: true },
];

const sortValue = (r: ProductMetrics, key: SortKey): number | string => {
  switch (key) {
    case 'name':
      return r.product.name;
    case 'launched':
      return r.launched.getTime();
    case 'conversion':
      return ratio(r.bought, r.picked);
    case 'gap':
      return r.humanShare - r.agentShare;
    default:
      return r[key];
  }
};

function ProductTable({ rows }: { rows: ProductMetrics[] }) {
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'bought', desc: true });
  const sorted = [...rows].sort((a, b) => {
    const x = sortValue(a, sort.key);
    const y = sortValue(b, sort.key);
    const cmp = typeof x === 'string' ? x.localeCompare(y as string) : x - (y as number);
    return sort.desc ? -cmp : cmp;
  });

  return (
    <div className="dash-table-wrap">
      <table className="dash-table">
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th
                key={c.key}
                className={c.numeric ? 'num' : ''}
                aria-sort={sort.key === c.key ? (sort.desc ? 'descending' : 'ascending') : 'none'}
              >
                <button
                  type="button"
                  onClick={() => setSort((s) => ({ key: c.key, desc: s.key === c.key ? !s.desc : c.key !== 'name' }))}
                >
                  {c.label}
                  {sort.key === c.key && (sort.desc ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
                </button>
              </th>
            ))}
            <th>Best nudge</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const gap = (r.humanShare - r.agentShare) * 100;
            const best = bestNudge(r);
            const Icon = NUDGE[best].icon;
            return (
              <tr key={r.product.id}>
                <td>
                  <span className="dash-product">
                    <ProductThumb product={r.product} size="sm" />
                    <span>
                      <strong>{r.product.name}</strong>
                      <span className="muted small">
                        {formatPrice(r.product.price)}
                        {r.product.offer && ` · ${r.product.offer}`}
                      </span>
                    </span>
                  </span>
                </td>
                <td>
                  {r.launched.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  {isNewLaunch(r.launched) && <span className="dash-new">New</span>}
                </td>
                <td className="num">{num(r.delivered)}</td>
                <td className="num">{num(r.picked)}</td>
                <td className="num">{num(r.added)}</td>
                <td className="num">{num(r.bought)}</td>
                <td className="num">{pct(ratio(r.bought, r.picked), 1)}</td>
                <td className={`num gap ${gap >= 0 ? 'human-wins' : 'agent-wins'}`}>
                  {gap >= 0 ? <User size={12} /> : <Bot size={12} />} {gap >= 0 ? '+' : '−'}
                  {Math.abs(gap).toFixed(1)} pts
                </td>
                <td>
                  <span className="dash-best">
                    <span className={`swatch swatch-${best}`}>
                      <Icon size={11} />
                    </span>
                    {NUDGE[best].label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

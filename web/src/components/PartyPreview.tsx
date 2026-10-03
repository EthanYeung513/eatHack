import { ArrowRight, Check, Minus, Plus, Timer } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { formatPrice, useBasket, type BasketLine } from '../state/basket';
import {
  coverage,
  partyDayLabel,
  servings,
  shelfPicks,
  ZONES,
  groupOf,
  GROUPS,
  type Coverage,
  type GroupCoverage,
  type ShelfPick,
  type ZoneId,
} from '../services/partyUsage';
import type { SwipeLogEntry } from '../types';
import { OCADO_MINIMUM } from './BasketPanel';
import { pickFlashTarget, useFlashOffer } from './FlashOffer';
import { ProductThumb, Stars } from './ProductBits';
import './partyPreview.css';

// The party trolley, regenerated from basket intent: the shopper sees their
// products laid out in a room, how far each goes for their guests, and a last
// shelf of picks that fill the gaps before they pay.

const BAG_CHARGE = 0.4;

const STATUS_LABEL: Record<Coverage, string> = { sorted: 'sorted', light: 'a bit light', missing: 'missing' };

export function PartyPreview({
  guests: initialGuests,
  history,
  flash,
  onContinue,
}: {
  guests: number;
  /** Loss-aversion offer on one shelf pick, when it hasn't run yet this session. */
  flash?: FlashProps;
  /** Every swipe from the chat, so picks reflect what the shopper liked and skipped. */
  history: SwipeLogEntry[];
  onContinue: () => void;
}) {
  const { lines } = useBasket();
  const [guests, setGuests] = useState(initialGuests);
  const [zone, setZone] = useState<ZoneId | null>(null);
  const groups = coverage(lines, guests);
  const partyLines = lines.filter((l) => groupOf(l.product));

  return (
    <div className="pp">
      <div className="pp-main">
        <header className="pp-hero">
          <h1>
            {partyDayLabel()} <mark>party</mark>,<br />
            laid out.
          </h1>
          <p className="muted">
            {lines.length} things from Shelf, set up for {guests} guests
          </p>
          <div className="pp-guests">
            <span>Guests</span>
            <div className="pp-stepper">
              <button type="button" onClick={() => setGuests((g) => Math.max(2, g - 1))} aria-label="Fewer guests">
                <Minus size={14} />
              </button>
              <strong aria-live="polite">{guests}</strong>
              <button type="button" onClick={() => setGuests((g) => Math.min(60, g + 1))} aria-label="More guests">
                <Plus size={14} />
              </button>
            </div>
            <span className="muted small">from your Shelf chat</span>
          </div>
        </header>

        <Room groups={groups} lines={partyLines} active={zone} onZone={setZone} />

        <section className="pp-tiles" aria-label="How far it goes">
          {groups.map((g) => (
            <CoverageTile key={g.id} group={g} guests={guests} />
          ))}
        </section>

        <LastMinuteShelf lines={lines} guests={guests} history={history} flash={flash} />

        <p className="pp-note">
          Nothing goes in unless you tap. Products, photos, prices and offers come from the Ocado catalogue. Party maths
          assumes 125ml glasses of wine (6 per bottle), 2.5 soft drinks each, 30g portions of cheese and snacks, 50g of
          party food and 12.5g sweet pieces.
        </p>
      </div>

      <Receipt onContinue={onContinue} />
    </div>
  );
}

// ---------- Room ----------

// Isometric projection: x runs along the right wall, y along the left wall, z up.
const ORIGIN = { x: 300, y: 150 };
const pt = (x: number, y: number, z: number): [number, number] => [
  ORIGIN.x + 26 * (x - y),
  ORIGIN.y + 13 * (x + y) - 14 * z,
];
const poly = (...pts: [number, number, number][]) => pts.map((p) => pt(...p).join(',')).join(' ');
const VIEW = { w: 600, h: 430 };

function IsoBox({
  x,
  y,
  z = 0,
  w,
  d,
  h,
  top,
  a,
  b,
}: {
  x: number;
  y: number;
  z?: number;
  w: number;
  d: number;
  h: number;
  top: string;
  a: string;
  b: string;
}) {
  const z1 = z + h;
  return (
    <g className="iso-box">
      <polygon points={poly([x + w, y, z], [x + w, y + d, z], [x + w, y + d, z1], [x + w, y, z1])} fill={a} />
      <polygon points={poly([x, y + d, z], [x + w, y + d, z], [x + w, y + d, z1], [x, y + d, z1])} fill={b} />
      <polygon points={poly([x, y, z1], [x + w, y, z1], [x + w, y + d, z1], [x, y + d, z1])} fill={top} />
    </g>
  );
}

const BUNTING = ['#c6e27a', '#f8c4d8', '#bfe0f8', '#f3e8a8', '#d9cbfa'];

// Where each zone's products sit (top of its furniture) and where its label goes.
// Label slots are fixed in room coordinates (centre x, top y) and chosen so no two
// labels, and no label and product stack, overlap; everything scales with the room.
const ZONE_LAYOUT: Record<ZoneId, { at: [number, number, number]; label: [number, number] }> = {
  bar: { at: [1.1, 3.3, 3.2], label: [112, 54] },
  sweet: { at: [2.9, 0.7, 2.4], label: [430, 16] },
  sofa: { at: [8.4, 3.6, 1.2], label: [516, 156] },
  board: { at: [5.6, 5.8, 1.4], label: [132, 298] },
};

const pos = (x: number, y: number): CSSProperties => ({
  left: `${(x / VIEW.w) * 100}%`,
  top: `${(y / VIEW.h) * 100}%`,
});

function Room({
  groups,
  lines,
  active,
  onZone,
}: {
  groups: GroupCoverage[];
  lines: BasketLine[];
  active: ZoneId | null;
  onZone: (z: ZoneId | null) => void;
}) {
  const info = (Object.keys(ZONE_LAYOUT) as ZoneId[]).map((z) => {
    const zoneGroups = groups.filter((g) => g.zone === z);
    const [ax, ay] = pt(...ZONE_LAYOUT[z].at);
    const status: Coverage = zoneGroups.some((g) => g.status === 'missing')
      ? 'missing'
      : zoneGroups.some((g) => g.status === 'light')
        ? 'light'
        : 'sorted';
    const zoneLines = lines.filter((l) => {
      const g = groupOf(l.product);
      return g && GROUPS.find((x) => x.id === g)?.zone === z;
    });
    return { z, ax, ay, zoneGroups, zoneLines, status };
  });
  const current = info.find((i) => i.z === active);

  return (
    <section className="pp-room" aria-label="Your party, laid out">
      <p className="pp-room-hint">hover anything to see how it gets used ↓</p>
      <div className="pp-room-stage">
        <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} aria-hidden>
          {/* walls */}
          <polygon points={poly([0, 0, 0], [0, 10, 0], [0, 10, 10], [0, 0, 10])} fill="#efe7fb" />
          <polygon points={poly([0, 0, 0], [10, 0, 0], [10, 0, 10], [0, 0, 10])} fill="#e6f0fa" />
          {/* floor + planks */}
          <polygon points={poly([0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0])} fill="#ead6b5" />
          {Array.from({ length: 9 }, (_, i) => (
            <line
              key={i}
              x1={pt(0, i + 1, 0)[0]}
              y1={pt(0, i + 1, 0)[1]}
              x2={pt(10, i + 1, 0)[0]}
              y2={pt(10, i + 1, 0)[1]}
              stroke="#dcc29c"
              strokeWidth={1}
            />
          ))}
          {/* rug */}
          <polygon
            points={poly([3.2, 3.6, 0], [8.4, 3.6, 0], [8.4, 8.8, 0], [3.2, 8.8, 0])}
            fill="#f8d3e3"
            stroke="#2a2e30"
            strokeWidth={1.2}
          />
          <polygon
            points={poly([3.7, 4.1, 0], [7.9, 4.1, 0], [7.9, 8.3, 0], [3.7, 8.3, 0])}
            fill="none"
            stroke="#fff"
            strokeWidth={2}
            strokeDasharray="5 5"
          />
          {/* bunting */}
          {[0, 1].map((wall) => (
            <g key={wall}>
              <polyline
                points={poly(
                  ...((wall
                    ? [
                        [0, 0, 9.4],
                        [10, 0, 9.4],
                      ]
                    : [
                        [0, 0, 9.4],
                        [0, 10, 9.4],
                      ]) as [number, number, number][]),
                )}
                fill="none"
                stroke="#2a2e30"
                strokeWidth={1}
              />
              {Array.from({ length: 10 }, (_, i) => {
                const c = i + 0.5;
                const pts: [number, number, number][] = wall
                  ? [
                      [c - 0.35, 0, 9.4],
                      [c + 0.35, 0, 9.4],
                      [c, 0, 8.4],
                    ]
                  : [
                      [0, c - 0.35, 9.4],
                      [0, c + 0.35, 9.4],
                      [0, c, 8.4],
                    ];
                return (
                  <polygon
                    key={i}
                    points={poly(...pts)}
                    fill={BUNTING[(i + wall * 2) % BUNTING.length]}
                    stroke="#2a2e30"
                    strokeWidth={0.8}
                  />
                );
              })}
            </g>
          ))}
          {/* chalkboard at the front of the left wall, clear of every label and product */}
          <polygon points={poly([0, 7.4, 4.4], [0, 9.6, 4.4], [0, 9.6, 6.6], [0, 7.4, 6.6])} fill="#2a2e30" />
          <text
            transform={`matrix(0.894,-0.447,0,1,${pt(0, 9.25, 5.1).join(',')})`}
            fill="#fdfcf9"
            fontFamily="Caveat, cursive"
            fontSize="14"
          >
            party · 8pm
          </text>
          {/* sweet spot sideboard, bar, sofa, coffee table, side table */}
          <IsoBox x={1.6} y={0.15} w={2.6} d={1.1} h={2.4} top="#fbe3ec" a="#f3c6d7" b="#f8d3e3" />
          <IsoBox x={0.3} y={1.4} w={1.6} d={4} h={3.2} top="#ffffff" a="#ece6f6" b="#f6f2fb" />
          <IsoBox x={5.4} y={0.2} w={4.2} d={0.7} h={3.2} top="#c9b6f4" a="#b9a3ee" b="#d9cbfa" />
          <IsoBox x={5.4} y={0.9} w={4.2} d={1.7} h={1.4} top="#d9cbfa" a="#b9a3ee" b="#cdbbf6" />
          <IsoBox x={9.0} y={0.9} w={0.6} d={1.7} h={2.1} top="#c9b6f4" a="#b9a3ee" b="#cdbbf6" />
          <IsoBox x={4.3} y={4.7} w={2.8} d={2.4} h={1.4} top="#d6a774" a="#b9875a" b="#c99868" />
          <IsoBox x={7.7} y={2.9} w={1.5} d={1.5} h={1.2} top="#7a5a3e" a="#5e432c" b="#6c4e35" />
        </svg>

        <svg className="pp-leaders" viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} aria-hidden>
          {info.map(({ z, ax, ay }) => {
            const [lx, ly] = ZONE_LAYOUT[z].label;
            return <line key={z} x1={lx} y1={ly + 24} x2={ax} y2={ay - 30} className={active === z ? 'active' : ''} />;
          })}
        </svg>

        {info.map(({ z, ax, ay, zoneLines, zoneGroups, status }) => (
          <div
            key={z}
            className={`pp-zone${active === z ? ' active' : ''}${active && active !== z ? ' dim' : ''}`}
            onMouseEnter={() => onZone(z)}
            onMouseLeave={() => onZone(null)}
            onFocus={() => onZone(z)}
            onBlur={() => onZone(null)}
            tabIndex={0}
            aria-label={`${ZONES[z]}: ${zoneGroups.map((g) => `${g.label} ${g.have} ${g.unit}`).join(', ')}`}
          >
            <div className="pp-items" style={pos(ax, ay)}>
              {zoneLines.slice(0, 3).map((l, i) => (
                <span
                  key={l.product.id}
                  className="pp-item"
                  style={{ '--i': i - (Math.min(3, zoneLines.length) - 1) / 2 } as CSSProperties}
                >
                  <ProductThumb product={l.product} size="sm" />
                  {l.qty > 1 && <em>×{l.qty}</em>}
                </span>
              ))}
              {zoneLines.length === 0 && <span className="pp-empty">empty</span>}
            </div>
            <div className="pp-label" style={pos(...ZONE_LAYOUT[z].label)}>
              <ZoneSummary zone={z} groups={zoneGroups} status={status} />
            </div>
          </div>
        ))}
      </div>

      {/* Narrow screens: labels move out of the room into a list. */}
      <ul className="pp-zone-list">
        {info.map(({ z, zoneGroups, status }) => (
          <li key={z}>
            <button
              type="button"
              className={active === z ? 'active' : ''}
              onClick={() => onZone(active === z ? null : z)}
            >
              <ZoneSummary zone={z} groups={zoneGroups} status={status} />
            </button>
          </li>
        ))}
      </ul>

      <div className="pp-caption" aria-live="polite">
        {current ? (
          <>
            <strong>How {ZONES[current.z]} gets used</strong>
            {current.zoneLines.length ? (
              current.zoneLines.map((l) => (
                <span key={l.product.id}>
                  {l.qty} × {l.product.name} → {servings(l.product).units * l.qty} ({servings(l.product).how}
                  {l.qty > 1 ? ' each' : ''})
                </span>
              ))
            ) : (
              <span>Nothing here yet. See the last-minute shelf below.</span>
            )}
          </>
        ) : (
          <span className="muted">Hover or tap a spot in the room to see how each product gets used.</span>
        )}
      </div>
    </section>
  );
}

function ZoneSummary({ zone, groups, status }: { zone: ZoneId; groups: GroupCoverage[]; status: Coverage }) {
  return (
    <>
      <span className="pp-label-zone">{ZONES[zone]}</span>
      {groups.map((g) => (
        <span key={g.id} className="pp-label-sum">
          {g.label} · {g.have} {g.unit}
        </span>
      ))}
      <span className={`pp-chip ${status}`}>
        {status === 'sorted' && <Check size={10} strokeWidth={3} />}
        {STATUS_LABEL[status]}
      </span>
    </>
  );
}

// ---------- Coverage tiles ----------

function CoverageTile({ group, guests }: { group: GroupCoverage; guests: number }) {
  const covers = Math.min(guests, Math.floor(group.have / group.perGuest));
  const detail =
    group.id === 'soft'
      ? `${(group.have / guests).toFixed(1)} each`
      : group.status === 'sorted'
        ? `enough for all ${guests}`
        : `${covers} of ${guests} guests`;
  return (
    <div className={`pp-tile ${group.status}`}>
      <div className="pp-tile-head">
        <span>{group.label}</span>
        <span className={`pp-chip ${group.status}`}>
          {group.status === 'sorted' && <Check size={10} strokeWidth={3} />}
          {STATUS_LABEL[group.status]}
        </span>
      </div>
      <strong>
        {group.have} {group.unit}
      </strong>
      <span className="muted small">{detail}</span>
    </div>
  );
}

// ---------- Last-minute shelf ----------

function LastMinuteShelf({
  lines,
  guests,
  history,
  flash,
}: {
  lines: BasketLine[];
  guests: number;
  history: SwipeLogEntry[];
  flash?: FlashProps;
}) {
  // Picks are computed against the trolley as it was, so a card doesn't vanish once it's added.
  const [picks] = useState(() => shelfPicks(lines, guests, history));
  if (!picks.length) return null;

  return (
    <section className="pp-shelf">
      <header>
        <h2>Last-minute shelf</h2>
        <p className="muted small">Each one fills a gap on your table. Tap to add.</p>
      </header>
      <div className="pp-shelf-board">
        {picks.map((p) => (
          <span key={p.product.id} className="pp-shelf-item">
            <ProductThumb product={p.product} size="md" />
          </span>
        ))}
      </div>
      <PickCards picks={picks} flash={flash} />
    </section>
  );
}

/** Flash offer settings for a set of pick cards (once per session). */
export interface FlashProps {
  onDone: () => void;
}

/** Pick cards, shared by the party shelf and the standard trolley's "before you check out". */
export function PickCards({ picks, flash }: { picks: ShelfPick[]; flash?: FlashProps }) {
  const { add } = useBasket();
  const [added, setAdded] = useState<Set<string>>(new Set());
  // Chosen once, so the offer doesn't hop to another card as the trolley changes.
  const [target] = useState(() => (flash ? pickFlashTarget(picks) : undefined));
  const offer = useFlashOffer(target, flash?.onDone);

  return (
    <div className="pp-cards">
      {picks.map((p) => {
        const done = added.has(p.product.id);
        const isFlash = target?.id === p.product.id && offer.state !== 'waiting';
        const live = isFlash && offer.state === 'live';
        const took = isFlash && offer.state === 'taken';
        const price = live || took ? p.product.price - offer.saving : p.product.price;
        return (
          <article
            key={p.product.id}
            ref={target?.id === p.product.id ? offer.ref : undefined}
            className={`pp-card${isFlash ? ` flash-card flash-${offer.state}` : ''}`}
          >
            <span className="pp-card-reason">{p.reason}</span>
            <div className="pp-card-body">
              {isFlash && (
                <span className="flash-ribbon" role="status" aria-live="polite">
                  <Timer size={13} />
                  {live && (
                    <>
                      The special offer for this product will go in <b>{offer.left}s</b>
                    </>
                  )}
                  {took && <>Special offer applied</>}
                  {offer.state === 'expired' && <>The offer has gone</>}
                </span>
              )}
              <strong className="pp-card-name">{p.product.name}</strong>
              <span className="pp-card-meta">
                {[p.product.brand, p.product.size].filter(Boolean).join(' · ')} · <Stars rating={p.product.rating} />
              </span>
              {p.again && <span className="pp-card-meta">already in your trolley</span>}
              {p.group && (
                <span className="pp-card-gain">
                  {p.group.label} {p.group.have} → {p.group.have + p.gain} {p.group.unit}
                </span>
              )}
              {p.tag && !live && <span className={`pp-card-tag ${p.tag.kind}`}>{p.tag.text}</span>}
              <span className="pp-card-price">
                {formatPrice(price)}
                {(live || took) && <s>{formatPrice(p.product.price)}</s>}
              </span>
              <button
                type="button"
                className="pp-card-btn"
                disabled={done || took}
                onClick={() => {
                  if (live) offer.take();
                  else add(p.product.id);
                  setAdded((s) => new Set(s).add(p.product.id));
                }}
              >
                {done || took ? (
                  <>
                    <Check size={14} /> Added
                  </>
                ) : live ? (
                  `Add for ${formatPrice(price)}`
                ) : p.again ? (
                  p.group?.id === 'toast' ? (
                    'Add a 2nd bottle'
                  ) : (
                    'Add another'
                  )
                ) : p.group ? (
                  'Put it on the table'
                ) : (
                  'Add to trolley'
                )}
              </button>
              {live && (
                <span className="flash-card-bar" aria-hidden>
                  <i style={{ animationDuration: `${offer.left}s` }} />
                </span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

// ---------- Receipt ----------

function Receipt({ onContinue }: { onContinue: () => void }) {
  const { lines, count, subtotal, setQty, flash } = useBasket();
  const flashSaving = flash?.saving ?? 0;
  const savings = lines.reduce(
    (s, l) => s + (l.product.wasPrice ? (l.product.wasPrice - l.product.price) * l.qty : 0),
    0,
  );
  const total = subtotal + BAG_CHARGE;
  const toMin = Math.max(0, OCADO_MINIMUM - subtotal);

  return (
    <aside className="pp-receipt" aria-label="Trolley">
      <div className="pp-receipt-head">
        <span className="oc-wordmark">ocado</span>
        <span>Trolley · handed off from Shelf</span>
      </div>
      <span className="pp-receipt-sub">From Shelf · {count}</span>
      <ul>
        {lines.map(({ product, qty }) => (
          <li key={product.id}>
            <span className="pp-receipt-qty">
              <button
                type="button"
                onClick={() => setQty(product.id, qty - 1)}
                aria-label={`Remove one ${product.name}`}
              >
                −
              </button>
              {qty}
              <button type="button" onClick={() => setQty(product.id, qty + 1)} aria-label={`Add one ${product.name}`}>
                +
              </button>
            </span>
            <ProductThumb product={product} size="sm" />
            <span className="pp-receipt-name">{product.name}</span>
            <span className="pp-receipt-price">
              {formatPrice(product.price * qty)}
              {product.wasPrice && <s>{formatPrice(product.wasPrice * qty)}</s>}
            </span>
          </li>
        ))}
      </ul>
      <dl>
        <div>
          <dt>Items ({count})</dt>
          <dd>{formatPrice(subtotal + savings + flashSaving)}</dd>
        </div>
        {flashSaving > 0 && (
          <div className="save">
            <dt>Special offer</dt>
            <dd>−{formatPrice(flashSaving)}</dd>
          </div>
        )}
        {savings > 0 && (
          <div className="save">
            <dt>Offer savings</dt>
            <dd>−{formatPrice(savings)}</dd>
          </div>
        )}
        <div>
          <dt>Delivery</dt>
          <dd>next step</dd>
        </div>
        <div>
          <dt>Bag charge</dt>
          <dd>{formatPrice(BAG_CHARGE)}</dd>
        </div>
      </dl>
      <div className="pp-receipt-total">
        <span>Total</span>
        <strong>{formatPrice(total)}</strong>
      </div>
      <div className="pp-receipt-min">
        <span>
          <i style={{ width: `${Math.min(100, (subtotal / OCADO_MINIMUM) * 100)}%` }} />
        </span>
        <em>{toMin > 0 ? `${formatPrice(toMin)} to £40 minimum` : '✓ £40 minimum reached'}</em>
      </div>
      <button type="button" className="oc-btn" onClick={onContinue} disabled={!lines.length}>
        Choose delivery slot <ArrowRight size={16} />
      </button>
      <span className="pp-receipt-foot">Demo · nothing is charged</span>
    </aside>
  );
}

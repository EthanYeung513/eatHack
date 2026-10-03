import { ArrowRight, Check, Dumbbell, Handshake, Minus, Tag } from 'lucide-react';
import { goalProgress, NUDGE_LABEL, ROLE_LABEL } from '../services/partyPlanner';
import { formatPrice, useBasket } from '../state/basket';
import type { NudgeType, WrapUp } from '../types';

const NUDGE_ICON: Record<NudgeType, typeof Tag> = {
  offer: Tag,
  partner: Handshake,
  nutrition: Dumbbell,
  none: Minus,
};

/** End of the party journey: live goal progress, what the shopper wants, and which nudges worked. */
export function WrapUpCard({ wrapUp, onCheckout }: { wrapUp: WrapUp; onCheckout: () => void }) {
  const { lines, subtotal, count } = useBasket();
  const progress = goalProgress(wrapUp.guests, lines);
  const covered = progress.filter((p) => p.done).length;

  const rated = wrapUp.nudgeStats.filter((s) => s.type !== 'none' && s.shown > 0);
  const best = [...rated].sort((a, b) => b.accepted / b.shown - a.accepted / a.shown)[0];

  return (
    <div className="wrapup">
      <header className="wrapup-head">
        <div>
          <span className="wrapup-kicker">Party for {wrapUp.guests}</span>
          <h3>
            {covered === progress.length
              ? 'You’re all set!'
              : `${covered} of ${progress.length} essentials covered`}
          </h3>
        </div>
        <span className="wrapup-total">
          {count} items · {formatPrice(subtotal)}
        </span>
      </header>

      <ul className="goal-list">
        {progress.map((item) => (
          <li key={item.key} className={item.done ? 'done' : ''}>
            <span className="goal-check">{item.done && <Check size={13} strokeWidth={3} />}</span>
            <span className="goal-label">{item.label}</span>
            <span className="goal-count">
              {Math.min(item.have, item.target)}/{item.target}
            </span>
            <span className="goal-bar">
              <i style={{ width: `${Math.min(100, (item.have / item.target) * 100)}%` }} />
            </span>
          </li>
        ))}
      </ul>

      {wrapUp.likedRoles.length > 0 && (
        <div className="wrapup-section">
          <span className="wrapup-label">You’re looking for</span>
          <div className="chips">
            {wrapUp.likedRoles.map((r) => (
              <span key={r} className="chip chip-outline">
                {ROLE_LABEL[r]}
              </span>
            ))}
          </div>
        </div>
      )}

      {wrapUp.nudgeStats.length > 0 && (
        <div className="wrapup-section">
          <span className="wrapup-label">What helped you decide</span>
          <ul className="nudge-stats">
            {wrapUp.nudgeStats.map((s) => {
              const Icon = NUDGE_ICON[s.type];
              const isBest = best && s.type === best.type && best.accepted > 0;
              return (
                <li key={s.type} className={isBest ? 'best' : ''}>
                  <span className={`nudge-stat-icon nudge-${s.type}`}>
                    <Icon size={13} />
                  </span>
                  <span className="nudge-stat-label">
                    {NUDGE_LABEL[s.type]}
                    {isBest && <em>Works best for you</em>}
                  </span>
                  <span className="nudge-stat-bar">
                    <i style={{ width: `${(s.accepted / s.shown) * 100}%` }} />
                  </span>
                  <span className="nudge-stat-count">
                    {s.accepted}/{s.shown}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <button type="button" className="btn btn-primary btn-block" onClick={onCheckout} disabled={!count}>
        Checkout on Ocado <ArrowRight size={16} />
      </button>
      {covered < progress.length && count > 0 && (
        <p className="wrapup-note">We’ll suggest anything still missing before you pay.</p>
      )}
    </div>
  );
}

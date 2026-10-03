// Nudge outcomes from the shopper app, kept in the browser so the brand
// dashboard (same site) can show how this shopper responded.

export type NudgeExperiment = 'social-proof' | 'loss-aversion';

export interface NudgeEvent {
  experiment: NudgeExperiment;
  productId: string;
  /** converted: added/bought · skipped: swiped left or said no · expired: the timer ran out. */
  outcome: 'converted' | 'skipped' | 'expired' | 'watched';
  /** How long the shopper took to respond, where it applies. */
  ms?: number;
  at: number;
}

const KEY = 'shelf.nudgeEvents';

export function readNudgeEvents(): NudgeEvent[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as NudgeEvent[];
  } catch {
    return [];
  }
}

export function logNudge(event: Omit<NudgeEvent, 'at'>) {
  try {
    const events = readNudgeEvents();
    const last = events[events.length - 1];
    // The same event twice in a row within a moment is a double fire, not a second response.
    const repeat =
      last &&
      last.experiment === event.experiment &&
      last.productId === event.productId &&
      last.outcome === event.outcome &&
      Date.now() - last.at < 1500;
    if (repeat) return;
    localStorage.setItem(KEY, JSON.stringify([...events, { ...event, at: Date.now() }].slice(-200)));
  } catch {
    // Storage unavailable (private mode etc.): the dashboard just shows no live data.
  }
}

export function clearNudgeEvents() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

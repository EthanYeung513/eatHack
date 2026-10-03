import { createContext, useCallback, useContext, useMemo, useReducer, useState, type ReactNode } from 'react';
import { PRODUCTS_BY_ID } from '../data/products';
import type { Product } from '../types';

type Quantities = Record<string, number>;

type Action = { type: 'add'; id: string; qty: number } | { type: 'set'; id: string; qty: number } | { type: 'clear' };

function reducer(state: Quantities, action: Action): Quantities {
  switch (action.type) {
    case 'add':
      return { ...state, [action.id]: (state[action.id] ?? 0) + action.qty };
    case 'set': {
      const next = { ...state };
      if (action.qty <= 0) delete next[action.id];
      else next[action.id] = action.qty;
      return next;
    }
    case 'clear':
      return {};
  }
}

export interface BasketLine {
  product: Product;
  qty: number;
}

/** A one-off saving on one unit of a product (the checkout flash offer). */
export interface FlashDeal {
  id: string;
  saving: number;
}

interface BasketContextValue {
  lines: BasketLine[];
  count: number;
  /** After any flash deal. */
  subtotal: number;
  /** The flash deal, while its product is still in the basket. */
  flash: FlashDeal | null;
  applyFlash: (deal: FlashDeal) => void;
  qtyOf: (id: string) => number;
  add: (id: string, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
}

const BasketContext = createContext<BasketContextValue | null>(null);

export function BasketProvider({ children }: { children: ReactNode }) {
  const [quantities, dispatch] = useReducer(reducer, {});
  const [flashDeal, setFlashDeal] = useState<FlashDeal | null>(null);

  const add = useCallback((id: string, qty = 1) => dispatch({ type: 'add', id, qty }), []);
  const setQty = useCallback((id: string, qty: number) => dispatch({ type: 'set', id, qty }), []);
  const clear = useCallback(() => {
    dispatch({ type: 'clear' });
    setFlashDeal(null);
  }, []);

  const value = useMemo<BasketContextValue>(() => {
    const lines = Object.entries(quantities).map(([id, qty]) => ({ product: PRODUCTS_BY_ID[id], qty }));
    const flash = flashDeal && quantities[flashDeal.id] ? flashDeal : null;
    return {
      lines,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal: lines.reduce((sum, l) => sum + l.qty * l.product.price, 0) - (flash?.saving ?? 0),
      flash,
      applyFlash: setFlashDeal,
      qtyOf: (id) => quantities[id] ?? 0,
      add,
      setQty,
      clear,
    };
  }, [quantities, flashDeal, add, setQty, clear]);

  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>;
}

export function useBasket() {
  const ctx = useContext(BasketContext);
  if (!ctx) throw new Error('useBasket must be used inside BasketProvider');
  return ctx;
}

export const formatPrice = (n: number) => `£${n.toFixed(2)}`;

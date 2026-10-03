import { useCallback, useEffect, useState } from 'react';
import { BasketPanel } from './components/BasketPanel';
import { ChatView } from './components/Chat';
import { Header } from './components/Header';
import { OcadoCheckout } from './components/OcadoCheckout';
import { SwipeDeck } from './components/SwipeDeck';
import { useBasket } from './state/basket';
import { useChat } from './state/useChat';
import type { ChatMessage, SwipeResult } from './types';

export default function App() {
  const { messages, thinking, send, completeSwipe, setView: setMessageView, reset } = useChat();
  const { clear } = useBasket();
  const [view, setView] = useState<'shop' | 'checkout'>('shop');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deck, setDeck] = useState<ChatMessage | null>(null);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheetOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  const closeDeck = useCallback(
    (result: SwipeResult) => {
      if (deck && result.added.length + result.skipped.length > 0) completeSwipe(deck.id, result);
      setDeck(null);
    },
    [deck, completeSwipe],
  );

  const checkout = () => {
    setSheetOpen(false);
    setView('checkout');
  };

  if (view === 'checkout') {
    return (
      <OcadoCheckout
        onExit={(orderPlaced) => {
          if (orderPlaced) clear();
          setView('shop');
        }}
      />
    );
  }

  return (
    <div className="app">
      <Header onNewChat={reset} onOpenBasket={() => setSheetOpen(true)} canReset={messages.length > 0} />
      <div className="app-body">
        <ChatView
          messages={messages}
          thinking={thinking}
          onSend={send}
          onOpenDeck={setDeck}
          onViewChange={setMessageView}
        />
        <aside className="basket-aside">
          <BasketPanel onCheckout={checkout} />
        </aside>
      </div>

      {sheetOpen && (
        <div className="sheet-backdrop" onClick={() => setSheetOpen(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Basket" onClick={(e) => e.stopPropagation()}>
            <span className="sheet-grip" />
            <BasketPanel onCheckout={checkout} onClose={() => setSheetOpen(false)} />
          </div>
        </div>
      )}

      {deck?.products && (
        <SwipeDeck title={deck.deckTitle ?? 'Picks'} products={deck.products} onClose={closeDeck} />
      )}
    </div>
  );
}

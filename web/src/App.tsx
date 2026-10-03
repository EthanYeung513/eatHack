import { useEffect, useState } from 'react';
import { BasketPanel } from './components/BasketPanel';
import { ChatView } from './components/Chat';
import { Header } from './components/Header';
import { OcadoCheckout } from './components/OcadoCheckout';
import { useBasket } from './state/basket';
import { useChat } from './state/useChat';

export default function App() {
  const { messages, thinking, partyGuests, swipeHistory, send, completeSwipe, setView: setMessageView, reset } =
    useChat();
  const { clear } = useBasket();
  const [view, setView] = useState<'shop' | 'checkout'>('shop');
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheetOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  const checkout = () => {
    setSheetOpen(false);
    setView('checkout');
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      {view === 'checkout' && (
        <OcadoCheckout
          partyGuests={partyGuests}
          swipeHistory={swipeHistory}
          onExit={(orderPlaced) => {
            if (orderPlaced) clear();
            setView('shop');
          }}
        />
      )}

      {/* Stays mounted during checkout so swipe decks keep their state. */}
      <div className="app" hidden={view === 'checkout'}>
        <Header onNewChat={reset} onOpenBasket={() => setSheetOpen(true)} canReset={messages.length > 0} />
        <div className="app-body">
          <ChatView
            messages={messages}
            thinking={thinking}
            onSend={send}
            onSwipeComplete={completeSwipe}
            onViewChange={setMessageView}
            onCheckout={checkout}
          />
          <aside className="basket-aside">
            <BasketPanel onCheckout={checkout} />
          </aside>
        </div>

        {sheetOpen && (
          <div className="sheet-backdrop" onClick={() => setSheetOpen(false)}>
            <div
              className="sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Basket"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="sheet-grip" />
              <BasketPanel onCheckout={checkout} onClose={() => setSheetOpen(false)} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

import {
  ArrowUpRight,
  Candy,
  Ghost,
  Layers,
  Lightbulb,
  MessageSquareQuote,
  PartyPopper,
  ShoppingBasket,
  Soup,
  Sparkles,
  Tag,
  Wine,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { AgentMode, ChatMessage, ProductView, SwipeResult } from '../types';
import { ReviewsBlock } from './ReviewsBlock';
import { SwipeDeck } from './SwipeDeck';
import { WrapUpCard } from './WrapUpCard';

const STARTER_CARDS = [
  { icon: PartyPopper, title: 'Host a party', prompt: 'Host a party for 12' },
  { icon: Wine, title: 'Compare gin', prompt: 'Which gin is best?' },
  { icon: Soup, title: 'Easy dinners', prompt: 'Easy dinners for one this week' },
  { icon: Tag, title: 'Deals right now', prompt: "What's on offer right now?" },
];

export function ChatView({
  messages,
  thinking,
  onSend,
  onSwipeComplete,
  onViewChange,
  onCheckout,
}: {
  messages: ChatMessage[];
  thinking: string | null;
  onSend: (text: string) => void;
  onSwipeComplete: (messageId: string, result: SwipeResult) => void;
  onViewChange: (messageId: string, view: ProductView) => void;
  onCheckout: () => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const lastId = messages[messages.length - 1]?.id;
  const latestDeckId = [...messages].reverse().find((m) => m.mode === 'swipe' || m.mode === 'reviews')?.id;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, thinking]);

  return (
    <section className="chat">
      <div className="chat-scroll">
        <div className="chat-inner">
          {messages.length === 0 ? (
            <Welcome onPick={onSend} />
          ) : (
            messages.map((m) => (
              <Message
                key={m.id}
                message={m}
                isLast={m.id === lastId && thinking === null}
                onSuggestion={onSend}
                keyboardActive={m.id === latestDeckId}
                onSwipeComplete={(result) => onSwipeComplete(m.id, result)}
                onViewChange={(view) => onViewChange(m.id, view)}
                onCheckout={onCheckout}
              />
            ))
          )}
          {thinking !== null && <Thinking stage={thinking} />}
          <div ref={endRef} />
        </div>
      </div>
      <Composer disabled={thinking !== null} onSend={onSend} />
    </section>
  );
}

function Welcome({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="welcome">
      <div className="welcome-hero">
        <Sticker icon={ShoppingBasket} tone="lime" className="float float-a" />
        <Sticker icon={Wine} tone="lavender" className="float float-b" />
        <Sticker icon={Ghost} tone="pink" className="float float-c" />
        <Sticker icon={Candy} tone="sky" className="float float-d" />
        <span className="welcome-kicker">Hi there</span>
        <h1>What are you shopping for?</h1>
        <p className="muted">
          Tell me the occasion or ask about a product. I'll line up options to swipe through, or show you what real
          shoppers think.
        </p>
      </div>
      <div className="starter-grid">
        {STARTER_CARDS.map(({ icon, title, prompt }, i) => (
          <button key={title} type="button" className={`starter starter-${i % 2 ? 'light' : 'lime'}`} onClick={() => onPick(prompt)}>
            <Sticker icon={icon} tone={STARTER_TONES[i]} />
            <strong>{title}</strong>
            <span className="small">{prompt}</span>
            <span className="starter-arrow" aria-hidden>
              <ArrowUpRight size={16} />
            </span>
          </button>
        ))}
      </div>
      <div className="modes-band">
        <div>
          <span className="modes-icon">
            <Layers size={18} />
          </span>
          <h3>Browsing? Swipe.</h3>
          <p>Right to add, left to skip. The fastest way through a big range.</p>
        </div>
        <div>
          <span className="modes-icon">
            <MessageSquareQuote size={18} />
          </span>
          <h3>Deciding? Read real reviews.</h3>
          <p>What shoppers actually liked and didn't, side by side.</p>
        </div>
      </div>
    </div>
  );
}

function Message({
  message,
  isLast,
  keyboardActive,
  onSuggestion,
  onSwipeComplete,
  onViewChange,
  onCheckout,
}: {
  message: ChatMessage;
  isLast: boolean;
  keyboardActive: boolean;
  onSuggestion: (text: string) => void;
  onSwipeComplete: (result: SwipeResult) => void;
  onViewChange: (view: ProductView) => void;
  onCheckout: () => void;
}) {
  const hasProducts = (message.mode === 'swipe' || message.mode === 'reviews') && !!message.products?.length;
  // Party decks are steps in a guided flow, so they stay as swipe decks.
  const isPartyDeck = !!message.deck && message.deck.kind !== 'standard';
  const view = message.view ?? message.mode;

  if (message.role === 'user') {
    return (
      <div className="msg msg-user">
        <p>{message.text}</p>
      </div>
    );
  }

  return (
    <div className="msg msg-assistant">
      <Avatar />
      <div className="msg-body">
        <p>{message.text}</p>

        {hasProducts && !isPartyDeck && (
          <ViewToggle value={view} suggested={message.mode as ProductView} onChange={onViewChange} />
        )}
        {/* Both stay mounted so swipe progress survives toggling views. */}
        {hasProducts && (
          <div hidden={view !== 'swipe'}>
            <SwipeDeck
              title={message.deckTitle ?? 'Top matches'}
              products={message.products!}
              config={message.deck}
              keyboardActive={keyboardActive && view === 'swipe'}
              onComplete={onSwipeComplete}
            />
          </div>
        )}
        {hasProducts && view === 'reviews' && <ReviewsBlock products={message.products!} />}
        {message.wrapUp && <WrapUpCard wrapUp={message.wrapUp} onCheckout={onCheckout} />}

        {message.rationale && view === message.mode && (
          <p className="rationale">
            <Lightbulb size={13} />
            <span>{message.rationale}</span>
          </p>
        )}

        {isLast && message.suggestions && (
          <div className="suggestions">
            {message.suggestions.map((s) => (
              <button key={s} type="button" className="suggestion" onClick={() => onSuggestion(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const VIEW_OPTIONS: { id: ProductView; label: string; icon: typeof Layers }[] = [
  { id: 'swipe', label: 'Swipe', icon: Layers },
  { id: 'reviews', label: 'Shopper reviews', icon: MessageSquareQuote },
];

function ViewToggle({
  value,
  suggested,
  onChange,
}: {
  value?: ProductView | AgentMode;
  suggested: ProductView;
  onChange: (view: ProductView) => void;
}) {
  return (
    <div className="view-toggle" role="radiogroup" aria-label="How to browse these products">
      {VIEW_OPTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          className={value === id ? 'active' : ''}
          onClick={() => onChange(id)}
        >
          <Icon size={14} />
          {label}
          {id === suggested && <span className="view-toggle-tag">Suggested</span>}
        </button>
      ))}
    </div>
  );
}

function Thinking({ stage }: { stage: string }) {
  return (
    <div className="msg msg-assistant">
      <Avatar />
      <div className="thinking">
        <span className="dots">
          <i />
          <i />
          <i />
        </span>
        <span className="muted small">{stage || 'Thinking'}…</span>
      </div>
    </div>
  );
}

function Avatar() {
  return (
    <span className="avatar" aria-hidden>
      <Sparkles size={15} />
    </span>
  );
}

type Tone = 'lime' | 'pink' | 'lavender' | 'sky' | 'butter';

const STARTER_TONES: Tone[] = ['pink', 'lavender', 'butter', 'sky'];

function Sticker({ icon: Icon, tone, className = '' }: { icon: LucideIcon; tone: Tone; className?: string }) {
  return (
    <span className={`sticker tone-${tone} ${className}`} aria-hidden>
      <Icon size={20} strokeWidth={2} />
    </span>
  );
}

function Composer({ disabled, onSend }: { disabled: boolean; onSend: (text: string) => void }) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (disabled || !value.trim()) return;
    onSend(value);
    setValue('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form className="composer" onSubmit={submit}>
      <div className="composer-box">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          placeholder="Ask about an occasion, a product, or a budget…"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Message"
        />
        <button type="submit" className="send-btn" disabled={disabled || !value.trim()} aria-label="Send">
          <ArrowUpRight size={18} />
        </button>
      </div>
      <p className="composer-note muted">Prices and reviews are sample data for this prototype.</p>
    </form>
  );
}

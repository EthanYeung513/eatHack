import {
  ArrowUpRight,
  Beer,
  CakeSlice,
  Layers,
  Lightbulb,
  MessageSquareQuote,
  Popcorn,
  ShoppingBasket,
  Sparkles,
  Wine,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { AgentMode, ChatMessage, Product, ProductView } from '../types';
import { ProductThumb } from './ProductBits';
import { ReviewsBlock } from './ReviewsBlock';

const STARTER_CARDS = [
  { icon: CakeSlice, title: 'Hosting a party', prompt: 'Hosting a party for 12 on Saturday' },
  { icon: Wine, title: 'Compare prosecco', prompt: 'Which prosecco is best?' },
  { icon: Popcorn, title: 'Movie night', prompt: 'Snacks for a movie night' },
  { icon: Beer, title: 'Weekend BBQ', prompt: 'BBQ for 10 people, some are vegetarian' },
];

export function ChatView({
  messages,
  thinking,
  onSend,
  onOpenDeck,
  onViewChange,
}: {
  messages: ChatMessage[];
  thinking: string | null;
  onSend: (text: string) => void;
  onOpenDeck: (message: ChatMessage) => void;
  onViewChange: (messageId: string, view: ProductView) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const lastId = messages[messages.length - 1]?.id;

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
                onOpenDeck={() => onOpenDeck(m)}
                onViewChange={(view) => onViewChange(m.id, view)}
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
        <Sticker icon={CakeSlice} tone="pink" className="float float-c" />
        <Sticker icon={Popcorn} tone="sky" className="float float-d" />
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
  onSuggestion,
  onOpenDeck,
  onViewChange,
}: {
  message: ChatMessage;
  isLast: boolean;
  onSuggestion: (text: string) => void;
  onOpenDeck: () => void;
  onViewChange: (view: ProductView) => void;
}) {
  const hasProducts = (message.mode === 'swipe' || message.mode === 'reviews') && !!message.products?.length;
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

        {hasProducts && (
          <ViewToggle value={view} suggested={message.mode as ProductView} onChange={onViewChange} />
        )}
        {hasProducts && view === 'swipe' && (
          <SwipeLauncher message={message} products={message.products!} onOpen={onOpenDeck} />
        )}
        {hasProducts && view === 'reviews' && <ReviewsBlock products={message.products!} />}

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

function SwipeLauncher({
  message,
  products,
  onOpen,
}: {
  message: ChatMessage;
  products: Product[];
  onOpen: () => void;
}) {
  const result = message.swipeResult;
  return (
    <div className="launcher">
      <div className="launcher-stack" aria-hidden>
        {products.slice(0, 3).map((p, i) => (
          <div key={p.id} className="launcher-card" style={{ transform: `rotate(${(i - 1) * 7}deg)`, zIndex: 3 - i }}>
            <ProductThumb product={p} size="sm" />
          </div>
        ))}
      </div>
      <div className="launcher-text">
        <strong>{message.deckTitle ?? 'Top matches'}</strong>
        <span className="muted small">
          {result
            ? `${result.added.length} added · ${result.added.length + result.skipped.length} of ${products.length} reviewed`
            : `${products.length} products · swipe to add`}
        </span>
      </div>
      <button type="button" className={`btn ${result ? 'btn-ghost' : 'btn-primary'} btn-sm`} onClick={onOpen}>
        <Layers size={15} />
        {result ? 'Swipe again' : 'Start swiping'}
      </button>
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

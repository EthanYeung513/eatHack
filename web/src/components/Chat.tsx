import { ArrowUp, Beer, CakeSlice, Layers, Lightbulb, Popcorn, Sparkles, Wine } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { ChatMessage, Product } from '../types';
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
}: {
  messages: ChatMessage[];
  thinking: string | null;
  onSend: (text: string) => void;
  onOpenDeck: (message: ChatMessage) => void;
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
      <span className="welcome-kicker">
        <Sparkles size={14} /> Shopping assistant for Ocado
      </span>
      <h1>What are you shopping for?</h1>
      <p className="muted">
        Describe an occasion or ask about a product. I'll either line up options to swipe through or show you what
        real shoppers think.
      </p>
      <div className="starter-grid">
        {STARTER_CARDS.map(({ icon: Icon, title, prompt }) => (
          <button key={title} type="button" className="starter" onClick={() => onPick(prompt)}>
            <span className="starter-icon">
              <Icon size={18} />
            </span>
            <span>
              <strong>{title}</strong>
              <span className="muted small">{prompt}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Message({
  message,
  isLast,
  onSuggestion,
  onOpenDeck,
}: {
  message: ChatMessage;
  isLast: boolean;
  onSuggestion: (text: string) => void;
  onOpenDeck: () => void;
}) {
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

        {message.mode === 'swipe' && message.products && (
          <SwipeLauncher message={message} products={message.products} onOpen={onOpenDeck} />
        )}
        {message.mode === 'reviews' && message.products && <ReviewsBlock products={message.products} />}

        {message.rationale && (
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
        <strong>{message.deckTitle}</strong>
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
          <ArrowUp size={18} />
        </button>
      </div>
      <p className="composer-note muted">Prices and reviews are sample data for this prototype.</p>
    </form>
  );
}

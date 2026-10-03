import { BadgeCheck, ChevronDown, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useState } from 'react';
import { formatPrice } from '../state/basket';
import type { Product } from '../types';
import { AddToBasket, ProductThumb, Stars } from './ProductBits';

const INITIAL_COUNT = 3;

export function ReviewsBlock({ products }: { products: Product[] }) {
  const [showAll, setShowAll] = useState(false);
  const hidden = products.length - INITIAL_COUNT;
  const visible = showAll ? products : products.slice(0, INITIAL_COUNT);

  return (
    <div className="reviews">
      <div className="reviews-grid">
        {visible.map((p, i) => (
          <ReviewCard key={p.id} product={p} rank={i + 1} />
        ))}
      </div>
      {hidden > 0 && (
        <button type="button" className="btn btn-ghost btn-sm reviews-more" onClick={() => setShowAll((s) => !s)}>
          {showAll ? 'Show top 3 only' : `Show ${hidden} more`}
          <ChevronDown size={14} className={showAll ? 'flip' : ''} />
        </button>
      )}
    </div>
  );
}

function ReviewCard({ product, rank }: { product: Product; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? product.reviews : product.reviews.slice(0, 1);

  return (
    <article className={`review-card${rank === 1 ? ' is-top' : ''}`}>
      <header className="review-card-head">
        <ProductThumb product={product} size="sm" />
        <div className="review-card-title">
          <span className="eyebrow">
            #{rank}
            {rank === 1 && ' · Shoppers’ pick'}
          </span>
          <h4>{product.name}</h4>
          <span className="muted">{[product.brand, product.size].filter(Boolean).join(' · ')}</span>
        </div>
      </header>

      <div className="review-card-score">
        <Stars rating={product.rating} count={product.reviewCount} />
        <span className="price">
          {product.wasPrice && <s className="was">{formatPrice(product.wasPrice)}</s>}
          {formatPrice(product.price)}
        </span>
      </div>

      {product.offer && <span className="offer-pill offer-inline">{product.offer}</span>}

      <div className="sentiment">
        {product.pros.length > 0 && (
          <div className="sentiment-row">
            <ThumbsUp size={14} className="pos" />
            <div className="chips">
              {product.pros.map((t) => (
                <span key={t} className="chip chip-pos">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
        {product.cons.length > 0 && (
          <div className="sentiment-row">
            <ThumbsDown size={14} className="neg" />
            <div className="chips">
              {product.cons.map((t) => (
                <span key={t} className="chip chip-neg">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="quotes">
        {shown.map((rv) => (
          <blockquote key={rv.author + rv.date}>
            <p>“{rv.text}”</p>
            <footer>
              <Stars rating={rv.rating} />
              <span>
                {rv.author} · {rv.date}
              </span>
              <span className="verified">
                <BadgeCheck size={13} /> Verified shopper
              </span>
            </footer>
          </blockquote>
        ))}
        {product.reviews.length > 1 && (
          <button type="button" className="link-btn" onClick={() => setExpanded((e) => !e)}>
            {expanded ? 'Show less' : `More reviews (${product.reviews.length - 1})`}
            <ChevronDown size={14} className={expanded ? 'flip' : ''} />
          </button>
        )}
      </div>

      <footer className="review-card-foot">
        <span className="muted small">{product.unitPrice}</span>
        <AddToBasket product={product} />
      </footer>
    </article>
  );
}

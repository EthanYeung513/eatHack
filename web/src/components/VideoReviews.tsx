import { Pause, Play, Volume2, VolumeX, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { getVideoReviews } from '../data/videoReviews';
import { formatPrice } from '../state/basket';
import type { Product } from '../types';
import { AddToBasket, ProductThumb, Stars } from './ProductBits';

interface PlayerState {
  product: Product;
  index: number;
}

const VideoPlayerContext = createContext<(product: Product, index?: number) => void>(() => {});

export const useOpenVideoReviews = () => useContext(VideoPlayerContext);

export function VideoPlayerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlayerState | null>(null);
  const open = useCallback((product: Product, index = 0) => setState({ product, index }), []);
  return (
    <VideoPlayerContext.Provider value={open}>
      {children}
      {state && <VideoPlayer {...state} onClose={() => setState(null)} />}
    </VideoPlayerContext.Provider>
  );
}

/** Row of tappable video thumbnails, used on review cards. */
export function VideoStrip({ product }: { product: Product }) {
  const open = useOpenVideoReviews();
  const videos = getVideoReviews(product);
  if (!videos.length) return null;
  return (
    <div className="video-strip">
      <span className="video-strip-label">Video reviews</span>
      <div className="video-strip-row">
        {videos.map((v, i) => (
          <button
            key={v.id}
            type="button"
            className="video-tile"
            onClick={() => open(product, i)}
            aria-label={`Play video review by ${v.author}`}
          >
            {v.poster ? (
              <img src={v.poster} alt="" />
            ) : (
              <video src={`${v.src}#t=1`} muted playsInline preload="metadata" tabIndex={-1} />
            )}
            <span className="video-tile-play">
              <Play size={14} fill="currentColor" />
            </span>
            <span className="video-tile-meta">
              <strong>{v.author}</strong>
              <span>{v.duration}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Compact "▶ 3 videos" pill, used on swipe cards. */
export function VideoPill({ product }: { product: Product }) {
  const open = useOpenVideoReviews();
  const count = getVideoReviews(product).length;
  if (!count) return null;
  return (
    <button
      type="button"
      className="video-pill"
      // Keep taps on the pill from starting a card drag.
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => open(product)}
    >
      <Play size={13} fill="currentColor" />
      {count} video review{count === 1 ? '' : 's'}
    </button>
  );
}

function VideoPlayer({ product, index: startIndex, onClose }: PlayerState & { onClose: () => void }) {
  const videos = getVideoReviews(product);
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  // Landscape footage is letterboxed rather than cropped to the portrait frame.
  const [landscape, setLandscape] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  const video = videos[index];

  const go = useCallback(
    (delta: number) => {
      const next = index + delta;
      if (next < 0 || next >= videos.length) return;
      setIndex(next);
      setProgress(0);
      setPaused(false);
    },
    [index, videos.length],
  );

  const togglePause = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  };

  useEffect(() => {
    // Capture phase so arrow keys don't also swipe the deck behind the player.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === ' ') togglePause();
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [go, onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="player-backdrop" onClick={onClose}>
      <div
        className="player"
        role="dialog"
        aria-modal="true"
        aria-label={`Video reviews of ${product.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <video
          key={video.id}
          ref={ref}
          className={`player-video${landscape ? ' landscape' : ''}`}
          src={video.src}
          poster={video.poster}
          onLoadedMetadata={(e) => setLandscape(e.currentTarget.videoWidth > e.currentTarget.videoHeight)}
          autoPlay
          playsInline
          muted={muted}
          onPlay={() => setPaused(false)}
          onPause={() => setPaused(true)}
          onTimeUpdate={(e) => {
            const el = e.currentTarget;
            if (el.duration) setProgress(el.currentTime / el.duration);
          }}
          onEnded={() => (index < videos.length - 1 ? go(1) : setPaused(true))}
        />

        <div className="player-tap">
          <button type="button" aria-label="Previous video" onClick={() => go(-1)} />
          <button type="button" aria-label={paused ? 'Play' : 'Pause'} onClick={togglePause} />
          <button type="button" aria-label="Next video" onClick={() => go(1)} />
        </div>

        <div className="player-top">
          <div className="player-bars">
            {videos.map((v, i) => (
              <span key={v.id}>
                <i style={{ width: `${i < index ? 100 : i === index ? progress * 100 : 0}%` }} />
              </span>
            ))}
          </div>
          <div className="player-head">
            <span className="player-avatar">{video.author[0]}</span>
            <div className="player-who">
              <strong>{video.author}</strong>
              <span>{video.handle}</span>
            </div>
            <button type="button" className="player-icon" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'}>
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button type="button" className="player-icon" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        {paused && (
          <span className="player-paused" aria-hidden>
            <Pause size={28} />
          </span>
        )}

        <div className="player-bottom">
          <Stars rating={video.rating} />
          <p className="player-caption">{video.caption}</p>
          <div className="player-product">
            <ProductThumb product={product} size="sm" />
            <div className="player-product-info">
              <span className="player-product-name">{product.name}</span>
              <span className="player-product-price">{formatPrice(product.price)}</span>
            </div>
            <AddToBasket product={product} />
          </div>
        </div>
      </div>
    </div>
  );
}

export type Category =
  | 'fresh'
  | 'meat'
  | 'dairy'
  | 'bakery'
  | 'cupboard'
  | 'meals'
  | 'snacks'
  | 'drinks'
  | 'wine'
  | 'baby'
  | 'household'
  | 'beauty'
  | 'pets'
  | 'home'
  | 'partyware';

export type Dietary = 'vegan' | 'vegetarian' | 'gluten-free' | 'organic' | 'lactose-free';

/** What a product is for at a party; drives the party planner's decks and goal. */
export type PartyRole = 'savoury' | 'nibbles' | 'sweet' | 'soft' | 'alcohol' | 'fresh' | 'tableware';

export interface Review {
  author: string;
  rating: number;
  text: string;
  date: string;
}

export interface VideoReview {
  id: string;
  author: string;
  handle: string;
  rating: number;
  caption: string;
  src: string;
  duration: string;
  /** Still frame shown before the video loads. */
  poster?: string;
}

export interface Product {
  id: string;
  name: string;
  /** Short first-person blurb shown on swipe cards. */
  bio: string;
  /** Product photo URL; falls back to an illustrated packshot. */
  image?: string;
  brand: string;
  price: number;
  size: string;
  unitPrice: string;
  category: Category;
  tags: string[];
  dietary: Dietary[];
  rating: number;
  reviewCount: number;
  pros: string[];
  cons: string[];
  reviews: Review[];
  badge?: string;
  /** Current Ocado promotion, e.g. "Buy any 4 for 3". */
  offer?: string;
  wasPrice?: number;
  /** Product page on ocado.com. */
  url?: string;
  partyRole?: PartyRole;
  /** Nutrition claim used as a nudge, e.g. "High in protein". */
  nutrition?: string;
  /** Brand we partner with; gets a video-review nudge. */
  partner?: boolean;
  /** Not from the Ocado export (e.g. placeholder tableware). */
  placeholder?: boolean;
  /** Spotlighted launch: shown first in relevant swipe decks. */
  featured?: boolean;
}

export type AgentMode = 'text' | 'swipe' | 'reviews';

export type ProductView = Exclude<AgentMode, 'text'>;

export type NudgeType = 'offer' | 'nutrition' | 'partner' | 'none';

export type Direction = 'left' | 'right';

export interface SwipeLogEntry {
  product: Product;
  dir: Direction;
  /** Time from the card appearing to the decision. */
  ms: number;
  nudge?: NudgeType;
}

/** Why a deck ended: ran out, hit its checkpoint, the shopper slowed down, or tapped Done. */
export type DeckEndReason = 'complete' | 'checkpoint' | 'slowdown' | 'manual';

export interface SwipeResult {
  added: Product[];
  skipped: Product[];
  log: SwipeLogEntry[];
  reason: DeckEndReason;
}

export interface DeckConfig {
  kind: 'standard' | 'discovery' | 'targeted';
  /** End the deck after this many swipes. */
  stopAfter?: number;
  nudges?: Record<string, NudgeType>;
  detectSlowdown?: boolean;
  /** Build each set from the swipes so far, starting wide and getting narrower. */
  narrow?: {
    /** 0 = wide, 1 = narrowing, 2+ = specific. */
    startStage: number;
    maxSets: number;
    /** Earlier swipes to learn from (e.g. the party discovery deck). */
    seed?: SwipeLogEntry[];
    /** Areas to keep in the narrowing set even if not liked yet (e.g. "you'll also need party food"). */
    areas?: string[];
  };
}

export interface NudgeStat {
  type: Exclude<NudgeType, 'none'> | 'none';
  shown: number;
  accepted: number;
}

export interface WrapUp {
  guests: number;
  /** Roles the shopper said yes to, most liked first. */
  likedRoles: PartyRole[];
  nudgeStats: NudgeStat[];
  reason: DeckEndReason;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  mode?: AgentMode;
  /** View the shopper switched to; falls back to the agent's `mode`. */
  view?: ProductView;
  products?: Product[];
  rationale?: string;
  suggestions?: string[];
  deckTitle?: string;
  deck?: DeckConfig;
  topicId?: string;
  swipeResult?: SwipeResult;
  wrapUp?: WrapUp;
}

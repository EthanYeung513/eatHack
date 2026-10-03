export type Category =
  | 'snacks'
  | 'drinks'
  | 'wine'
  | 'bakery'
  | 'fresh'
  | 'dairy'
  | 'meals'
  | 'cupboard'
  | 'pets'
  | 'household'
  | 'partyware';

export type Dietary = 'vegan' | 'vegetarian' | 'gluten-free';

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
}

export type AgentMode = 'text' | 'swipe' | 'reviews';

export type ProductView = Exclude<AgentMode, 'text'>;

export interface SwipeResult {
  added: Product[];
  skipped: Product[];
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
  topicId?: string;
  swipeResult?: SwipeResult;
}

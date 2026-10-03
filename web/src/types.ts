export type Category =
  | 'snacks'
  | 'dips'
  | 'drinks'
  | 'bakery'
  | 'fresh'
  | 'dairy'
  | 'meat'
  | 'partyware';

export type Dietary = 'vegan' | 'vegetarian' | 'gluten-free';

export interface Review {
  author: string;
  rating: number;
  text: string;
  date: string;
}

export interface Product {
  id: string;
  name: string;
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
  hue: number;
  badge?: string;
}

export type AgentMode = 'text' | 'swipe' | 'reviews';

export interface SwipeResult {
  added: Product[];
  skipped: Product[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  mode?: AgentMode;
  products?: Product[];
  rationale?: string;
  suggestions?: string[];
  deckTitle?: string;
  topicId?: string;
  swipeResult?: SwipeResult;
}

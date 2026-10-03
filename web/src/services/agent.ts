import { PRODUCTS } from '../data/products';
import type { AgentMode, Dietary, Product, SwipeResult } from '../types';

// Client-side stand-in for the agent. The real version will live behind a
// Supabase edge function; keep this module's exported shape when swapping it out.

export interface AgentReply {
  text: string;
  mode: AgentMode;
  products?: Product[];
  rationale?: string;
  suggestions?: string[];
  deckTitle?: string;
  topicId?: string;
}

export const THINKING_STAGES = [
  'Understanding your request',
  'Searching Ocado products',
  'Choosing the best way to show results',
] as const;

interface Topic {
  id: string;
  re: RegExp;
  tag: string;
  title: string;
  occasion?: boolean;
}

// Ordered most specific first: reviews use the first match, swipe decks the last.
const TOPICS: Topic[] = [
  { id: 'sparkling', re: /\b(prosecco|champagne|fizz|sparkling|cr[eé]mant|cava)\b/i, tag: 'sparkling', title: 'Sparkling drinks' },
  { id: 'dips', re: /\b(dips?|houmous|hummus|salsa)\b/i, tag: 'dips', title: 'Dips' },
  { id: 'dessert', re: /\b(cakes?|desserts?|sweet|treats?|brownies?|chocolate)\b/i, tag: 'dessert', title: 'Sweet treats' },
  { id: 'snacks', re: /\b(snacks?|crisps|nibbles|chips|popcorn)\b/i, tag: 'snacks', title: 'Snacks' },
  { id: 'drinks', re: /\b(drinks?|wine|beers?|lager|juice|cocktails?)\b/i, tag: 'drinks', title: 'Drinks' },
  { id: 'breakfast', re: /\b(breakfast|brunch)\b/i, tag: 'breakfast', title: 'Breakfast & brunch', occasion: true },
  { id: 'movie', re: /\b(movie|film|netflix|night in)\b/i, tag: 'movie', title: 'Movie night', occasion: true },
  { id: 'bbq', re: /\b(bbq|barbecue|barbeque|grill\w*|burgers?)\b/i, tag: 'bbq', title: 'BBQ essentials', occasion: true },
  { id: 'party', re: /\b(party|parties|birthday|celebrat\w*|hosting|host|guests|gathering)\b/i, tag: 'party', title: 'Party picks', occasion: true },
];

const REVIEW_INTENT =
  /\b(best|compare|comparison|vs|versus|which|worth|reviews?|top[- ]rated|better|rating|ratings|what do people think)\b/i;
const GREETING = /^\s*(hi|hello|hey|hiya|morning|afternoon)\b/i;

const DIETARY: [RegExp, Dietary][] = [
  [/\bvegan\b/i, 'vegan'],
  [/\b(vegetarian|veggie)\b/i, 'vegetarian'],
  [/\bgluten[- ]?free\b/i, 'gluten-free'],
];

const FOLLOW_UPS: Record<string, string[]> = {
  party: ['Which prosecco is best?', 'Compare dips by reviews', 'Party desserts'],
  bbq: ['Drinks for a BBQ', 'Which dips are best?', 'Something sweet for after'],
  movie: ['Best popcorn?', 'Drinks for a night in', 'Sweet treats'],
  breakfast: ['Best granola?', 'Juice for brunch', 'Party food for 8'],
  sparkling: ['Party food for 12', 'Alcohol-free drinks', 'Party desserts'],
  drinks: ['Snacks for a party', 'Which prosecco is best?', 'BBQ for 10'],
  dips: ['Crisps for dipping', 'Party food for 12', 'Best prosecco under £12'],
  snacks: ['Compare dips by reviews', 'Drinks for a party', 'Movie night snacks'],
  dessert: ['Party food for 12', 'Which prosecco is best?', 'Movie night snacks'],
};

const STARTERS = [
  'Hosting a party for 12 on Saturday',
  'Which prosecco is best?',
  'Snacks for a movie night',
  'BBQ for the weekend',
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const money = (n: number) => `£${n.toFixed(2)}`;

function byRating(a: Product, b: Product) {
  return b.rating - a.rating || b.reviewCount - a.reviewCount;
}

function applyFilters(products: Product[], input: string) {
  let result = products;
  for (const [re, diet] of DIETARY) {
    if (re.test(input)) result = result.filter((p) => p.dietary.includes(diet));
  }
  if (/\b(alcohol[- ]free|non[- ]alcoholic|soft drinks?|no alcohol)\b/i.test(input)) {
    result = result.filter((p) => !p.tags.includes('alcohol'));
  }
  const budget = input.match(/\b(?:under|below|less than)\s*£?(\d+(?:\.\d+)?)/i);
  if (budget) result = result.filter((p) => p.price <= Number(budget[1]));
  return result;
}

function guestCount(input: string) {
  const m =
    input.match(/\b(\d{1,3})\s*(?:people|guests|friends|adults|kids|of us)\b/i) ??
    input.match(/\bfor\s+(\d{1,3})\b/i);
  return m ? Number(m[1]) : undefined;
}

function nameMatches(input: string) {
  const words = input.toLowerCase().match(/[a-zé]{5,}/g) ?? [];
  if (!words.length) return [];
  return PRODUCTS.filter((p) => {
    const name = p.name.toLowerCase();
    return words.some((w) => name.includes(w));
  });
}

export async function askAgent(
  input: string,
  onStage?: (stage: string) => void,
): Promise<AgentReply> {
  for (const stage of THINKING_STAGES) {
    onStage?.(stage);
    await sleep(450 + Math.random() * 350);
  }
  return decide(input);
}

function decide(input: string): AgentReply {
  const matched = TOPICS.filter((t) => t.re.test(input));
  const wantsReviews = REVIEW_INTENT.test(input);

  if (wantsReviews) {
    const topic = matched[0];
    const pool = topic
      ? PRODUCTS.filter((p) => p.tags.includes(topic.tag))
      : nameMatches(input);
    const products = applyFilters(pool, input).sort(byRating).slice(0, 8);
    if (products.length) {
      const [top] = products;
      const label = topic ? topic.title.toLowerCase() : 'options';
      return {
        mode: 'reviews',
        topicId: topic?.id,
        deckTitle: topic?.title,
        products,
        text: `Here are the top ${label} on Ocado, ranked by what shoppers say. ${top.name} leads with ${top.rating.toFixed(1)}★ across ${top.reviewCount.toLocaleString()} reviews.`,
        rationale:
          "You're choosing between products, so I'm showing real shopper reviews side by side rather than a long list.",
        suggestions: FOLLOW_UPS[topic?.id ?? 'party'],
      };
    }
  }

  if (matched.length) {
    // Specific product types narrow the deck; an occasion sets the framing.
    const specific = matched.filter((t) => !t.occasion);
    const occasion = matched.find((t) => t.occasion);
    const topic = specific[0] ?? occasion!;
    const tags = new Set((specific.length ? specific : matched).map((t) => t.tag));
    const products = applyFilters(
      PRODUCTS.filter((p) => p.tags.some((tag) => tags.has(tag))),
      input,
    ).sort(byRating);

    if (products.length) {
      const guests = guestCount(input);
      const plan =
        guests && occasion
          ? `For ${guests} people, plan on roughly ${Math.ceil(guests / 4)} sharing snacks, ${Math.max(2, Math.ceil(guests / 6))} dips and around ${Math.ceil(guests / 3)} bottles of something to drink. `
          : '';
      return {
        mode: 'swipe',
        topicId: occasion?.id ?? topic.id,
        deckTitle: topic.title,
        products,
        text: `${plan}I've pulled together ${products.length} ${topic.title.toLowerCase()} from Ocado. Swipe right on anything you want and left to skip.`,
        rationale:
          "You're exploring a wide range, so quick yes/no decisions will get you to a basket faster than comparing lists.",
      };
    }

    return {
      mode: 'text',
      text: "I couldn't find anything matching all of those filters. Want to loosen the budget or dietary requirements?",
      suggestions: STARTERS,
    };
  }

  if (GREETING.test(input)) {
    return {
      mode: 'text',
      text: "Hi! Tell me what you're shopping for, whether that's an occasion, a meal or a specific product, and I'll find the best options on Ocado.",
      suggestions: STARTERS,
    };
  }

  const byName = nameMatches(input);
  if (byName.length) {
    return {
      mode: 'reviews',
      products: byName.sort(byRating).slice(0, 8),
      text: 'Here’s what shoppers are saying about the closest matches I found.',
      rationale: 'You asked about specific products, so reviews are the most useful view.',
      suggestions: STARTERS,
    };
  }

  return {
    mode: 'text',
    text: "Happy to help. What's the occasion, or what kind of products are you after? Details like guest numbers, budget or dietary needs help me narrow things down.",
    suggestions: STARTERS,
  };
}

export function swipeFollowUp(result: SwipeResult, topicId?: string): AgentReply {
  const suggestions = FOLLOW_UPS[topicId ?? ''] ?? STARTERS;
  if (!result.added.length) {
    return {
      mode: 'text',
      text: 'Nothing caught your eye there. Want me to try a different direction?',
      suggestions,
    };
  }
  const total = result.added.reduce((sum, p) => sum + p.price, 0);
  const n = result.added.length;
  return {
    mode: 'text',
    text: `Added ${n} item${n === 1 ? '' : 's'} to your basket (${money(total)}). Anything else to round it off?`,
    suggestions,
  };
}

export { STARTERS };

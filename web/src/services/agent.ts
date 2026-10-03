import { featuredFirst, PRODUCTS } from '../data/products';
import type { AgentMode, DeckConfig, Dietary, Product, SwipeResult, WrapUp } from '../types';

// Client-side stand-in for the agent. The real version will live behind a
// Supabase edge function; keep this module's exported shape when swapping it out.

export interface AgentReply {
  text: string;
  mode: AgentMode;
  products?: Product[];
  rationale?: string;
  suggestions?: string[];
  deckTitle?: string;
  deck?: DeckConfig;
  topicId?: string;
  wrapUp?: WrapUp;
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

// Ordered most specific first: reviews use the first match.
const TOPICS: Topic[] = [
  { id: 'sparkling', re: /\b(prosecco|champagne|fizz|sparkling|bubbly|cava|asti)\b/i, tag: 'sparkling', title: 'Sparkling wine' },
  { id: 'rose', re: /\b(ros[eé]|blush)(?![a-z])/i, tag: 'rose', title: 'Rosé' },
  { id: 'red', re: /\b(red wines?|reds?|malbec|chianti|merlot|rioja|primitivo)\b/i, tag: 'red', title: 'Red wine' },
  { id: 'white', re: /\b(white wines?|whites?|sauvignon|pinot|chablis|sancerre|chardonnay)\b/i, tag: 'white', title: 'White wine' },
  { id: 'cocktail', re: /\b(cocktails?|spritz|mojito|margarita|martini|g&t|gin and tonic)\b/i, tag: 'cocktail', title: 'Cocktails' },
  { id: 'spirits', re: /\b(spirits?|gin|vodka|rum|whisky|whiskey|tequila)\b/i, tag: 'spirits', title: 'Spirits' },
  { id: 'beer', re: /\b(beers?|ales?|lager)\b/i, tag: 'beer', title: 'Beer' },
  { id: 'wine', re: /\b(wines?|vino)\b/i, tag: 'wine', title: 'Wine' },
  { id: 'milk', re: /\b(milk|milkshakes?|dairy)\b/i, tag: 'milk', title: 'Milk & milkshakes' },
  { id: 'pets', re: /\b(pets?|dogs?|cats?|puppy|kitten)\b/i, tag: 'pets', title: 'Pet treats' },
  { id: 'sweets', re: /\b(sweets|chocolate|candy|treats?|snacks?|crisps|nibbles)\b/i, tag: 'snacks', title: 'Sweets & snacks' },
  { id: 'drinks', re: /\b(drinks?|juice|cola|coke|latte|iced coffee)\b/i, tag: 'drinks', title: 'Drinks' },
  { id: 'deals', re: /\b(offers?|deals?|discounts?|sale|bargains?|savings?|cheap|promotions?)\b/i, tag: 'deals', title: "Today's deals" },
  { id: 'breakfast', re: /\b(breakfast|brunch|porridge|oats)\b/i, tag: 'breakfast', title: 'Breakfast', occasion: true },
  { id: 'dinner', re: /\b(dinners?|lunch|ready meals?|soups?|quick meals?|for one|weeknights?)\b/i, tag: 'dinner', title: 'Easy dinners', occasion: true },
  { id: 'halloween', re: /\b(halloween|spooky|trick[- ]or[- ]treat\w*|pumpkins?|costumes?)\b/i, tag: 'halloween', title: 'Halloween', occasion: true },
  { id: 'party', re: /\b(party|parties|birthday|celebrat\w*|hosting|host|guests|gathering)\b/i, tag: 'party', title: 'Party picks', occasion: true },
];

/** Products a chat deck can draw its sets from. */
const MAX_POOL = 40;

const REVIEW_INTENT =
  /\b(best|compare|comparison|vs|versus|which|worth|reviews?|top[- ]rated|better|rating|ratings|what do people think)\b/i;
const GREETING = /^\s*(hi|hello|hey|hiya|morning|afternoon)\b/i;

const DIETARY: [RegExp, Dietary][] = [
  [/\bvegan\b/i, 'vegan'],
  [/\b(vegetarian|veggie)\b/i, 'vegetarian'],
  [/\bgluten[- ]?free\b/i, 'gluten-free'],
];

const WINE_FOLLOW_UPS = ['Which red wine is best?', 'Which beer is best?', 'Sweets for a party'];

const FOLLOW_UPS: Record<string, string[]> = {
  party: ['Which gin is best?', 'Which chocolate is best?', "What's on offer?"],
  halloween: ['Spooky sweets for trick or treaters', 'Which crisps are best?', 'Which red wine is best?'],
  dinner: ['Which soup is best?', 'Wine to go with dinner', "What's on offer?"],
  breakfast: ['Which milk is best?', 'Best porridge oats?', 'Easy dinners for one'],
  sparkling: WINE_FOLLOW_UPS,
  rose: WINE_FOLLOW_UPS,
  red: ['Which beer is best?', 'Which gin is best?', 'Easy dinners for one'],
  white: ['Which red wine is best?', 'Which chocolate is best?', 'Easy dinners for one'],
  beer: ['Throwing a Halloween party', 'Sweets for a party', "What's on offer?"],
  wine: WINE_FOLLOW_UPS,
  milk: ['Best porridge oats?', 'Easy dinners for one', "What's on offer?"],
  sweets: ['Throwing a Halloween party', 'Which red wine is best?', "What's on offer?"],
  drinks: ['Sweets for a party', 'Which gin is best?', "What's on offer?"],
  pets: ['Throwing a Halloween party', 'Spooky sweets for trick or treaters', "What's on offer?"],
  deals: ['Which wine is best?', 'Easy dinners for one', 'Throwing a Halloween party'],
};

const STARTERS = [
  'Host a party for 12',
  'Which gin is best?',
  'Easy dinners for one this week',
  "What's on offer right now?",
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const money = (n: number) => `£${n.toFixed(2)}`;

// Bayesian average so a single 5★ review doesn't outrank hundreds of 4.7s.
const confidence = (p: Product) => (p.rating * p.reviewCount + 3.8 * 15) / (p.reviewCount + 15);

function byRating(a: Product, b: Product) {
  return confidence(b) - confidence(a);
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

const STOP_WORDS = new Set(
  ('best which what good with this that week some from have want need about tell right show find like more your ' +
    'them they there should would could something anything please compare better worth reviews review rated rating ' +
    'really under over between versus tonight people guests friends throwing hosting').split(' '),
);

function nameMatches(input: string) {
  const words = (input.toLowerCase().match(/[a-zé]{4,}/g) ?? []).filter((w) => !STOP_WORDS.has(w));
  if (!words.length) return [];
  return PRODUCTS.filter((p) => {
    const name = p.name.toLowerCase();
    return words.some((w) => name.includes(w));
  });
}

/** Walks through thinking stages with a short delay each, so replies don't feel instant. */
export async function simulateThinking(onStage?: (stage: string) => void, stages: readonly string[] = THINKING_STAGES) {
  for (const stage of stages) {
    onStage?.(stage);
    await sleep(450 + Math.random() * 350);
  }
}

export async function askAgent(
  input: string,
  onStage?: (stage: string) => void,
): Promise<AgentReply> {
  await simulateThinking(onStage);
  return decide(input);
}

function decide(input: string): AgentReply {
  const matched = TOPICS.filter((t) => t.re.test(input));
  const wantsReviews = REVIEW_INTENT.test(input);

  if (wantsReviews) {
    const topic = matched[0];
    // "Which soup is best?" is about soup, not every easy dinner.
    const byName = nameMatches(input);
    // Broad topics ("sweets & snacks") lose to a specific product word ("crisps").
    const broad = !topic || topic.occasion || ['sweets', 'drinks', 'deals'].includes(topic.id);
    const useNames = byName.length > 0 && broad;
    const pool = useNames ? byName : topic ? PRODUCTS.filter((p) => p.tags.includes(topic.tag)) : [];
    const products = applyFilters(pool, input)
      .filter((p) => p.reviewCount > 0)
      .sort(byRating)
      .slice(0, 8);
    if (products.length) {
      const [top] = products;
      const label = topic && !useNames ? topic.title.toLowerCase() : 'closest matches';
      return {
        mode: 'reviews',
        topicId: topic?.id,
        deckTitle: useNames ? 'Top matches' : topic?.title,
        products,
        text: `Ranked by shopper ratings on Ocado: ${top.name} leads the ${label} with ${top.rating.toFixed(1)}★ across ${top.reviewCount.toLocaleString()} reviews.`,
        rationale:
          "You're choosing between products, so I'm showing real shopper reviews side by side rather than a long list.",
        suggestions: FOLLOW_UPS[topic?.id ?? 'party'],
      };
    }
  }

  if (matched.length) {
    // Specific product types narrow the deck; occasions set the framing.
    const specific = matched.filter((t) => !t.occasion);
    const occasions = matched.filter((t) => t.occasion);
    const party = occasions.find((t) => t.id === 'party');
    const occasion = occasions.find((t) => t.id !== 'party') ?? party;
    // "Halloween party" means party-friendly things, not every Halloween product.
    // The most specific product type wins ("treats for my dog" is pets, not sweets).
    const filterTags = specific.length ? [specific[0]] : party ? [party] : occasions;
    const tags = new Set(filterTags.map((t) => t.tag));
    // "Wine deals": deals narrows another product type rather than replacing it.
    const dealsOnly = specific.length > 1 && specific.some((t) => t.id === 'deals');
    const boost = new Set(matched.map((t) => t.tag));
    const relevance = (p: Product) => p.tags.filter((t) => boost.has(t)).length;
    // Catalogue is already in popularity order; the sort is stable.
    const inDeck = (p: Product) => p.tags.some((tag) => tags.has(tag)) && (!dealsOnly || !!p.offer);
    const products = featuredFirst(
      applyFilters(PRODUCTS.filter(inDeck), input).sort((a, b) => relevance(b) - relevance(a)),
      (p) => inDeck(p) && applyFilters([p], input).length > 0,
    ).slice(0, MAX_POOL);
    const topic = specific[0] ?? occasion!;
    const title =
      !specific.length && party && occasion && occasion !== party ? `${occasion.title} party` : topic.title;

    if (products.length) {
      const guests = guestCount(input);
      const plan =
        guests && occasion
          ? `For ${guests} people, plan on roughly ${Math.ceil(guests / 4)} sharing bags of sweets or snacks and around ${Math.ceil(guests / 3)} bottles to drink. `
          : '';
      return {
        mode: 'swipe',
        topicId: occasion?.id ?? topic.id,
        deckTitle: title,
        products,
        deck: { kind: 'standard', narrow: { startStage: 0, maxSets: 3 } },
        text: `${plan}I'll start with a wide range, 5 at a time, and narrow it down as you swipe. Swipe right to add, left to skip.`,
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
      products: byName.filter((p) => p.reviewCount > 0).sort(byRating).slice(0, 8),
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

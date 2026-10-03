# eatHack — Shelf

A conversational shopping assistant for Ocado. Shoppers chat about what they need, and the agent decides how to show results:

- a **swipe deck** when they're exploring a wide range
- **shopper review cards** (with video reviews) when they're choosing between products (e.g. "which gin is best?")

The basket then hands off to an Ocado-style checkout shell (trolley → delivery slot → payment → confirmation).

## The "Host a party" journey

1. **Goal:** "Host a party" asks how many guests (or reads "for 12"), which sets targets for savoury snacks, party food, sweets and drinks.
2. **Discovery deck:** 5 broad cards (crisps, sweets, soft drinks, fizz, party food) to learn what this basket is for.
3. **Targeted deck:** "That's a good start, you'll probably also need…", then specific products. Each card carries one nudge: a **deal**, a **nutrition** claim (high protein/fibre), a **partner brand** with its video review playing on the card, or **none** as a control. Every swipe is timed.
4. **Wrap-up:** when swipes slow down (latest three take ~2× as long as the first three), the deck ends and the shopper sees goal progress, what they're looking for, and which nudges they responded to.
5. **Checkout:** if the basket still misses the goal, a one-time recommendation appears inside the Ocado trolley.

## Web app (`web/`)

React + TypeScript + Vite. Frontend only: the catalogue is a one-off Ocado export bundled as JSON, and the agent runs on the client.

```bash
cd web
npm install
npm run dev
```

| Path | What it is |
| --- | --- |
| `src/data/ocado-products.json` | 250 real Ocado products, each with its real photo in `public/products/` (prices, ratings, offers, labels). Category, party role, nutrition and partner flags are derived from names |
| `src/data/placeholderCopy.ts` | Placeholder bios, pros/cons and review quotes (not in the export) |
| `src/data/videoReviews.ts` | Placeholder video reviews using stock clips in `public/videos/` |
| `src/services/partyPlanner.ts` | The party journey: decks, nudges, slowdown wrap-up, goal and checkout recommendations |
| `src/services/agent.ts` | Mock agent for everything else: picks `swipe`, `reviews` or `text`. Swap for a Supabase edge function later |
| `src/state/` | Basket context and chat hook (orchestrates the party journey) |
| `src/components/` | Chat, swipe deck, review cards, wrap-up card, basket, Ocado checkout shell |

Placeholder data to know about for demos: bios, review quotes and video reviews are fake, and a few nutrition claims (nuts, popcorn) are assumed. All products themselves are real.

### Deploying on Vercel

Framework preset **Vite**, root directory **`web`**. Defaults for build (`npm run build`) and output (`dist`) work as-is.

## Not built yet

- Supabase backend, real agent/LLM
- Real retailer handoff and other e-commerce integrations

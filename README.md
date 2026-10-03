# eatHack — Shelf

A conversational shopping assistant for Ocado. Shoppers chat about what they need, and the agent decides how to show results:

- a **swipe deck** when they're exploring a wide range
- **shopper review cards** (with video reviews) when they're choosing between products (e.g. "which gin is best?")

The basket then hands off to an Ocado-style checkout shell (trolley → delivery slot → payment → confirmation).

## The "Host a party" journey

1. **Goal:** "Host a party" asks how many guests (or reads "for 12"), which sets targets for savoury snacks, party food, sweets and drinks.
2. **Discovery deck:** 5 broad cards (crisps, sweets, soft drinks, fizz, party food) to learn what this basket is for.
3. **Narrowing decks:** every swipe deck serves 5 cards at a time, starting wide (one product per family) and getting narrower each set based on the swipes so far: the areas the shopper liked, then their favourite families (`src/services/narrowing.ts`).
4. **Targeted deck:** "That's a good start, you'll probably also need…", then specific products. Each card carries one nudge: a **deal**, a **nutrition** claim (high protein/fibre), a **partner brand** with its video review playing on the card, or **none** as a control. Every swipe is timed.
5. **Wrap-up:** when swipes slow down (latest three take ~2× as long as the first three), the deck ends and the shopper sees goal progress, what they're looking for, and which nudges they responded to.
6. **Checkout, regenerated for the intent:** the Ocado trolley becomes "Saturday's party, laid out": the basket placed in an illustrated room (the bar, cheese board, by the sofa, sweet spot), how far each product goes for the guest count (e.g. a 75cl bottle = 6 glasses), what's "sorted" or "a bit light", and a last-minute shelf of picks based on the basket, the party goal and every swipe (liked-then-removed items come back, skipped products never appear, liked families rank higher). Non-party trolleys get the same picks without the goal. Logic in `src/services/partyUsage.ts`.

## Brand dashboard (`/dashboard`)

An enterprise view for brands (e.g. https://eat-hack.vercel.app/dashboard): their launched products, how many behavioural nudges were delivered, how many the agent picked up, how many converted into a buy, and where agent decisions and human buys diverge. Metrics are placeholder data generated per product (`src/dashboard/metrics.ts`); the real version would aggregate the swipe logs.

**Nudge experiments** (`src/dashboard/Experiments.tsx`): each behavioural nudge runs on one product and is compared with a control.
- *Social proof*: Watch Humans videos on the swipe cards for OOM, Well & Truly and Flow.
- *Loss aversion*: one product on the checkout's last-minute shelf (the first pick not already in the trolley, £5 or under) gets ~20% off with "The special offer for this product will go in 10s". The countdown starts when the card is on screen; taking it in time applies the saving to the basket.

The "This shopper" panel reads real outcomes from the shopper app in the same browser (`src/state/nudgeLog.ts`, localStorage), so you can try a nudge and see your own response on the dashboard.

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
| `src/data/videoReviews.ts` | Real video reviews (currently the Flow latte, `public/videos/`). Products without one show no video options |
| `src/services/partyPlanner.ts` | The party journey: decks, nudges, slowdown wrap-up, goal and checkout recommendations |
| `src/services/agent.ts` | Mock agent for everything else: picks `swipe`, `reviews` or `text`. Swap for a Supabase edge function later |
| `src/state/` | Basket context and chat hook (orchestrates the party journey) |
| `src/components/` | Chat, swipe deck, review cards, wrap-up card, basket, Ocado checkout shell |

Placeholder data to know about for demos: bios and review quotes are fake, and a few nutrition claims (nuts, popcorn) are assumed. All products themselves are real.

### Deploying on Vercel

Framework preset **Vite**, root directory **`web`**. Defaults for build (`npm run build`) and output (`dist`) work as-is. `web/vercel.json` rewrites all routes to `index.html` so `/dashboard` works on refresh.

## Not built yet

- Supabase backend, real agent/LLM
- Real retailer handoff and other e-commerce integrations

# eatHack — Shelf

A conversational shopping assistant for Ocado. Shoppers chat about what they need, and the agent decides how to show results:

- a **swipe deck** when they're exploring a wide range (e.g. "hosting a party for 12")
- **shopper review cards** when they're choosing between products (e.g. "which prosecco is best?")

The basket then hands off to an Ocado-style checkout shell (trolley → delivery slot → payment → confirmation).

## Web app (`web/`)

React + TypeScript + Vite. Frontend only: the catalogue is a one-off Ocado export bundled as JSON, and the agent runs on the client.

```bash
cd web
npm install
npm run dev
```

| Path | What it is |
| --- | --- |
| `src/data/ocado-products.json` | 104 real Ocado products (prices, ratings, offers, labels, 39 photos in `public/products/`). Bios, pros/cons and review quotes are placeholder copy |
| `src/services/agent.ts` | Mock agent: picks `swipe`, `reviews` or `text` mode. Swap for a Supabase edge function later |
| `src/state/` | Basket context and chat hook |
| `src/components/` | Chat, swipe deck, review cards, basket, Ocado checkout shell |

### Deploying on Vercel

Framework preset **Vite**, root directory **`web`**. Defaults for build (`npm run build`) and output (`dist`) work as-is.

## Not built yet

- Supabase backend, real agent/LLM, Ocado scraping
- Real retailer handoff and other e-commerce integrations

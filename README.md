# Shelf

A conversational shopping assistant for Ocado, built for eatHack.

Shoppers tell Shelf what they're shopping for, and it shows products as **swipe decks** that start wide and narrow down as they swipe, or as **shopper reviews** with real video reviews. Behavioural nudges (deals, social proof, loss aversion and more) are tested along the way. The basket then hands off to an Ocado checkout that's regenerated for the occasion, e.g. "Saturday's party, laid out".

Brands get a **dashboard** at `/dashboard` showing their products, which nudges the agent used, what shoppers actually bought, and which nudge works best for each product.

## Run it

Requires Node 18+.

```bash
cd web
npm install
npm run dev
```

Then open:

- http://localhost:5173: the shopper app
- http://localhost:5173/dashboard: the brand dashboard

To try the main flow, tap **Host a party**, swipe the decks, then press **Checkout on Ocado**.

## Build and deploy

```bash
cd web
npm run build   # outputs web/dist
```

On Vercel, use framework preset **Vite** with root directory **`web`**.

## Notes

- Frontend only (React + TypeScript + Vite). The agent runs in the browser, with no backend yet.
- Products, prices, ratings, offers and photos come from an Ocado export. The video reviews are real (Watch Humans).
- Product bios, review quotes and most dashboard metrics are placeholders. The dashboard's "This shopper" panels are real: they show your own responses from the shopper app in the same browser.

# Takeoff Parts Co.

An e-bike parts trade-in marketplace. Riders send in the stock ("takeoff") parts they
pulled off their new e-bikes, get instant store credit, and the credit applies itself
automatically at checkout. The parts they send in are graded and resold on a discounted
used board.

## Stack

- **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4** — hosted on Vercel
- **Supabase** — Postgres, auth, and row-level security (project: `ebike-parts-marketplace`)

## How the business logic works

- `trade_in_catalog` is the value book: each stock part has a base value. Condition
  multipliers (like new 100%, good 80%, fair 60%, rough 35%) are applied server-side.
- `submit_trade_in` (Postgres function) re-prices the quote from the value book, creates
  the trade-in, and writes an instant credit to `credit_ledger`. Clients can never set
  their own prices.
- `checkout` (Postgres function) re-reads prices from `products`, locks stock rows,
  deducts inventory, sums the user's ledger, and auto-applies up to the full balance.
  Everything happens in one transaction.
- The used board is just `products` with `source = 'trade_in'`, each with an honest
  condition report and a compare-at price showing the discount vs. new.
- The **bike index** (`bike_models` + `bike_stock_parts`) tracks 18 common North American
  e-bikes and the stock parts riders actually pull off each one, with a swap-likelihood
  rating. Each stock part maps to a `trade_in_catalog` entry, so `/bikes/[slug]` can show
  a bike's total takeoff value, and `/trade-in?bike=<slug>` preloads the quote with that
  bike's usual parts.
- Bikes are tiered **halo vs volume**: scene bikes (Sur-Ron, Talaria, Super73, Segway)
  draw the traffic but their takeoffs are deep-supply/slow-resale, while the commuter
  fleet (Rad, Lectric, Aventon…) is where trade volume actually happens.
- **Pricing model:** every catalog entry stores a 90-day eBay sold comp
  (`ebay_comp_cents`); instant credit is pegged at 50% of it. The other half covers
  round-trip shipping, payment fees, warehousing, hold time, cost of capital, and
  no-sale risk. Used board listings sit at or just under the comp. The comp and the
  split are shown to riders on the trade-in page — transparency is the pitch.
- **Pending credit:** quotes over **$50** create `trade_in_credit_pending` (not
  spendable). Quotes at or under $50 credit instantly. Checkout only spends
  **available** credit via `get_available_credit()`. Admin receiving desk at
  `/admin/receiving` marks parts received, adjusts final values, and releases credit.
  Promote dock staff: `update profiles set role = 'admin' where user_id = '<uuid>';`
- Each `trade_in_catalog` entry carries an upgrade path (`replaces_with_product_id` +
  `upgrade_note`) — bike pages show what every stock part typically gets replaced with,
  linking straight to the retail product.
- RLS: catalog tables are public-read; trade-ins, ledger entries, and orders are readable
  only by their owner. All writes go through the two functions above.

## Local development

```bash
npm install
npm run dev
```

`.env.local` needs:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key>
```

## Smoke test

Verifies the full loop (sign-in → trade-in credit → checkout with auto-applied credit):

```bash
node scripts/smoke-test.mjs <email> <password>
```

## Notes

- New Supabase projects require email confirmation on signup by default. The sign-up
  form handles this ("check your email"). To remove that step for testing, turn off
  "Confirm email" under Authentication → Sign In / Up in the Supabase dashboard.
- Checkout is a demo: no payment processor is wired up. Stripe drops in at the
  `checkout` function boundary when you're ready.

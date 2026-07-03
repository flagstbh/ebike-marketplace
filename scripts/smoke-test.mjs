// End-to-end smoke test: sign-in -> trade-in credit -> checkout with auto-applied credit.
// Usage: node scripts/smoke-test.mjs <email> <password>
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://jabktttgfxvcuszksncj.supabase.co",
  "sb_publishable_u5ojX6kskzYfglTnpXk2_w_uyDVJfRY"
);

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("Usage: node scripts/smoke-test.mjs <email> <password>");
  process.exit(1);
}

const { data: signin, error: signinErr } = await supabase.auth.signInWithPassword(
  { email, password }
);
if (signinErr) throw signinErr;
console.log("signin ok:", signin.user.email);

// Pick the two cheapest *active* catalog items with real value so the total
// stays under the $50 instant-credit threshold but the credit is non-zero.
// Selecting by `active` (not hardcoded names) keeps this correct as the
// catalog churns, and matches what submit_trade_in will accept.
const { data: catalog } = await supabase
  .from("trade_in_catalog")
  .select("id, name, base_value_cents")
  .eq("active", true)
  .gt("base_value_cents", 0)
  .order("base_value_cents")
  .limit(2);
if (!catalog || catalog.length < 2) throw new Error("no active catalog items found");
console.log("catalog sample:", catalog.map((c) => `${c.name} (${c.base_value_cents})`));

const { data: tradeIn, error: tiErr } = await supabase.rpc("submit_trade_in", {
  p_items: catalog.map((c) => ({ catalog_id: c.id, condition: "good" })),
});
if (tiErr) throw tiErr;
console.log("trade-in:", tradeIn);
if (!tradeIn.is_instant) {
  throw new Error(`expected instant credit, got pending ${tradeIn.pending_cents}`);
}

const { data: product } = await supabase
  .from("products")
  .select("id, name, price_cents, stock")
  .gt("stock", 0)
  .order("price_cents")
  .limit(1)
  .single();
console.log("buying:", product.name, "at", product.price_cents, "stock", product.stock);

const { data: order, error: coErr } = await supabase.rpc("checkout", {
  p_items: [{ product_id: product.id, qty: 1 }],
});
if (coErr) throw coErr;
console.log("order:", order);

const { data: ledger } = await supabase
  .from("credit_ledger")
  .select("delta_cents, kind")
  .order("created_at");
console.log("ledger:", ledger);

const expectedCredit = Math.min(tradeIn.credited_cents, product.price_cents);
if (order.credit_applied_cents !== expectedCredit) {
  throw new Error(
    `credit mismatch: applied ${order.credit_applied_cents}, expected ${expectedCredit}`
  );
}

const { data: after } = await supabase
  .from("products")
  .select("stock")
  .eq("id", product.id)
  .single();
if (after.stock !== product.stock - 1) {
  throw new Error(`stock not decremented: ${after.stock}`);
}
console.log("PASS: instant credit auto-applied and stock decremented correctly");

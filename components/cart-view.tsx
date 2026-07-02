"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { createClient } from "@/lib/supabase/client";
import { usd } from "@/lib/format";
import { CONDITION_LABELS } from "@/lib/types";

export default function CartView({
  signedIn,
  creditCents,
  pendingCents = 0,
}: {
  signedIn: boolean;
  creditCents: number;
  pendingCents?: number;
}) {
  const { items, setQty, remove, clear, subtotalCents } = useCart();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const creditApplied = Math.min(Math.max(creditCents, 0), subtotalCents);
  const totalDue = subtotalCents - (signedIn ? creditApplied : 0);

  async function placeOrder() {
    setPlacing(true);
    setError(null);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("checkout", {
      p_items: items.map((i) => ({ product_id: i.productId, qty: i.qty })),
    });
    if (rpcError) {
      setError(rpcError.message);
      setPlacing(false);
      return;
    }
    clear();
    router.push(`/account?ordered=${data.order_id}`);
  }

  if (items.length === 0) {
    return (
      <div className="px-4 py-20 text-center sm:px-8">
        <h1 className="font-display text-4xl font-bold uppercase">
          Cart is empty
        </h1>
        <p className="mt-3 text-ink-soft">
          The upgrades aren&apos;t going to install themselves.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/parts"
            className="bg-accent px-6 py-3 text-sm font-semibold uppercase text-accent-ink hover:bg-ink"
          >
            Shop parts
          </Link>
          <Link
            href="/used"
            className="border border-ink px-6 py-3 text-sm font-semibold uppercase hover:bg-ink hover:text-paper"
          >
            Used board
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[3fr_2fr]">
      <div className="border-b border-line lg:border-b-0 lg:border-r">
        <h1 className="font-display border-b border-line px-4 py-6 text-4xl font-bold uppercase tracking-tight sm:px-8">
          Your cart
        </h1>
        <ul>
          {items.map((item) => (
            <li
              key={item.productId}
              className="flex items-center justify-between gap-4 border-b border-line px-4 py-4 sm:px-8"
            >
              <div className="min-w-0">
                <Link
                  href={`/parts/${item.slug}`}
                  className="font-medium hover:text-accent"
                >
                  {item.name}
                </Link>
                <p className="label-mono mt-0.5 text-ink-soft">
                  {item.brand} · {CONDITION_LABELS[item.condition]}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <div className="flex items-center border border-line">
                  <button
                    onClick={() => setQty(item.productId, item.qty - 1)}
                    className="px-3 py-1.5 hover:bg-paper-raised"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm">{item.qty}</span>
                  <button
                    onClick={() => setQty(item.productId, item.qty + 1)}
                    disabled={item.qty >= item.stock}
                    className="px-3 py-1.5 hover:bg-paper-raised disabled:text-line"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <span className="w-20 text-right font-semibold">
                  {usd(item.priceCents * item.qty)}
                </span>
                <button
                  onClick={() => remove(item.productId)}
                  className="label-mono text-ink-soft hover:text-accent"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="px-4 py-8 sm:px-8">
        <p className="label-mono text-ink-soft">Order summary</p>
        <dl className="mt-4 space-y-2.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Subtotal</dt>
            <dd className="font-medium">{usd(subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">Shipping</dt>
            <dd className="font-medium">Free</dd>
          </div>
          {signedIn ? (
            <div className="flex justify-between text-accent">
              <dt>Trade-in credit (auto-applied)</dt>
              <dd className="font-medium">−{usd(creditApplied)}</dd>
            </div>
          ) : (
            <div className="border border-dashed border-line p-3 text-ink-soft">
              <Link href="/login?next=/cart" className="text-accent underline">
                Sign in
              </Link>{" "}
              to apply your trade-in credit automatically.
            </div>
          )}
        </dl>
        <div className="mt-4 flex items-baseline justify-between border-t-2 border-ink pt-4">
          <span className="label-mono text-ink-soft">Total due</span>
          <span className="font-display text-4xl font-bold">{usd(totalDue)}</span>
        </div>
        {signedIn && creditCents > creditApplied && (
          <p className="label-mono mt-2 text-ink-soft">
            {usd(creditCents - creditApplied)} credit remains after this order
          </p>
        )}
        {signedIn && pendingCents > 0 && (
          <p className="label-mono mt-2 text-ink-soft">
            {usd(pendingCents)} pending — not spendable until parts are verified
          </p>
        )}
        {error && (
          <p className="mt-4 border border-accent bg-accent/10 p-3 text-sm text-accent">
            {error}
          </p>
        )}
        {signedIn ? (
          <button
            onClick={placeOrder}
            disabled={placing}
            className="mt-6 w-full bg-accent px-8 py-4 text-sm font-semibold uppercase tracking-wide text-accent-ink hover:bg-ink disabled:bg-line disabled:text-ink-soft"
          >
            {placing ? "Placing order…" : "Place order"}
          </button>
        ) : (
          <Link
            href="/login?next=/cart"
            className="mt-6 block w-full bg-accent px-8 py-4 text-center text-sm font-semibold uppercase tracking-wide text-accent-ink hover:bg-ink"
          >
            Sign in to check out
          </Link>
        )}
        <p className="label-mono mt-3 text-ink-soft">
          Demo checkout — no payment is collected
        </p>
      </div>
    </div>
  );
}

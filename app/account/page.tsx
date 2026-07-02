import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/sign-out-button";
import { usd } from "@/lib/format";
import { TRADE_IN_STATUS_LABELS } from "@/lib/credit";
import { ITEM_CONDITION_LABELS } from "@/lib/types";
import type { ItemCondition } from "@/lib/types";

export const dynamic = "force-dynamic";

interface TradeInRow {
  id: string;
  status: string;
  quoted_total_cents: number | null;
  credited_total_cents: number | null;
  created_at: string;
  trade_in_items: {
    description: string;
    condition: ItemCondition;
    quoted_cents: number;
    final_cents: number | null;
  }[];
}

interface OrderRow {
  id: string;
  subtotal_cents: number;
  credit_applied_cents: number;
  total_cents: number;
  created_at: string;
  order_items: { product_name: string; qty: number; unit_price_cents: number }[];
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ credited?: string; pending?: string; ordered?: string }>;
}) {
  const { credited, pending, ordered } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const [
    { data: available },
    { data: pendingBal },
    { data: profile },
    { data: tradeIns },
    { data: orders },
  ] = await Promise.all([
    supabase.rpc("get_available_credit"),
    supabase.rpc("get_pending_credit"),
    supabase.from("profiles").select("role").eq("user_id", user.id).single(),
    supabase
      .from("trade_ins")
      .select(
        "id, status, quoted_total_cents, credited_total_cents, created_at, trade_in_items(description, condition, quoted_cents, final_cents)"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select(
        "id, subtotal_cents, credit_applied_cents, total_cents, created_at, order_items(product_name, qty, unit_price_cents)"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const balance = (available as number | null) ?? 0;
  const pendingCredit = (pendingBal as number | null) ?? 0;
  const isAdmin = profile?.role === "admin";

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-4 py-10 sm:px-8">
        <div>
          <p className="label-mono text-ink-soft">{user.email}</p>
          <h1 className="font-display text-5xl font-bold uppercase tracking-tight">
            Your garage
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {isAdmin && (
            <Link
              href="/admin/receiving"
              className="label-mono border border-ink px-4 py-2 hover:bg-ink hover:text-paper"
            >
              Receiving desk →
            </Link>
          )}
          <SignOutButton />
        </div>
      </div>

      {credited && (
        <div className="border-b border-line bg-accent px-4 py-4 text-accent-ink sm:px-8">
          <p className="font-semibold">
            {usd(Number(credited))} in trade-in credit is available now. It
            applies automatically at checkout — a prepaid shipping label is on
            its way to your email.
          </p>
        </div>
      )}
      {pending && (
        <div className="border-b border-line bg-paper-raised px-4 py-4 sm:px-8">
          <p className="font-semibold">
            {usd(Number(pending))} quote accepted — credit is{" "}
            <span className="text-accent">pending</span> until we receive and
            verify your parts. Ship with the prepaid label; spendable credit
            lands after inspection.
          </p>
        </div>
      )}
      {ordered && (
        <div className="border-b border-line bg-ink px-4 py-4 text-paper sm:px-8">
          <p className="font-semibold">
            Order placed. Confirmation #{ordered.slice(0, 8).toUpperCase()}
          </p>
        </div>
      )}

      <div className="grid border-b border-line sm:grid-cols-4">
        <div className="border-b border-line px-4 py-8 sm:border-b-0 sm:border-r sm:px-8">
          <p className="label-mono text-ink-soft">Available credit</p>
          <p className="font-display mt-1 text-5xl font-bold text-accent">
            {usd(balance)}
          </p>
          <p className="label-mono mt-2 text-ink-soft">
            Spendable at checkout
          </p>
        </div>
        <div className="border-b border-line px-4 py-8 sm:border-b-0 sm:border-r sm:px-8">
          <p className="label-mono text-ink-soft">Pending credit</p>
          <p className="font-display mt-1 text-5xl font-bold">
            {usd(pendingCredit)}
          </p>
          <p className="label-mono mt-2 text-ink-soft">
            Awaiting part arrival
          </p>
        </div>
        <div className="border-b border-line px-4 py-8 sm:border-b-0 sm:border-r sm:px-8">
          <p className="label-mono text-ink-soft">Trade-ins</p>
          <p className="font-display mt-1 text-5xl font-bold">
            {(tradeIns ?? []).length}
          </p>
          <Link href="/trade-in" className="label-mono mt-2 inline-block text-accent">
            Start another →
          </Link>
        </div>
        <div className="px-4 py-8 sm:px-8">
          <p className="label-mono text-ink-soft">Orders</p>
          <p className="font-display mt-1 text-5xl font-bold">
            {(orders ?? []).length}
          </p>
          <Link href="/parts" className="label-mono mt-2 inline-block text-accent">
            Shop upgrades →
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-2">
        <section className="border-b border-line px-4 py-8 lg:border-b-0 lg:border-r sm:px-8">
          <h2 className="font-display text-2xl font-semibold uppercase">
            Trade-in history
          </h2>
          {(tradeIns as TradeInRow[] | null)?.length ? (
            <ul className="mt-4 space-y-4">
              {(tradeIns as TradeInRow[]).map((t) => (
                <li key={t.id} className="border border-line bg-paper-raised p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="label-mono text-ink-soft">
                      {fmtDate(t.created_at)} ·{" "}
                      {TRADE_IN_STATUS_LABELS[t.status] ?? t.status}
                    </span>
                    <span className="font-semibold text-accent">
                      {t.status === "credited"
                        ? `+${usd(t.credited_total_cents ?? 0)}`
                        : t.status === "rejected"
                          ? "—"
                          : `~${usd(t.quoted_total_cents ?? 0)} pending`}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {t.trade_in_items.map((item, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span>
                          {item.description}{" "}
                          <span className="text-ink-soft">
                            ({ITEM_CONDITION_LABELS[item.condition]})
                          </span>
                        </span>
                        <span>
                          {item.final_cents != null
                            ? usd(item.final_cents)
                            : usd(item.quoted_cents)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 border border-dashed border-line p-6 text-sm text-ink-soft">
              No trade-ins yet.{" "}
              <Link href="/trade-in" className="text-accent underline">
                Get your first quote
              </Link>{" "}
              — it takes about a minute.
            </p>
          )}
        </section>

        <section className="px-4 py-8 sm:px-8">
          <h2 className="font-display text-2xl font-semibold uppercase">
            Order history
          </h2>
          {(orders as OrderRow[] | null)?.length ? (
            <ul className="mt-4 space-y-4">
              {(orders as OrderRow[]).map((o) => (
                <li key={o.id} className="border border-line bg-paper-raised p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="label-mono text-ink-soft">
                      {fmtDate(o.created_at)} · #{o.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="font-semibold">{usd(o.total_cents)}</span>
                  </div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {o.order_items.map((item, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span>
                          {item.qty} × {item.product_name}
                        </span>
                        <span>{usd(item.unit_price_cents * item.qty)}</span>
                      </li>
                    ))}
                  </ul>
                  {o.credit_applied_cents > 0 && (
                    <p className="label-mono mt-2 text-accent">
                      {usd(o.credit_applied_cents)} paid with trade-in credit
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 border border-dashed border-line p-6 text-sm text-ink-soft">
              No orders yet. Your credit is waiting.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

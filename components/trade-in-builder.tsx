"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Category, ItemCondition, TradeInCatalogEntry } from "@/lib/types";
import {
  ITEM_CONDITION_LABELS,
  ITEM_CONDITION_MULTIPLIER,
} from "@/lib/types";
import { usd } from "@/lib/format";
import { INSTANT_CREDIT_THRESHOLD_CENTS } from "@/lib/credit";

interface QuoteLine {
  key: number;
  entry: TradeInCatalogEntry;
  condition: ItemCondition;
}

const CONDITIONS: ItemCondition[] = ["like_new", "good", "fair", "poor"];

export default function TradeInBuilder({
  catalog,
  categories,
  preloadIds = [],
  preloadLabel,
}: {
  catalog: TradeInCatalogEntry[];
  categories: Category[];
  preloadIds?: string[];
  preloadLabel?: string;
}) {
  const [lines, setLines] = useState<QuoteLine[]>(() =>
    preloadIds
      .map((id) => catalog.find((e) => e.id === id))
      .filter((e): e is TradeInCatalogEntry => Boolean(e))
      .map((entry, i) => ({ key: i + 1, entry, condition: "good" as const }))
  );
  const [nextKey, setNextKey] = useState(preloadIds.length + 1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const grouped = useMemo(() => {
    return categories
      .map((cat) => ({
        cat,
        entries: catalog.filter((e) => e.category_id === cat.id),
      }))
      .filter((g) => g.entries.length > 0);
  }, [catalog, categories]);

  const quoteFor = (line: QuoteLine) =>
    Math.round(
      line.entry.base_value_cents * ITEM_CONDITION_MULTIPLIER[line.condition]
    );

  const total = lines.reduce((sum, l) => sum + quoteFor(l), 0);
  const isInstant = total <= INSTANT_CREDIT_THRESHOLD_CENTS;

  function addEntry(entry: TradeInCatalogEntry) {
    setLines((prev) => [...prev, { key: nextKey, entry, condition: "good" }]);
    setNextKey((k) => k + 1);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login?next=/trade-in");
      setSubmitting(false);
      return;
    }
    const { data, error: rpcError } = await supabase.rpc("submit_trade_in", {
      p_items: lines.map((l) => ({
        catalog_id: l.entry.id,
        condition: l.condition,
      })),
    });
    if (rpcError) {
      setError(rpcError.message);
      setSubmitting(false);
      return;
    }
    if (data.is_instant) {
      router.push(`/account?credited=${data.credited_cents}`);
    } else {
      router.push(`/account?pending=${data.pending_cents}`);
    }
  }

  return (
    <div className="grid lg:grid-cols-[3fr_2fr]">
      {/* Value book */}
      <div className="border-b border-line lg:border-b-0 lg:border-r">
        {grouped.map(({ cat, entries }) => (
          <div key={cat.id} className="border-b border-line last:border-b-0">
            <p className="label-mono border-b border-line bg-paper-raised px-4 py-2.5 text-ink-soft sm:px-8">
              {cat.name}
            </p>
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-4 border-b border-line px-4 py-3.5 last:border-b-0 sm:px-8"
              >
                <div>
                  <p className="font-medium">{entry.name}</p>
                  <p className="label-mono mt-0.5 text-ink-soft">
                    {entry.ebay_comp_cents
                      ? `eBay sold avg ${usd(entry.ebay_comp_cents)} · we pay up to ${usd(entry.base_value_cents)}`
                      : `up to ${usd(entry.base_value_cents)}`}
                  </p>
                </div>
                <button
                  onClick={() => addEntry(entry)}
                  className="label-mono shrink-0 border border-ink px-3 py-2 hover:bg-ink hover:text-paper"
                >
                  + Add
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Quote panel */}
      <div className="sticky top-0 self-start px-4 py-8 sm:px-8">
        <p className="label-mono text-ink-soft">Your quote</p>
        {preloadLabel && lines.length > 0 && (
          <p className="mt-2 border-l-2 border-accent bg-paper-raised p-3 text-sm text-ink-soft">
            We preloaded the usual {preloadLabel} takeoffs. Remove anything
            you&apos;re keeping and grade the rest.
          </p>
        )}
        {lines.length === 0 ? (
          <p className="mt-4 border border-dashed border-line p-8 text-center text-sm text-ink-soft">
            Add the parts you pulled off your bike. Most first-month riders
            have $30–$75 sitting in the garage — batteries and e-moto
            takeoffs push it past $200.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {lines.map((line) => (
              <li key={line.key} className="border border-line bg-paper-raised p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">{line.entry.name}</p>
                  <button
                    onClick={() =>
                      setLines((prev) => prev.filter((l) => l.key !== line.key))
                    }
                    className="label-mono text-ink-soft hover:text-accent"
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {CONDITIONS.map((c) => (
                    <button
                      key={c}
                      onClick={() =>
                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key ? { ...l, condition: c } : l
                          )
                        )
                      }
                      className={`label-mono border px-2 py-1 ${
                        line.condition === c
                          ? "border-accent bg-accent text-accent-ink"
                          : "border-line hover:border-ink"
                      }`}
                    >
                      {ITEM_CONDITION_LABELS[c]}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-right font-semibold">
                  {usd(quoteFor(line))}
                </p>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 border-t-2 border-ink pt-4">
          <div className="flex items-baseline justify-between">
            <span className="label-mono text-ink-soft">
              {isInstant ? "Instant credit" : "Pending credit"}
            </span>
            <span className="font-display text-4xl font-bold">{usd(total)}</span>
          </div>
          {!isInstant && (
            <p className="mt-2 text-sm text-ink-soft">
              Quotes over {usd(INSTANT_CREDIT_THRESHOLD_CENTS)} stay pending until
              we receive and verify your parts. Spendable credit lands after
              inspection.
            </p>
          )}
          {error && (
            <p className="mt-3 border border-accent bg-accent/10 p-3 text-sm text-accent">
              {error}
            </p>
          )}
          <button
            disabled={lines.length === 0 || submitting}
            onClick={submit}
            className="mt-4 w-full bg-accent px-8 py-4 text-sm font-semibold uppercase tracking-wide text-accent-ink hover:bg-ink disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-soft"
          >
            {submitting ? "Submitting…" : isInstant ? "Accept quote & get credit" : "Accept quote & ship parts"}
          </button>
          <p className="label-mono mt-3 text-ink-soft">
            Under {usd(INSTANT_CREDIT_THRESHOLD_CENTS)} = instant credit · over = pending until verified ·
            quote honored 14 days
          </p>
        </div>
      </div>
    </div>
  );
}

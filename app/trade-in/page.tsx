import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TradeInBuilder from "@/components/trade-in-builder";
import type { Category, TradeInCatalogEntry } from "@/lib/types";
import { usd } from "@/lib/format";

export const revalidate = 300;

export default async function TradeInPage({
  searchParams,
}: {
  searchParams: Promise<{ bike?: string }>;
}) {
  const { bike: bikeSlug } = await searchParams;
  const supabase = await createClient();
  const [{ data: catalog }, { data: categories }] = await Promise.all([
    supabase
      .from("trade_in_catalog")
      .select("*, categories(slug, name)")
      .eq("active", true)
      .order("base_value_cents", { ascending: false }),
    supabase.from("categories").select("*").order("sort"),
  ]);

  let preloadIds: string[] = [];
  let preloadLabel: string | undefined;
  let preloadSkippedYearVariants = false;
  if (bikeSlug) {
    const { data: bike } = await supabase
      .from("bike_models")
      .select("brand, model, bike_stock_parts(catalog_id, component, sort)")
      .eq("slug", bikeSlug)
      .single();
    if (bike) {
      preloadLabel = `${bike.brand} ${bike.model}`;
      const rows = (
        bike.bike_stock_parts as {
          catalog_id: string | null;
          component: string;
          sort: number;
        }[]
      ).sort((a, b) => a.sort - b.sort);
      // Components with multiple catalog entries changed by model year; any
      // one bike only has one of them, so preloading both would inflate the
      // quote. The rider picks their year's version from the list instead.
      const idsByComponent = new Map<string, Set<string>>();
      for (const r of rows) {
        if (!r.catalog_id) continue;
        const set = idsByComponent.get(r.component) ?? new Set();
        set.add(r.catalog_id);
        idsByComponent.set(r.component, set);
      }
      for (const r of rows) {
        if (!r.catalog_id) continue;
        if ((idsByComponent.get(r.component)?.size ?? 0) > 1) {
          preloadSkippedYearVariants = true;
          continue;
        }
        preloadIds.push(r.catalog_id);
      }
      // A bike can map several parts to the same catalog entry; quote each once.
      preloadIds = [...new Set(preloadIds)];
    }
  }

  return (
    <div>
      <div className="border-b border-line px-4 py-12 sm:px-8">
        <p className="label-mono text-accent">No haggling, no listings, no meetups</p>
        <h1 className="font-display max-w-3xl text-5xl font-bold uppercase leading-none tracking-tight sm:text-6xl">
          Turn the parts bin into store credit
        </h1>
        <p className="mt-4 max-w-xl leading-relaxed text-ink-soft">
          Pick the stock parts you pulled off, grade them honestly, and accept
          the quote. Credit hits your account instantly and applies itself to
          your next order. We email you a prepaid shipping label.
        </p>
        <p className="label-mono mt-4 text-ink-soft">
          Not sure what your parts are called?{" "}
          <Link href="/bikes" className="text-accent hover:text-ink">
            Find your bike in the index →
          </Link>
        </p>
      </div>

      {/* Pricing transparency */}
      <div className="grid border-b border-line sm:grid-cols-[auto_1fr]">
        <div className="flex items-center border-b border-line bg-ink px-4 py-4 text-paper sm:border-b-0 sm:border-r sm:px-8">
          <span className="font-display text-3xl font-bold uppercase">
            How we price
          </span>
        </div>
        <div className="px-4 py-4 sm:px-8">
          <p className="max-w-3xl text-sm leading-relaxed text-ink-soft">
            Every quote is pegged at{" "}
            <span className="font-semibold text-ink">
              50% of the 90-day eBay sold average
            </span>{" "}
            for that part — and we show you the comp right on the line. Quotes
            under {usd(5000)} credit instantly; over that, credit stays pending
            until we receive and verify your parts.
          </p>
        </div>
      </div>
      <TradeInBuilder
        key={bikeSlug ?? "blank"}
        catalog={(catalog as TradeInCatalogEntry[] | null) ?? []}
        categories={(categories as Category[] | null) ?? []}
        preloadIds={preloadIds}
        preloadLabel={preloadLabel}
        preloadSkippedYearVariants={preloadSkippedYearVariants}
      />
    </div>
  );
}

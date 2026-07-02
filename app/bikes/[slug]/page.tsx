import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BikeModel, BikeStockPart, TradeInCatalogEntry } from "@/lib/types";
import { SWAP_LIKELIHOOD_LABELS } from "@/lib/types";
import { usd } from "@/lib/format";

export const revalidate = 300;

function truncate(text: string, max = 155): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: bike } = await supabase
    .from("bike_models")
    .select("brand, model, blurb")
    .eq("slug", slug)
    .single();

  if (!bike) return { title: "Bike not found" };

  return {
    title: `${bike.brand} ${bike.model} takeoff values`,
    description: bike.blurb
      ? truncate(bike.blurb)
      : `Trade-in values for the stock parts that come off a ${bike.brand} ${bike.model}. See what each takeoff is worth in store credit.`,
  };
}

type PartRow = BikeStockPart & {
  trade_in_catalog:
    | (TradeInCatalogEntry & {
        replaces_with: {
          slug: string;
          name: string;
          brand: string;
          price_cents: number;
        } | null;
      })
    | null;
};

export default async function BikePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("bike_models")
    .select(
      "*, bike_stock_parts(*, trade_in_catalog(*, replaces_with:products(slug, name, brand, price_cents)))"
    )
    .eq("slug", slug)
    .single();

  if (!data) notFound();
  const bike = data as BikeModel & { bike_stock_parts: PartRow[] };
  const parts = [...bike.bike_stock_parts].sort((a, b) => a.sort - b.sort);
  const potential = parts.reduce(
    (sum, p) => sum + (p.trade_in_catalog?.base_value_cents ?? 0),
    0
  );
  const isHalo = bike.tier === "halo";

  return (
    <div>
      <div className="label-mono border-b border-line px-4 py-3 text-ink-soft sm:px-8">
        <Link href="/bikes" className="hover:text-accent">
          Bike index
        </Link>
        {" / "}
        {bike.brand}
      </div>

      <div className="grid border-b border-line lg:grid-cols-[3fr_2fr]">
        <div className="px-4 py-12 sm:px-8 lg:border-r lg:border-line">
          <p className="label-mono text-accent">
            {bike.style} · {bike.years}
            {isHalo && " · scene bike"}
          </p>
          <h1 className="font-display mt-2 text-5xl font-bold uppercase leading-none tracking-tight sm:text-6xl">
            {bike.brand}
            <br />
            {bike.model}
          </h1>
          <p className="mt-5 max-w-xl leading-relaxed text-ink-soft">
            {bike.blurb}
          </p>
          <dl className="mt-8 grid max-w-xl gap-px border border-line bg-line sm:grid-cols-2">
            <div className="bg-paper-raised p-4">
              <dt className="label-mono text-ink-soft">Drive system</dt>
              <dd className="mt-1 font-medium">{bike.motor}</dd>
            </div>
            <div className="bg-paper-raised p-4">
              <dt className="label-mono text-ink-soft">Stock battery</dt>
              <dd className="mt-1 font-medium">{bike.battery}</dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-col justify-center border-t border-line bg-ink px-4 py-12 text-paper sm:px-8 lg:border-t-0">
          <p className="label-mono text-paper/50">
            Sitting on this bike right now
          </p>
          <p className="font-display mt-2 text-6xl font-bold">
            up to {usd(potential)}
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-paper/60">
            {isHalo
              ? `Top trade-in value of the ${parts.length} stock parts we track, graded like-new. Heads up: takeoff supply on scene bikes is deep, so credit runs lean — clean parts often do better sold on the used board.`
              : `That's the top trade-in value of the ${parts.length} stock parts we track for this model, graded like-new. Start a quote and we'll preload them all — remove what you're keeping.`}
          </p>
          <Link
            href={`/trade-in?bike=${bike.slug}`}
            className="mt-6 inline-block max-w-max bg-accent px-8 py-4 text-sm font-semibold uppercase tracking-wide text-accent-ink hover:bg-paper hover:text-ink"
          >
            Trade in {bike.model} parts
          </Link>
        </div>
      </div>

      <div className="px-4 py-10 sm:px-8">
        <p className="label-mono mb-1 text-ink-soft">The takeoff list</p>
        <h2 className="font-display mb-6 text-3xl font-bold uppercase tracking-tight">
          What comes off a {bike.model}
        </h2>
        <div className="border border-line">
          <div className="hidden border-b border-line bg-paper-raised px-4 sm:grid sm:grid-cols-[1fr_1.6fr_1fr_1.6fr_auto] sm:gap-4">
            {[
              "Component",
              "Stock part",
              "How often",
              "Usually replaced with",
              "Trade-in value",
            ].map((h) => (
              <span
                key={h}
                className="label-mono py-2.5 text-ink-soft last:text-right"
              >
                {h}
              </span>
            ))}
          </div>
          {parts.map((part) => {
            const upgrade = part.trade_in_catalog?.replaces_with;
            const note = part.trade_in_catalog?.upgrade_note;
            return (
              <div
                key={part.id}
                className="grid gap-1 border-b border-line px-4 py-3.5 last:border-b-0 sm:grid-cols-[1fr_1.6fr_1fr_1.6fr_auto] sm:items-center sm:gap-4"
              >
                <span className="label-mono text-ink-soft">
                  {part.component}
                </span>
                <span className="font-medium">{part.stock_part}</span>
                <span
                  className={`label-mono max-w-max border px-2 py-0.5 ${
                    part.swap_likelihood === "very_common"
                      ? "border-accent text-accent"
                      : "border-line text-ink-soft"
                  }`}
                >
                  {SWAP_LIKELIHOOD_LABELS[part.swap_likelihood]}
                </span>
                <span className="text-sm text-ink-soft">
                  {upgrade ? (
                    <Link
                      href={`/parts/${upgrade.slug}`}
                      className="text-accent hover:text-ink"
                    >
                      {upgrade.brand} {upgrade.name} —{" "}
                      {usd(upgrade.price_cents)} →
                    </Link>
                  ) : (
                    note ?? "—"
                  )}
                </span>
                <span className="text-right font-semibold">
                  {part.trade_in_catalog
                    ? `up to ${usd(part.trade_in_catalog.base_value_cents)}`
                    : "—"}
                </span>
              </div>
            );
          })}
        </div>
        <p className="label-mono mt-4 text-ink-soft">
          Values shown are like-new grade, pegged at 50% of the 90-day eBay
          sold average — the other half covers shipping, fees, hold time, and
          no-sale risk. Good, fair, and rough grades pay 80%, 60%, and 35%.
        </p>
      </div>
    </div>
  );
}

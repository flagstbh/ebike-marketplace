import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import type { BikeModel, BikeStockPart } from "@/lib/types";
import { takeoffPotential } from "@/lib/takeoff-value";
import { usd } from "@/lib/format";

export const revalidate = 300;

export const metadata = {
  title: "Bike index — Takeoff Parts Co.",
  description:
    "Every common e-bike and the stock parts riders pull off it. See what your bike's takeoffs are worth.",
};

type BikeWithParts = BikeModel & {
  bike_stock_parts: (BikeStockPart & {
    trade_in_catalog: { base_value_cents: number } | null;
  })[];
};

function potential(b: BikeWithParts) {
  return takeoffPotential(b.bike_stock_parts);
}

function BikeRow({ bike }: { bike: BikeWithParts }) {
  return (
    <Link
      href={`/bikes/${bike.slug}`}
      className="group grid gap-1 border-b border-line px-4 py-4 hover:bg-paper-raised sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-center sm:gap-4 sm:px-8"
    >
      <div className="flex items-center gap-3">
        {bike.image_url && (
          <Image
            src={bike.image_url}
            alt=""
            width={80}
            height={56}
            className="h-14 w-20 shrink-0 object-contain"
          />
        )}
        <div>
          <span className="label-mono text-ink-soft">{bike.brand}</span>
          <p className="font-display text-xl font-semibold uppercase leading-tight group-hover:text-accent">
            {bike.model}
          </p>
          <span className="label-mono text-ink-soft">{bike.years}</span>
        </div>
      </div>
      <span className="text-sm text-ink-soft">{bike.style}</span>
      <span className="hidden text-sm text-ink-soft sm:block">{bike.motor}</span>
      <span className="text-sm text-ink-soft">
        {bike.bike_stock_parts.length} parts tracked
      </span>
      <span className="text-right font-semibold">up to {usd(potential(bike))}</span>
    </Link>
  );
}

function TableHead() {
  return (
    <div className="hidden border-b border-line bg-paper-raised px-4 sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:gap-4 sm:px-8">
      {["Bike", "Style", "Drive", "Tracked parts", "Trade-in value"].map((h) => (
        <span key={h} className="label-mono py-2.5 text-ink-soft last:text-right">
          {h}
        </span>
      ))}
    </div>
  );
}

export default async function BikesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bike_models")
    .select("*, bike_stock_parts(*, trade_in_catalog(base_value_cents))")
    .order("sort");

  const bikes = (data as BikeWithParts[] | null) ?? [];
  const halo = bikes.filter((b) => b.tier === "halo");
  const volume = bikes.filter((b) => b.tier === "volume");

  return (
    <div>
      <div className="grid border-b border-line lg:grid-cols-[3fr_2fr]">
        <div className="px-4 py-12 sm:px-8">
          <p className="label-mono text-accent">The bike index</p>
          <h1 className="font-display max-w-3xl text-5xl font-bold uppercase leading-none tracking-tight sm:text-6xl">
            Find your bike. See what it&apos;s worth in parts.
          </h1>
          <p className="mt-4 max-w-xl leading-relaxed text-ink-soft">
            We track the bikes people actually ride and the stock parts that
            actually come off them. Pick yours and we&apos;ll preload a
            trade-in quote with the usual takeoffs.
          </p>
        </div>
        <div className="relative hidden min-h-[280px] border-l border-line bg-ink lg:block">
          <Image
            src="/hero-b.jpg"
            alt="Takeoff brake set, controller, and saddle tagged with handwritten part numbers on a workbench"
            fill
            sizes="40vw"
            className="object-cover"
          />
          <div className="label-mono absolute bottom-0 left-0 bg-paper px-3 py-2 text-ink">
            Week one: the takeoffs come off
          </div>
        </div>
      </div>

      {/* Scene bikes */}
      <div className="border-b border-line bg-ink px-4 py-8 text-paper sm:px-8">
        <p className="label-mono text-accent">The scene bikes</p>
        <h2 className="font-display mt-1 text-3xl font-bold uppercase tracking-tight">
          Sur-Ron, Talaria &amp; friends
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-paper/60">
          The bikes everyone searches for. Owners upgrade everything, so
          takeoff supply runs deep and resale runs slower — instant credit is
          leaner here, but clean parts still move on the used board.
        </p>
      </div>
      {halo.map((bike) => (
        <BikeRow key={bike.id} bike={bike} />
      ))}

      {/* Volume bikes */}
      <div className="border-b border-line px-4 py-8 sm:px-8">
        <p className="label-mono text-accent">The volume board</p>
        <h2 className="font-display mt-1 text-3xl font-bold uppercase tracking-tight">
          Where the trade volume actually is
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Rad, Lectric, Aventon and the rest of the commuter fleet. These
          takeoffs turn over fast, so quotes stay honest and credit is instant.
        </p>
      </div>
      <TableHead />
      {volume.map((bike) => (
        <BikeRow key={bike.id} bike={bike} />
      ))}

      <div className="px-4 py-10 sm:px-8">
        <p className="text-sm leading-relaxed text-ink-soft">
          Don&apos;t see your bike? The{" "}
          <Link href="/trade-in" className="text-accent underline">
            trade-in builder
          </Link>{" "}
          works for any e-bike — pick the parts directly. We add new models
          every month based on what shows up at the dock.
        </p>
      </div>
    </div>
  );
}

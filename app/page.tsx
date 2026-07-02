import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import ProductCard from "@/components/product-card";
import type { Category, Product } from "@/lib/types";
import { usd } from "@/lib/format";

export const revalidate = 300;

export default async function HomePage() {
  const supabase = await createClient();
  const [{ data: featured }, { data: categories }, { data: usedDeals }] =
    await Promise.all([
      supabase
        .from("products")
        .select("*")
        .eq("featured", true)
        .eq("source", "retail")
        .order("price_cents", { ascending: false })
        .limit(4),
      supabase.from("categories").select("*").order("sort"),
      supabase
        .from("products")
        .select("*")
        .eq("source", "trade_in")
        .gt("stock", 0)
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

  return (
    <div>
      {/* Hero */}
      <section className="grid border-b border-line lg:grid-cols-[7fr_5fr]">
        <div className="flex flex-col justify-center px-4 py-16 sm:px-8 lg:py-24">
          <p className="label-mono mb-6 text-accent">
            The first-month mod is inevitable
          </p>
          <h1 className="font-display max-w-2xl text-5xl font-bold uppercase leading-[0.95] tracking-tight sm:text-7xl">
            Your stock parts are worth money.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
            You bought the bike, then swapped the saddle, the brakes, and
            eventually the battery. Send us the takeoffs. We credit your
            account instantly and apply it to your upgrades at checkout,
            automatically.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/trade-in"
              className="bg-accent px-8 py-4 text-sm font-semibold uppercase tracking-wide text-accent-ink hover:bg-ink"
            >
              Get a trade-in quote
            </Link>
            <Link
              href="/parts"
              className="border border-ink px-8 py-4 text-sm font-semibold uppercase tracking-wide hover:bg-ink hover:text-paper"
            >
              Shop upgrades
            </Link>
          </div>
        </div>
        <div className="relative hidden min-h-[420px] border-l border-line bg-ink lg:block">
          <Image
            src="/hero-emoto.jpg"
            alt="Electric dirt bike on a stand in a garage, its takeoff shock, controller, and tires tagged for trade-in"
            fill
            priority
            sizes="42vw"
            className="object-cover opacity-90"
          />
          <video
            className="absolute inset-0 h-full w-full object-cover opacity-90 motion-reduce:hidden"
            autoPlay
            muted
            loop
            playsInline
            poster="/hero-emoto.jpg"
            aria-hidden="true"
          >
            <source src="/hero-loop.mp4" type="video/mp4" />
          </video>
          <div className="label-mono absolute bottom-0 left-0 bg-paper px-3 py-2 text-ink">
            Tonight&apos;s takeoffs: shock, controller, tires, already tagged
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="grid border-b border-line sm:grid-cols-3">
        {[
          {
            n: "01",
            title: "Tell us what you pulled off",
            body: "Pick your stock parts from the list, grade the condition honestly, and see the quote before you commit.",
          },
          {
            n: "02",
            title: "Credit lands instantly",
            body: "Accept the quote and the credit hits your garage balance right away. Print the free label, ship when you're ready.",
          },
          {
            n: "03",
            title: "It applies itself",
            body: "No codes to remember. Your balance is deducted automatically from your next order, whether that's $19 grips or a $749 mid-drive.",
          },
        ].map((step, i) => (
          <div
            key={step.n}
            className={`px-4 py-10 sm:px-8 ${i > 0 ? "border-t border-line sm:border-l sm:border-t-0" : ""}`}
          >
            <span className="label-mono text-accent">{step.n}</span>
            <h2 className="font-display mt-3 text-2xl font-semibold uppercase leading-tight">
              {step.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              {step.body}
            </p>
          </div>
        ))}
      </section>

      {/* Bike index strip */}
      <section className="grid border-b border-line lg:grid-cols-[2fr_3fr]">
        <div className="px-4 py-12 sm:px-8 lg:border-r lg:border-line">
          <p className="label-mono text-accent">The bike index</p>
          <h2 className="font-display mt-2 text-4xl font-bold uppercase tracking-tight">
            We know your bike&apos;s parts by name
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-soft">
            Sur-Ron to RadRover — we track the stock parts on every common
            e-bike, what each one trades for, and what riders replace it
            with. Find yours and start a quote with the usual takeoffs
            already loaded.
          </p>
          <Link
            href="/bikes"
            className="mt-8 inline-block border border-ink px-8 py-4 text-sm font-semibold uppercase tracking-wide hover:bg-ink hover:text-paper"
          >
            Find your bike
          </Link>
        </div>
        <div className="grid content-center gap-px bg-line p-px sm:grid-cols-2">
          {[
            { name: "Sur-Ron Light Bee X", value: "up to $467", slug: "surron-light-bee-x" },
            { name: "Rad Power RadRover 6 Plus", value: "up to $210", slug: "radrover-6-plus" },
            { name: "Aventon Aventure.2", value: "up to $205", slug: "aventon-aventure-2" },
            { name: "Lectric XP 3.0", value: "up to $101", slug: "lectric-xp-3" },
          ].map((b) => (
            <Link
              key={b.slug}
              href={`/bikes/${b.slug}`}
              className="group bg-paper px-6 py-8 hover:bg-ink hover:text-paper"
            >
              <p className="font-display text-lg font-semibold uppercase leading-tight">
                {b.name}
              </p>
              <p className="label-mono mt-2 text-accent">{b.value} in takeoffs</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured upgrades */}
      <section className="px-4 py-14 sm:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="label-mono text-ink-soft">The greatest hits</p>
            <h2 className="font-display text-4xl font-bold uppercase tracking-tight">
              Upgrades riders actually do
            </h2>
          </div>
          <Link href="/parts" className="label-mono text-accent hover:text-ink">
            All parts →
          </Link>
        </div>
        <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4">
          {(featured as Product[] | null)?.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Used strip */}
      <section className="border-y border-line bg-ink px-4 py-14 text-paper sm:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="label-mono text-paper/50">Fresh off someone&apos;s bike</p>
            <h2 className="font-display text-4xl font-bold uppercase tracking-tight">
              The used board
            </h2>
          </div>
          <Link href="/used" className="label-mono text-accent hover:text-paper">
            Browse all used →
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {(usedDeals as Product[] | null)?.map((p) => (
            <Link
              key={p.id}
              href={`/parts/${p.slug}`}
              className="group border border-paper/20 p-6 transition-colors hover:border-accent"
            >
              <span className="label-mono text-paper/50">{p.brand}</span>
              <p className="font-display mt-2 text-xl font-semibold uppercase leading-tight group-hover:text-accent">
                {p.name}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-paper/60">
                {p.condition_note}
              </p>
              <p className="mt-4 flex items-baseline gap-2">
                <span className="text-xl font-semibold">{usd(p.price_cents)}</span>
                {p.compare_at_cents && (
                  <span className="text-sm text-paper/40 line-through">
                    {usd(p.compare_at_cents)} new
                  </span>
                )}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="px-4 py-14 sm:px-8">
        <p className="label-mono mb-8 text-ink-soft">Shop by system</p>
        <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {(categories as Category[] | null)?.map((c) => (
            <Link
              key={c.id}
              href={`/parts?category=${c.slug}`}
              className="group bg-paper-raised p-6 hover:bg-ink hover:text-paper"
            >
              <h3 className="font-display text-xl font-semibold uppercase">
                {c.name}
              </h3>
              <p className="mt-2 text-sm text-ink-soft group-hover:text-paper/60">
                {c.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

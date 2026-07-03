import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddToCart from "@/components/add-to-cart";
import ProductCard from "@/components/product-card";
import type { Product, ProductFitment } from "@/lib/types";
import { CONDITION_LABELS } from "@/lib/types";
import { getYourBike } from "@/lib/your-bike";
import { usd, partNumber } from "@/lib/format";

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

  const { data: product } = await supabase
    .from("products")
    .select("name, brand, description, image_url")
    .eq("slug", slug)
    .single();

  // Missing slug -> not-found boundary. Because app/loading.tsx streams the
  // response, the HTTP status stays 200 (documented Next 16 behavior), but the
  // not-found UI ships <meta robots noindex>, which is what actually keeps bad
  // slugs out of search. A hard 404 would need a middleware existence check;
  // not worth the per-request cost. See next docs .../loading.md#status-codes.
  if (!product) notFound();

  return {
    title: `${product.brand} ${product.name}`,
    description: truncate(product.description),
    ...(product.image_url && {
      openGraph: {
        siteName: "Takeoff Parts Co.",
        type: "website",
        images: [product.image_url],
      },
    }),
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("*, categories(slug, name)")
    .eq("slug", slug)
    .single();

  if (!product) notFound();
  const p = product as Product;

  const [yourBike, { data: related }, { data: fitments }, { data: replacesRows }] =
    await Promise.all([
      getYourBike(),
      supabase
        .from("products")
        .select("*")
        .eq("category_id", p.category_id)
        .neq("id", p.id)
        .gt("stock", 0)
        .limit(4),
      supabase
        .from("product_fitments")
        .select("id, product_id, bike_id, years, status, note, bike_models(slug, brand, model)")
        .eq("product_id", p.id),
      supabase
        .from("trade_in_catalog")
        .select("name")
        .eq("replaces_with_product_id", p.id),
    ]);
  const fits = (fitments ?? []) as unknown as ProductFitment[];
  const verifiedFits = fits.filter((f) => f.status === "verified" && f.bike_models);
  const checkFits = fits.filter((f) => f.status === "check" && f.bike_models);
  const replacesNames = [
    ...new Set((replacesRows ?? []).map((r) => (r as { name: string }).name)),
  ].slice(0, 4);

  // The one question a rider has: does this fit MY bike? Answer it up top when
  // we know their bike, using only the verified/likely fitment data.
  const myVerified = yourBike
    ? verifiedFits.find((f) => f.bike_models!.slug === yourBike.slug)
    : undefined;
  const myCheck = yourBike
    ? checkFits.find((f) => f.bike_models!.slug === yourBike.slug)
    : undefined;
  const verdict: "verified" | "check" | "none" | null = !yourBike
    ? null
    : myVerified
      ? "verified"
      : myCheck
        ? "check"
        : "none";

  const specs = Object.entries(p.specs ?? {});
  const savings =
    p.compare_at_cents && p.compare_at_cents > p.price_cents
      ? p.compare_at_cents - p.price_cents
      : null;

  return (
    <div>
      <div className="label-mono border-b border-line px-4 py-3 text-ink-soft sm:px-8">
        <Link href="/parts" className="hover:text-accent">Parts</Link>
        {" / "}
        {p.categories && (
          <>
            <Link
              href={`/parts?category=${p.categories.slug}`}
              className="hover:text-accent"
            >
              {p.categories.name}
            </Link>
            {" / "}
          </>
        )}
        {partNumber(p.slug)}
      </div>

      <div className="grid border-b border-line lg:grid-cols-2">
        <div className="relative min-h-[320px] border-b border-line bg-paper-raised lg:min-h-[520px] lg:border-b-0 lg:border-r">
          {p.image_url ? (
            <Image
              src={p.image_url}
              alt={p.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full min-h-[320px] items-center justify-center">
              <span className="label-mono text-ink-soft">
                {partNumber(p.slug)}
              </span>
            </div>
          )}
          {p.source === "trade_in" && (
            <span className="label-mono absolute left-0 top-6 bg-ink px-3 py-1.5 text-paper">
              {CONDITION_LABELS[p.condition]} · trade-in takeoff
            </span>
          )}
        </div>

        <div className="flex flex-col px-4 py-10 sm:px-10">
          <span className="label-mono text-ink-soft">{p.brand}</span>
          <h1 className="font-display mt-2 text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl">
            {p.name}
          </h1>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-3xl font-semibold">{usd(p.price_cents)}</span>
            {p.compare_at_cents && p.compare_at_cents > p.price_cents && (
              <span className="text-lg text-ink-soft line-through">
                {usd(p.compare_at_cents)}
              </span>
            )}
            {savings && (
              <span className="label-mono bg-accent px-2 py-1 text-accent-ink">
                save {usd(savings)}
              </span>
            )}
          </div>

          {/* Fits-your-bike verdict */}
          {verdict === "verified" && (
            <div className="mt-6 border-2 border-accent bg-accent/10 p-4">
              <p className="font-semibold text-ink">
                ✓ Fits your {yourBike!.brand} {yourBike!.model}
                {myVerified!.years && (
                  <span className="label-mono ml-2 text-accent">
                    {myVerified!.years}
                  </span>
                )}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {myVerified!.note ?? "Confirmed against manufacturer fitment data."}
              </p>
            </div>
          )}
          {verdict === "check" && (
            <div className="mt-6 border border-ink bg-paper-raised p-4">
              <p className="font-semibold">
                Likely fits your {yourBike!.brand} {yourBike!.model}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {myCheck!.note ??
                  "Check your year and exact spec before ordering."}
              </p>
            </div>
          )}
          {verdict === "none" && (
            <div className="mt-6 border border-line bg-paper-raised p-4">
              <p className="font-medium text-ink-soft">
                Not confirmed for your {yourBike!.brand} {yourBike!.model}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                We don&apos;t have verified fitment data for this combination. It
                may still fit — check the spec against your bike, or{" "}
                <Link href={`/parts?bike=${yourBike!.slug}`} className="text-accent underline">
                  see what is confirmed to fit
                </Link>
                .
              </p>
            </div>
          )}
          {!yourBike && (verifiedFits.length > 0 || checkFits.length > 0) && (
            <Link
              href="/bikes"
              className="label-mono mt-6 inline-block border border-line px-3 py-2 hover:border-ink"
            >
              Set your bike to check fit →
            </Link>
          )}

          {replacesNames.length > 0 && (
            <p className="label-mono mt-6 text-ink-soft">
              Upgrades from stock: {replacesNames.join(", ")}
            </p>
          )}

          <p className="mt-6 max-w-prose leading-relaxed text-ink-soft">
            {p.description}
          </p>

          {p.condition_note && (
            <div className="mt-6 border-l-2 border-accent bg-paper-raised p-4">
              <p className="label-mono mb-1 text-ink-soft">Condition report</p>
              <p className="text-sm">{p.condition_note}</p>
            </div>
          )}

          {verifiedFits.length > 0 && (
            <div className="mt-6">
              <p className="label-mono mb-2 text-ink-soft">
                Verified fit — confirmed against manufacturer fitment data
              </p>
              <ul className="flex flex-wrap gap-2">
                {verifiedFits.map((f) => (
                  <li key={f.id}>
                    <Link
                      href={`/bikes/${f.bike_models!.slug}`}
                      title={f.note ?? undefined}
                      className="block border border-ink px-2.5 py-1 text-sm hover:bg-ink hover:text-paper"
                    >
                      {f.bike_models!.brand} {f.bike_models!.model}
                      {f.years && (
                        <span className="label-mono ml-1.5 text-accent">{f.years}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {checkFits.length > 0 && (
            <div className="mt-4">
              <p className="label-mono mb-2 text-ink-soft">
                Likely fits — check your year and spec before ordering
              </p>
              <ul className="flex flex-wrap gap-2">
                {checkFits.map((f) => (
                  <li key={f.id}>
                    <Link
                      href={`/bikes/${f.bike_models!.slug}`}
                      title={f.note ?? undefined}
                      className="block border border-dashed border-line px-2.5 py-1 text-sm text-ink-soft hover:border-ink hover:text-ink"
                    >
                      {f.bike_models!.brand} {f.bike_models!.model}
                      {f.years && <span className="label-mono ml-1.5">{f.years}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {fits.length === 0 && p.fits.length > 0 && (
            <div className="mt-6">
              <p className="label-mono mb-2 text-ink-soft">Fits</p>
              <ul className="flex flex-wrap gap-2">
                {p.fits.map((f) => (
                  <li key={f} className="border border-line px-2.5 py-1 text-sm">
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-10 max-w-sm">
            <AddToCart product={p} />
            <p className="label-mono mt-3 text-ink-soft">
              {p.stock > 0
                ? `${p.stock} in stock — trade-in credit applies automatically`
                : "Sold out — trade-ins restock the board daily"}
            </p>
            <ul className="label-mono mt-4 space-y-1.5 text-ink-soft">
              <li>Free shipping, ships from Madison, WI</li>
              {p.source === "trade_in" ? (
                <li>90-day warranty on used parts</li>
              ) : (
                <li>New and warrantied · 30-day returns if unused</li>
              )}
              <li>Trade-in credit applies itself at checkout</li>
            </ul>
          </div>
        </div>
      </div>

      {specs.length > 0 && (
        <div className="border-b border-line px-4 py-10 sm:px-8">
          <p className="label-mono mb-4 text-ink-soft">Specifications</p>
          <dl className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {specs.map(([k, v]) => (
              <div key={k} className="bg-paper-raised p-4">
                <dt className="label-mono text-ink-soft">{k}</dt>
                <dd className="mt-1 font-medium">{String(v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {related && related.length > 0 && (
        <div className="px-4 py-10 sm:px-8">
          <p className="label-mono mb-6 text-ink-soft">Same system</p>
          <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4">
            {(related as Product[]).map((r) => (
              <ProductCard key={r.id} product={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

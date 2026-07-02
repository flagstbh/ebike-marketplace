import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddToCart from "@/components/add-to-cart";
import ProductCard from "@/components/product-card";
import type { Product } from "@/lib/types";
import { CONDITION_LABELS } from "@/lib/types";
import { usd, partNumber } from "@/lib/format";

export const revalidate = 60;

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

  if (!product) return { title: "Part not found" };

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

  const { data: related } = await supabase
    .from("products")
    .select("*")
    .eq("category_id", p.category_id)
    .neq("id", p.id)
    .gt("stock", 0)
    .limit(4);

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

          <p className="mt-6 max-w-prose leading-relaxed text-ink-soft">
            {p.description}
          </p>

          {p.condition_note && (
            <div className="mt-6 border-l-2 border-accent bg-paper-raised p-4">
              <p className="label-mono mb-1 text-ink-soft">Condition report</p>
              <p className="text-sm">{p.condition_note}</p>
            </div>
          )}

          {p.fits.length > 0 && (
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

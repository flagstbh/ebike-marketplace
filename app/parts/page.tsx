import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProductCard from "@/components/product-card";
import BikePicker from "@/components/bike-picker";
import { getYourBike } from "@/lib/your-bike";
import type { Category, Product } from "@/lib/types";

export default async function PartsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; bike?: string }>;
}) {
  const { category, bike: bikeParam } = await searchParams;

  // Bike-first: with no explicit bike in the URL, fall back to the rider's
  // saved bike so the whole browse defaults to "parts for my bike".
  let bikeSlug = bikeParam;
  if (!bikeSlug) {
    const yb = await getYourBike();
    if (yb) bikeSlug = yb.slug;
  }

  const supabase = await createClient();

  const [{ data: categories }, { data: bikes }] = await Promise.all([
    supabase.from("categories").select("*").order("sort"),
    supabase.from("bike_models").select("slug, brand, model").order("brand"),
  ]);

  // Bike-filter mode: products come from the fitment-truth table, split by
  // confidence. Only "verified" gets fits-your-bike language.
  let bikeName: string | null = null;
  let verified: Product[] = [];
  let check: Product[] = [];
  if (bikeSlug) {
    const { data: bikeRow } = await supabase
      .from("bike_models")
      .select("id, brand, model")
      .eq("slug", bikeSlug)
      .single();
    if (bikeRow) {
      bikeName = `${bikeRow.brand} ${bikeRow.model}`;
      const { data: fitRows } = await supabase
        .from("product_fitments")
        .select("status, products(*, categories(slug, name))")
        .eq("bike_id", bikeRow.id);
      const rows = (fitRows ?? []) as unknown as { status: string; products: Product & { categories: Category } }[];
      const inCategory = (p: Product & { categories: Category }) =>
        !category || p.categories?.slug === category;
      const inStock = rows.filter((r) => r.products && r.products.stock > 0 && inCategory(r.products));
      verified = inStock.filter((r) => r.status === "verified").map((r) => r.products);
      check = inStock.filter((r) => r.status === "check").map((r) => r.products);
    }
  }

  let products: Product[] | null = null;
  if (!bikeName) {
    let query = supabase
      .from("products")
      .select("*, categories!inner(slug, name)")
      .eq("source", "retail")
      .order("featured", { ascending: false })
      .order("price_cents", { ascending: false });
    if (category) query = query.eq("categories.slug", category);
    const { data } = await query;
    products = data as Product[] | null;
  }

  const activeCategory = (categories as Category[] | null)?.find(
    (c) => c.slug === category
  );

  const withBike = (href: string) => (bikeSlug ? `${href}${href.includes("?") ? "&" : "?"}bike=${bikeSlug}` : href);

  return (
    <div className="px-4 py-10 sm:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="label-mono text-ink-soft">
            {bikeName ? "Upgrades with fitment receipts" : "New parts, warrantied"}
          </p>
          <h1 className="font-display text-5xl font-bold uppercase tracking-tight">
            {bikeName
              ? `Fits your ${bikeName}`
              : activeCategory
                ? activeCategory.name
                : "Upgrade parts"}
          </h1>
          {!bikeName && activeCategory?.description && (
            <p className="mt-2 max-w-xl text-ink-soft">
              {activeCategory.description}
            </p>
          )}
        </div>
        <BikePicker bikes={bikes ?? []} selected={bikeSlug ?? ""} />
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        <Link
          href={withBike("/parts")}
          className={`label-mono border px-3 py-2 ${
            !category
              ? "border-ink bg-ink text-paper"
              : "border-line hover:border-ink"
          }`}
        >
          All
        </Link>
        {(categories as Category[] | null)?.map((c) => (
          <Link
            key={c.id}
            href={withBike(`/parts?category=${c.slug}`)}
            className={`label-mono border px-3 py-2 ${
              category === c.slug
                ? "border-ink bg-ink text-paper"
                : "border-line hover:border-ink"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {bikeName ? (
        <>
          {verified.length > 0 && (
            <>
              <p className="label-mono mb-4 text-ink-soft">
                Verified fit — confirmed against manufacturer fitment data
              </p>
              <div className="mb-10 grid gap-px sm:grid-cols-2 lg:grid-cols-4">
                {verified.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </>
          )}
          {check.length > 0 && (
            <>
              <p className="label-mono mb-4 text-ink-soft">
                Likely fits — check your year and spec before ordering
              </p>
              <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4">
                {check.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </>
          )}
          {verified.length === 0 && check.length === 0 && (
            <p className="border border-line bg-paper-raised p-10 text-center text-ink-soft">
              No mapped upgrades for this bike{category ? " in this category" : ""}{" "}
              yet. Fitment data lands bike by bike —{" "}
              <Link href="/parts" className="text-accent underline">
                browse everything
              </Link>{" "}
              in the meantime.
            </p>
          )}
        </>
      ) : products && products.length > 0 ? (
        <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <p className="border border-line bg-paper-raised p-10 text-center text-ink-soft">
          Nothing in this category yet. Check the{" "}
          <Link href="/used" className="text-accent underline">
            used board
          </Link>{" "}
          — takeoffs land daily.
        </p>
      )}
    </div>
  );
}

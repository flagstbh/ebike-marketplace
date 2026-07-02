import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProductCard from "@/components/product-card";
import type { Category, Product } from "@/lib/types";

export const revalidate = 120;

export default async function PartsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort");

  let query = supabase
    .from("products")
    .select("*, categories!inner(slug, name)")
    .eq("source", "retail")
    .order("featured", { ascending: false })
    .order("price_cents", { ascending: false });

  if (category) {
    query = query.eq("categories.slug", category);
  }

  const { data: products } = await query;
  const activeCategory = (categories as Category[] | null)?.find(
    (c) => c.slug === category
  );

  return (
    <div className="px-4 py-10 sm:px-8">
      <div className="mb-8">
        <p className="label-mono text-ink-soft">New parts, warrantied</p>
        <h1 className="font-display text-5xl font-bold uppercase tracking-tight">
          {activeCategory ? activeCategory.name : "Upgrade parts"}
        </h1>
        {activeCategory?.description && (
          <p className="mt-2 max-w-xl text-ink-soft">
            {activeCategory.description}
          </p>
        )}
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        <Link
          href="/parts"
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
            href={`/parts?category=${c.slug}`}
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

      {products && products.length > 0 ? (
        <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4">
          {(products as Product[]).map((p) => (
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

import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import ProductCard from "@/components/product-card";
import type { Product } from "@/lib/types";
import { usd } from "@/lib/format";

export const revalidate = 60;

export default async function UsedPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("source", "trade_in")
    .order("created_at", { ascending: false });

  const list = (products as Product[] | null) ?? [];
  const inStock = list.filter((p) => p.stock > 0);
  const totalSavings = inStock.reduce(
    (sum, p) => sum + Math.max((p.compare_at_cents ?? p.price_cents) - p.price_cents, 0),
    0
  );

  return (
    <div className="px-4 py-10 sm:px-8">
      <div className="mb-10 grid border border-line bg-ink text-paper lg:grid-cols-[3fr_2fr]">
        <div className="p-8">
          <p className="label-mono text-accent">Trade-in takeoffs, graded and warrantied</p>
          <h1 className="font-display mt-2 text-5xl font-bold uppercase tracking-tight">
            The used board
          </h1>
          <p className="mt-3 max-w-xl leading-relaxed text-paper/70">
            Everything here came off a real bike, usually in its first month.
            We test it, grade it honestly, and back it for 90 days. Quantities
            are whatever came in — when it&apos;s gone, it&apos;s gone.
          </p>
          <div className="mt-6 border-t border-paper/20 pt-6">
            <span className="font-display text-5xl font-bold text-accent">
              {usd(totalSavings)}
            </span>
            <span className="label-mono mt-2 block text-paper/50">
              combined savings vs. new on today&apos;s board
            </span>
          </div>
        </div>
        <div className="relative hidden min-h-[320px] border-l border-paper/20 lg:block">
          <Image
            src="/used-receiving.jpg"
            alt="Receiving shelves of used e-bike takeoff parts, each tagged with a handwritten grade"
            fill
            sizes="40vw"
            className="object-cover"
          />
          <div className="label-mono absolute bottom-0 left-0 bg-paper px-3 py-2 text-ink">
            Every takeoff: tested, graded, tagged
          </div>
        </div>
      </div>

      <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4">
        {inStock.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {inStock.length === 0 && (
        <p className="border border-line bg-paper-raised p-10 text-center text-ink-soft">
          The board is empty right now — trade-ins are processed daily, so
          check back tomorrow.
        </p>
      )}
    </div>
  );
}

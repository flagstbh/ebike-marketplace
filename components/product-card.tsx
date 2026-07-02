import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/types";
import { CONDITION_LABELS } from "@/lib/types";
import { usd, partNumber } from "@/lib/format";

export default function ProductCard({ product }: { product: Product }) {
  const discount =
    product.compare_at_cents && product.compare_at_cents > product.price_cents
      ? Math.round(
          (1 - product.price_cents / product.compare_at_cents) * 100
        )
      : null;

  return (
    <Link
      href={`/parts/${product.slug}`}
      className="group flex flex-col border border-line bg-paper-raised transition-colors hover:border-ink"
    >
      <div className="relative aspect-[4/3] overflow-hidden border-b border-line bg-paper">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="label-mono text-ink-soft">
              {partNumber(product.slug)}
            </span>
          </div>
        )}
        {product.source === "trade_in" && (
          <span className="label-mono absolute left-0 top-3 bg-ink px-2 py-1 text-paper">
            {CONDITION_LABELS[product.condition]}
          </span>
        )}
        {discount !== null && (
          <span className="label-mono absolute right-0 top-3 bg-accent px-2 py-1 text-accent-ink">
            −{discount}%
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="label-mono text-ink-soft">{product.brand}</span>
        <span className="font-display text-lg font-semibold uppercase leading-tight">
          {product.name}
        </span>
        <div className="mt-auto flex items-baseline gap-2 pt-3">
          <span className="text-lg font-semibold">{usd(product.price_cents)}</span>
          {product.compare_at_cents &&
            product.compare_at_cents > product.price_cents && (
              <span className="text-sm text-ink-soft line-through">
                {usd(product.compare_at_cents)}
              </span>
            )}
          {product.stock <= 3 && product.stock > 0 && (
            <span className="label-mono ml-auto text-accent">
              {product.stock} left
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

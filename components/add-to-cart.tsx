"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/types";

export default function AddToCart({ product }: { product: Product }) {
  const { add, items } = useCart();
  const [added, setAdded] = useState(false);
  const inCart = items.find((i) => i.productId === product.id)?.qty ?? 0;
  const soldOut = product.stock === 0;
  const maxed = inCart >= product.stock;

  return (
    <button
      disabled={soldOut || maxed}
      onClick={() => {
        add({
          productId: product.id,
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          priceCents: product.price_cents,
          stock: product.stock,
          condition: product.condition,
        });
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
      className="w-full bg-accent px-8 py-4 text-sm font-semibold uppercase tracking-wide text-accent-ink transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-soft"
    >
      {soldOut
        ? "Sold out"
        : maxed
          ? "All stock in your cart"
          : added
            ? "Added ✓"
            : "Add to cart"}
    </button>
  );
}

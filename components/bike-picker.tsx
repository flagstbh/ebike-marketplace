"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function BikePicker({
  bikes,
}: {
  bikes: { slug: string; brand: string; model: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("bike") ?? "";

  return (
    <div>
      <label htmlFor="bike-picker" className="label-mono mb-1 block text-ink-soft">
        Show parts that fit
      </label>
      <select
        id="bike-picker"
        value={current}
        onChange={(e) => {
          const v = e.target.value;
          router.push(v ? `/parts?bike=${v}` : "/parts");
        }}
        className="border border-line bg-paper-raised px-3 py-2 text-sm outline-none focus:border-ink"
      >
        <option value="">Any bike</option>
        {bikes.map((b) => (
          <option key={b.slug} value={b.slug}>
            {b.brand} {b.model}
          </option>
        ))}
      </select>
    </div>
  );
}

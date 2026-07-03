"use client";

import { useRouter } from "next/navigation";
import { setYourBike, clearYourBike } from "@/lib/your-bike-client";

export default function BikePicker({
  bikes,
  selected = "",
}: {
  bikes: { slug: string; brand: string; model: string }[];
  selected?: string;
}) {
  const router = useRouter();

  return (
    <div>
      <label htmlFor="bike-picker" className="label-mono mb-1 block text-ink-soft">
        Show parts that fit
      </label>
      <select
        id="bike-picker"
        value={selected}
        onChange={(e) => {
          const slug = e.target.value;
          if (slug) {
            const b = bikes.find((x) => x.slug === slug);
            if (b) setYourBike(slug, `${b.brand} ${b.model}`);
            router.push(`/parts?bike=${slug}`);
          } else {
            clearYourBike();
            router.push("/parts");
          }
          router.refresh();
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

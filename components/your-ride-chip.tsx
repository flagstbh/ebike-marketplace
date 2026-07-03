"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  readYourBike,
  clearYourBike,
  useYourBikeCookie,
} from "@/lib/your-bike-client";

// Persistent "your ride" indicator in the header. Hydration-safe: the cookie
// hook's server snapshot is empty, so the chip only appears after the client
// confirms a stored bike.
export default function YourRideChip() {
  const router = useRouter();
  const cookie = useYourBikeCookie();
  const bike = cookie ? readYourBike() : null;

  if (!bike) return null;

  return (
    <div className="hidden items-center gap-2 border-l border-line px-3 text-sm sm:flex sm:px-4">
      <Link
        href={`/parts?bike=${bike.slug}`}
        className="flex items-center gap-1.5 hover:text-accent"
        title="Shop parts that fit your bike"
      >
        <span className="label-mono text-ink-soft">Your ride</span>
        <span className="font-medium">{bike.name}</span>
      </Link>
      <button
        type="button"
        aria-label="Clear your bike"
        onClick={() => {
          clearYourBike();
          router.refresh();
        }}
        className="text-ink-soft hover:text-accent"
      >
        ✕
      </button>
    </div>
  );
}

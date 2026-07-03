"use client";

import { useRouter } from "next/navigation";
import {
  readYourBike,
  setYourBike,
  clearYourBike,
  useYourBikeCookie,
} from "@/lib/your-bike-client";

export default function SetMyRide({
  slug,
  name,
}: {
  slug: string;
  name: string;
}) {
  const router = useRouter();
  // The cookie is the source of truth; hydration-safe via the shared hook.
  const cookie = useYourBikeCookie();
  const isMine = cookie ? readYourBike()?.slug === slug : false;

  function toggle() {
    if (isMine) {
      clearYourBike();
    } else {
      setYourBike(slug, name);
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`label-mono mt-4 inline-block border px-4 py-2 ${
        isMine
          ? "border-paper bg-paper text-ink"
          : "border-paper/40 text-paper hover:border-paper"
      }`}
    >
      {isMine ? "✓ Your ride" : "Set as my ride"}
    </button>
  );
}

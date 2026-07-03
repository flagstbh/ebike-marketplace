// Client-side helpers for the "your bike" cookie. The server reads the slug
// (your-bike.ts); the display name rides in a companion cookie so the header
// chip can show it without a query.
import { useSyncExternalStore } from "react";

const SLUG = "your_bike";
const NAME = "your_bike_name";
const YEAR = 60 * 60 * 24 * 365;
export const YOUR_BIKE_EVENT = "your-bike-change";

function announce() {
  window.dispatchEvent(new Event(YOUR_BIKE_EVENT));
}

export function setYourBike(slug: string, name: string) {
  document.cookie = `${SLUG}=${slug}; path=/; max-age=${YEAR}; samesite=lax`;
  document.cookie = `${NAME}=${encodeURIComponent(name)}; path=/; max-age=${YEAR}; samesite=lax`;
  announce();
}

export function clearYourBike() {
  document.cookie = `${SLUG}=; path=/; max-age=0`;
  document.cookie = `${NAME}=; path=/; max-age=0`;
  announce();
}

// Hydration-safe subscription to the cookie for client components. Returns the
// raw cookie string (a primitive, so useSyncExternalStore stays stable); parse
// it with readYourBike(). Server snapshot is empty so nothing renders until the
// client confirms.
export function useYourBikeCookie(): string {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(YOUR_BIKE_EVENT, cb);
      return () => window.removeEventListener(YOUR_BIKE_EVENT, cb);
    },
    () => document.cookie,
    () => ""
  );
}

export function readYourBike(): { slug: string; name: string } | null {
  if (typeof document === "undefined") return null;
  const jar = Object.fromEntries(
    document.cookie.split("; ").map((c) => {
      const i = c.indexOf("=");
      return [c.slice(0, i), c.slice(i + 1)];
    })
  );
  if (!jar[SLUG]) return null;
  return { slug: jar[SLUG], name: jar[NAME] ? decodeURIComponent(jar[NAME]) : jar[SLUG] };
}

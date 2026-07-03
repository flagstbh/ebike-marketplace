import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// The rider's chosen bike, persisted in a cookie so the whole experience is
// "parts for your bike" instead of a flat category browse. Set from any bike
// page or the parts picker; read server-side on parts + product pages.
export const YOUR_BIKE_COOKIE = "your_bike";

export interface YourBike {
  id: string;
  slug: string;
  brand: string;
  model: string;
}

export async function getYourBike(): Promise<YourBike | null> {
  const slug = (await cookies()).get(YOUR_BIKE_COOKIE)?.value;
  if (!slug) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("bike_models")
    .select("id, slug, brand, model")
    .eq("slug", slug)
    .single();
  return (data as YourBike) ?? null;
}

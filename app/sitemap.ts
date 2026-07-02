import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 3600;

const BASE_URL = "https://www.takeoffpartsco.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Plain client: sitemap runs outside a request, so no cookies() context.
  // Both tables are public-read under the anon key.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [{ data: products }, { data: bikes }] = await Promise.all([
    supabase.from("products").select("slug"),
    supabase.from("bike_models").select("slug"),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/parts",
    "/used",
    "/bikes",
    "/trade-in",
    "/policies",
  ].map((path) => ({ url: `${BASE_URL}${path}` }));

  return [
    ...staticRoutes,
    ...(products ?? []).map((p) => ({ url: `${BASE_URL}/parts/${p.slug}` })),
    ...(bikes ?? []).map((b) => ({ url: `${BASE_URL}/bikes/${b.slug}` })),
  ];
}

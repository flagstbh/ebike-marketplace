import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/cart"],
    },
    sitemap: "https://ebike-marketplace.vercel.app/sitemap.xml",
  };
}

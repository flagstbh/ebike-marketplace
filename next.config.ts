import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The old .vercel.app domain keeps serving after a custom domain is
      // added; without this it's duplicate content for search engines.
      {
        source: "/:path*",
        has: [{ type: "host", value: "ebike-marketplace.vercel.app" }],
        destination: "https://www.takeoffpartsco.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Visited pages stay in the browser for 3 minutes: switching tabs is instant. Any change
    // drops them (freshPages in server actions; the review screen when a session ends).
    staleTimes: { dynamic: 180, static: 180 },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default config;

import type { NextConfig } from "next";

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_SOCCIT_API_BASE_URL ??
  "https://13.213.196.237.sslip.io"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    root: ".",
  },
  images: {
    localPatterns: [
      {
        pathname: "/api/assets/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/assets/:path*",
        destination: `${apiBaseUrl}/api/assets/:path*`,
      },
    ];
  },
};

export default nextConfig;

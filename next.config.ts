import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    root: ".",
  },
  images: {
    localPatterns: [
      {
        pathname: "/assets/cards/**",
      },
    ],
  },
};

export default nextConfig;

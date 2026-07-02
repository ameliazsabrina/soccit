import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: ".",
  },
  images: {
    localPatterns: [
      {
        pathname: "/assets/**",
      },
      {
        pathname: "/avatars/**",
      },
      {
        pathname: "/field.webp",
      },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "flagcdn.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;

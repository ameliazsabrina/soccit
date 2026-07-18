import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/landing",
        destination: "/",
        permanent: true,
      },
      {
        source: "/matches/:path*",
        destination: "https://play.soccit.fun/matches/:path*",
        permanent: true,
      },
      {
        source: "/explorer/:path*",
        destination: "https://play.soccit.fun/explorer/:path*",
        permanent: true,
      },
      {
        source: "/leaderboard/:path*",
        destination: "https://play.soccit.fun/leaderboard/:path*",
        permanent: true,
      },
      {
        source: "/profile/:path*",
        destination: "https://play.soccit.fun/profile/:path*",
        permanent: true,
      },
    ];
  },
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

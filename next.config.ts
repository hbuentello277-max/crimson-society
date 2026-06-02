import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_BUILD_COMMIT: process.env.VERCEL_GIT_COMMIT_SHA || "local",
    NEXT_PUBLIC_PUSH_CLIENT_BUILD: "push-v4",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "clelrausyoejbpqlxplf.supabase.co",
        port: "",
        pathname: "/storage/v1/**",
      },
    ],
    formats: ["image/webp"],
    minimumCacheTTL: 31536000,
  },
};

export default nextConfig;

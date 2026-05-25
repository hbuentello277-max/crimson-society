import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

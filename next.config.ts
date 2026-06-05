import type { NextConfig } from "next";

function supabaseImageHostname(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const supabaseHost = supabaseImageHostname();

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
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              port: "",
              pathname: "/storage/v1/**",
            },
          ]
        : []),
    ],
    formats: ["image/webp"],
    minimumCacheTTL: 31536000,
  },
};

export default nextConfig;

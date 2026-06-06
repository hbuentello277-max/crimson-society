import { NextResponse } from "next/server";
import {
  NEXUS_OWNER_API_READ_LIMIT,
  NEXUS_OWNER_API_WINDOW_MS,
  NEXUS_OWNER_API_WRITE_LIMIT,
} from "@/lib/nexus/constants";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

/**
 * Mark I in-memory sliding window rate limiter for owner API routes.
 * Replace with Redis / Upstash for distributed limits in multi-instance deploys.
 */
const buckets = new Map<string, RateLimitBucket>();

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

type RateLimitOptions = {
  limit?: number;
  windowMs?: number;
};

export function checkOwnerApiRateLimit(
  key: string,
  options?: RateLimitOptions,
): RateLimitResult {
  const limit = options?.limit ?? NEXUS_OWNER_API_READ_LIMIT;
  const windowMs = options?.windowMs ?? NEXUS_OWNER_API_WINDOW_MS;
  const now = Date.now();

  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  bucket.count += 1;
  return { allowed: true };
}

export function checkOwnerApiReadRateLimit(ownerId: string): RateLimitResult {
  return checkOwnerApiRateLimit(`owner-read:${ownerId}`, {
    limit: NEXUS_OWNER_API_READ_LIMIT,
    windowMs: NEXUS_OWNER_API_WINDOW_MS,
  });
}

export function checkOwnerApiWriteRateLimit(ownerId: string): RateLimitResult {
  return checkOwnerApiRateLimit(`owner-write:${ownerId}`, {
    limit: NEXUS_OWNER_API_WRITE_LIMIT,
    windowMs: NEXUS_OWNER_API_WINDOW_MS,
  });
}

export function ownerRateLimitResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: "Too Many Requests" },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    },
  );
}

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireOwnerSession } from "@/lib/nexus/auth";
import {
  checkOwnerApiReadRateLimit,
  checkOwnerApiWriteRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";

type OwnerSession = {
  userId: string;
  supabase: SupabaseClient;
};

type OwnerReadHandler = (session: OwnerSession) => Promise<Response>;
type OwnerWriteHandler = (session: OwnerSession, request: Request) => Promise<Response>;

export function ownerReadRoute(
  handler: OwnerReadHandler,
  errorMessage = "Failed to load Nexus resource.",
): () => Promise<Response> {
  return async () => {
    const auth = await requireOwnerSession();
    if ("error" in auth) {
      return auth.error;
    }

    const { session } = auth;
    const rateLimit = checkOwnerApiReadRateLimit(session.userId);
    if (!rateLimit.allowed) {
      return ownerRateLimitResponse(rateLimit.retryAfterSeconds);
    }

    try {
      return await handler({
        userId: session.userId,
        supabase: session.supabase,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : errorMessage;
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

export function ownerWriteRoute(
  handler: OwnerWriteHandler,
  errorMessage = "Failed to update Nexus resource.",
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const auth = await requireOwnerSession();
    if ("error" in auth) {
      return auth.error;
    }

    const { session } = auth;
    const rateLimit = checkOwnerApiWriteRateLimit(session.userId);
    if (!rateLimit.allowed) {
      return ownerRateLimitResponse(rateLimit.retryAfterSeconds);
    }

    try {
      return await handler(
        {
          userId: session.userId,
          supabase: session.supabase,
        },
        request,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : errorMessage;
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

export function nexusOk<T extends Record<string, unknown>>(payload: T): NextResponse {
  return NextResponse.json({ ok: true, ...payload });
}

import { NextResponse } from "next/server";
import {
  checkOwnerApiReadRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";
import { requireCrossSystemIntelligenceReader } from "@/lib/cross-system-intelligence/permissions";

type IntelligenceReadHandler = (input: {
  userId: string;
  supabase: import("@supabase/supabase-js").SupabaseClient;
  access: "owner" | "admin";
  request: Request;
}) => Promise<Response>;

export function crossSystemIntelligenceReadRoute(
  handler: IntelligenceReadHandler,
  errorMessage = "Failed to load Platform Intelligence.",
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const auth = await requireCrossSystemIntelligenceReader();
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
        access: session.access,
        request,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : errorMessage;
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

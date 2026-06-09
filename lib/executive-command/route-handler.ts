import { NextResponse } from "next/server";
import {
  checkOwnerApiReadRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";
import { requireExecutiveCommandReader } from "@/lib/executive-command/permissions";

type ExecutiveReadHandler = (input: {
  userId: string;
  supabase: import("@supabase/supabase-js").SupabaseClient;
  access: "owner" | "admin";
}) => Promise<Response>;

export function executiveCommandReadRoute(
  handler: ExecutiveReadHandler,
  errorMessage = "Failed to load Executive Command Center.",
): () => Promise<Response> {
  return async () => {
    const auth = await requireExecutiveCommandReader();
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
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : errorMessage;
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

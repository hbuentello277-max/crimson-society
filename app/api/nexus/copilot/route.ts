import { NextResponse } from "next/server";
import { getNexusCopilot } from "@/lib/copilot/engine";
import { requireOwnerSession } from "@/lib/nexus/auth";
import {
  checkOwnerApiReadRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
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
    const copilot = await getNexusCopilot(session.supabase);

    return NextResponse.json({
      ok: true,
      generated_at: copilot.generated_at,
      guidance: copilot.guidance,
      daily_focus: copilot.daily_focus,
      top_opportunity: copilot.top_opportunity,
      top_risk: copilot.top_risk,
      improving_signals: copilot.improving_signals,
      declining_signals: copilot.declining_signals,
      recommended_next_steps: copilot.recommended_next_steps,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Founder Copilot.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

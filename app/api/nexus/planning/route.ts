import { NextResponse } from "next/server";
import { getNexusPlanning } from "@/lib/planning/engine";
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
    const planning = await getNexusPlanning(session.supabase);

    return NextResponse.json({
      ok: true,
      generated_at: planning.generated_at,
      brief: planning.brief,
      weekly_objectives: planning.weekly_objectives,
      monthly_objectives: planning.monthly_objectives,
      priorities: planning.priorities,
      risks: planning.risks,
      opportunities: planning.opportunities,
      goal_status: planning.goal_status,
      counts: planning.counts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Nexus planning.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

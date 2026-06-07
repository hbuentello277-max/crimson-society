import { NextResponse } from "next/server";
import { requireOwnerSession } from "@/lib/nexus/auth";
import { getMissionHealthSnapshot } from "@/lib/mission-health/summary";
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
    const snapshot = await getMissionHealthSnapshot(session.supabase);

    return NextResponse.json({
      ok: true,
      score: snapshot.score,
      status: snapshot.status,
      mission_critical: snapshot.mission_critical,
      checked_at: snapshot.checked_at,
      workflows: snapshot.workflows.map((workflow) => ({
        slug: workflow.slug,
        display_name: workflow.display_name,
        category: workflow.category,
        weight: workflow.weight,
        workflow_status: workflow.workflow_status,
        workflow_score: workflow.workflow_score,
        last_check_at: workflow.last_check_at,
        last_success_at: workflow.last_success_at,
        failure_count_1h: workflow.failure_count_1h,
        success_count_1h: workflow.success_count_1h,
        success_rate_1h: workflow.success_rate_1h,
        check: workflow.check,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load platform status.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

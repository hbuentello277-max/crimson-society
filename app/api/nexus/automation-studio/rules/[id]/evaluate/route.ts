import { NextResponse } from "next/server";
import { evaluateAutomationRule } from "@/lib/automation-studio/evaluator";
import {
  canEvaluateAutomationRules,
  requireAutomationStudioReader,
} from "@/lib/automation-studio/permissions";
import {
  checkOwnerApiWriteRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";
import { nexusOk } from "@/lib/nexus/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAutomationStudioReader();
  if ("error" in auth) {
    return auth.error;
  }

  const { session } = auth;
  if (!canEvaluateAutomationRules(session.access)) {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  const rateLimit = checkOwnerApiWriteRateLimit(session.userId);
  if (!rateLimit.allowed) {
    return ownerRateLimitResponse(rateLimit.retryAfterSeconds);
  }

  const { id } = await context.params;

  try {
    const result = await evaluateAutomationRule(session.supabase, session.userId, id);
    return nexusOk({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to evaluate automation rule.";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

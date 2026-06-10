import { NextResponse } from "next/server";
import { evaluateActiveAutomationRules } from "@/lib/automation-studio/evaluator";
import {
  canEvaluateAutomationRules,
  requireAutomationStudioReader,
} from "@/lib/automation-studio/permissions";
import { getAutomationStudioSummary } from "@/lib/automation-studio/summary";
import {
  checkOwnerApiReadRateLimit,
  checkOwnerApiWriteRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";
import { nexusOk } from "@/lib/nexus/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAutomationStudioReader();
  if ("error" in auth) {
    return auth.error;
  }

  const { session } = auth;
  const rateLimit = checkOwnerApiReadRateLimit(session.userId);
  if (!rateLimit.allowed) {
    return ownerRateLimitResponse(rateLimit.retryAfterSeconds);
  }

  try {
    const summary = await getAutomationStudioSummary(session.supabase, {
      readOnly: session.access === "admin",
    });
    return nexusOk({ summary });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Automation Studio.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
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

  try {
    const results = await evaluateActiveAutomationRules(session.supabase, session.userId);
    return nexusOk({ results });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to evaluate automation rules.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

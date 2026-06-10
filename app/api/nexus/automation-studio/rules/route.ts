import { NextResponse } from "next/server";
import { createAutomationRule } from "@/lib/automation-studio/manager";
import {
  canMutateAutomationRules,
  requireAutomationStudioReader,
} from "@/lib/automation-studio/permissions";
import type { CreateAutomationRuleInput } from "@/lib/automation-studio/types";
import {
  checkOwnerApiWriteRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";
import { nexusOk } from "@/lib/nexus/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAutomationStudioReader();
  if ("error" in auth) {
    return auth.error;
  }

  const { session } = auth;
  if (!canMutateAutomationRules(session.access)) {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  const rateLimit = checkOwnerApiWriteRateLimit(session.userId);
  if (!rateLimit.allowed) {
    return ownerRateLimitResponse(rateLimit.retryAfterSeconds);
  }

  let body: CreateAutomationRuleInput;
  try {
    body = (await request.json()) as CreateAutomationRuleInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const rule = await createAutomationRule(session.supabase, session.userId, body);
    return nexusOk({ rule });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create automation rule.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

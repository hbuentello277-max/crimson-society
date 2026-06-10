import { NextResponse } from "next/server";
import { updateAutomationRule } from "@/lib/automation-studio/manager";
import {
  canMutateAutomationRules,
  requireAutomationStudioReader,
} from "@/lib/automation-studio/permissions";
import type { UpdateAutomationRuleInput } from "@/lib/automation-studio/types";
import {
  checkOwnerApiWriteRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";
import { nexusOk } from "@/lib/nexus/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
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

  const { id } = await context.params;

  let body: UpdateAutomationRuleInput;
  try {
    body = (await request.json()) as UpdateAutomationRuleInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const rule = await updateAutomationRule(session.supabase, session.userId, id, body);
    return nexusOk({ rule });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update automation rule.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

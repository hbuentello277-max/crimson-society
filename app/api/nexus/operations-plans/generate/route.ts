import { NextResponse } from "next/server";
import { generateOperationsPlan } from "@/lib/operations-planner/engine";
import { createActionDraftsFromOperationsPlan } from "@/lib/operations-planner/action-integration";
import { OPERATIONS_PLAN_TYPES } from "@/lib/operations-planner/types";
import type { OperationsPlanType } from "@/lib/operations-planner/types";
import { nexusOk, ownerWriteRoute } from "@/lib/nexus/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PLAN_TYPE_SET = new Set<string>(OPERATIONS_PLAN_TYPES);

function parsePlanType(value: unknown): OperationsPlanType | undefined {
  return typeof value === "string" && PLAN_TYPE_SET.has(value)
    ? (value as OperationsPlanType)
    : undefined;
}

export const POST = ownerWriteRoute(async ({ supabase, userId }, request) => {
  const body = (await request.json().catch(() => ({}))) as {
    planType?: string;
    transcript?: string;
    createActionDrafts?: boolean;
  };

  const result = await generateOperationsPlan(supabase, {
    ownerId: userId,
    planType: parsePlanType(body.planType),
    transcript: typeof body.transcript === "string" ? body.transcript : undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  if (body.createActionDrafts) {
    const drafts = await createActionDraftsFromOperationsPlan(supabase, {
      ownerId: userId,
      planId: result.plan.id,
    });

    if (!drafts.ok) {
      return NextResponse.json({ error: drafts.error }, { status: 500 });
    }

    return nexusOk({
      plan: result.plan,
      action_drafts: drafts.created,
      readOnly: true as const,
    });
  }

  return nexusOk({ plan: result.plan, readOnly: true as const });
});

import { getCrossSystemIntelligenceSummary } from "@/lib/cross-system-intelligence/engine";
import { computeLaunchReadiness } from "@/lib/proactive-intelligence/launch-readiness";
import { estimatePlanConfidence, estimatePlanImpact } from "@/lib/operations-planner/impact-estimator";
import { resolvePlanPriority } from "@/lib/operations-planner/prioritization";
import { PLAN_TEMPLATES, templateStepsForType } from "@/lib/operations-planner/templates";
import type {
  GenerateOperationsPlanInput,
  OperationsPlan,
  OperationsPlanStatus,
  OperationsPlanType,
} from "@/lib/operations-planner/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export function resolvePlanTypeFromTranscript(transcript: string): OperationsPlanType | null {
  const normalized = transcript.trim().toLowerCase();
  if (!normalized) return null;

  if (/\bincident response\b/i.test(normalized) || /\bincident plan\b/i.test(normalized)) {
    return "incident";
  }
  if (/\brevenue recovery\b/i.test(normalized) || /\brevenue plan\b/i.test(normalized)) {
    return "revenue";
  }
  if (/\blaunch plan\b/i.test(normalized) || /\blaunch readiness plan\b/i.test(normalized)) {
    return "launch";
  }
  if (/\bblackcard growth\b/i.test(normalized) || /\bmembership plan\b/i.test(normalized)) {
    return "membership";
  }
  if (/\bgrowth plan\b/i.test(normalized) || /\bfounder action plan\b/i.test(normalized)) {
    return "growth";
  }
  if (/\bwhat should happen next\b/i.test(normalized) || /\boperations plan\b/i.test(normalized)) {
    return null;
  }

  return null;
}

export async function inferPlanType(
  supabase: SupabaseClient,
  transcript?: string,
): Promise<OperationsPlanType> {
  const explicit = transcript ? resolvePlanTypeFromTranscript(transcript) : null;
  if (explicit) return explicit;

  const summary = await getCrossSystemIntelligenceSummary(supabase, { access: "owner" });

  if ((summary.risks[0]?.impact_score ?? 0) >= 85 && summary.risks[0]?.domain === "platform") {
    return "incident";
  }
  if (summary.risks.some((risk) => risk.domain === "revenue")) {
    return "revenue";
  }

  const launchReadiness = await computeLaunchReadiness(supabase);
  if (launchReadiness.score < 80 || launchReadiness.blockers.length > 0) {
    return "launch";
  }

  if (summary.risks.some((risk) => risk.domain === "membership") || /\bblackcard\b/i.test(transcript ?? "")) {
    return "membership";
  }

  if (summary.opportunities.length > 0) {
    return "growth";
  }

  return "growth";
}

export async function buildOperationsPlanDraft(
  supabase: SupabaseClient,
  input: GenerateOperationsPlanInput,
): Promise<Omit<OperationsPlan, "id" | "created_at" | "updated_at">> {
  const planType =
    input.planType ?? (await inferPlanType(supabase, input.transcript));
  const template = PLAN_TEMPLATES[planType];
  const summary = await getCrossSystemIntelligenceSummary(supabase, { access: "owner" });
  const launchReadiness = await computeLaunchReadiness(supabase);

  const topRisk = summary.risks[0];
  const topOpportunity = summary.opportunities[0];
  const signalCount =
    summary.risks.length + summary.opportunities.length + summary.correlations.length;
  const confidence = estimatePlanConfidence({
    signalCount,
    partial: Boolean(summary.partial),
  });
  const estimatedImpact = estimatePlanImpact({
    planType,
    confidence,
    riskImpact: topRisk?.impact_score,
    opportunityImpact: topOpportunity?.impact_score,
    launchScore: launchReadiness.score,
  });
  const priority = resolvePlanPriority({
    planType,
    riskImpact: topRisk?.impact_score,
    opportunityImpact: topOpportunity?.impact_score,
    launchScore: launchReadiness.score,
    openIncidents: summary.risks.filter((risk) => risk.title.toLowerCase().includes("incident")).length,
  });

  const reasonParts = [
    topRisk ? `Primary risk: ${topRisk.summary}` : null,
    topOpportunity ? `Primary opportunity: ${topOpportunity.summary}` : null,
    planType === "launch"
      ? `Launch readiness is ${launchReadiness.score}/100 (${launchReadiness.status}).`
      : null,
    input.transcript ? `Requested via: "${input.transcript.trim().slice(0, 120)}".` : null,
  ].filter(Boolean);

  const status: OperationsPlanStatus =
    priority === "critical" || priority === "high" ? "review_required" : "pending_approval";

  return {
    plan_type: planType,
    title: template.title,
    objective: template.objective,
    priority,
    confidence_score: confidence,
    estimated_impact_score: estimatedImpact,
    reason: reasonParts.join(" ") || template.objective,
    steps: templateStepsForType(planType),
    related_risks: summary.risks.slice(0, 4).map((risk) => ({
      id: risk.id,
      title: risk.title,
      summary: risk.summary,
    })),
    related_opportunities: summary.opportunities.slice(0, 4).map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
    })),
    suggested_action_drafts: template.suggested_drafts.map((draft) => ({
      action_type: draft.action_type,
      title: draft.title,
      reason:
        topRisk?.summary ??
        topOpportunity?.summary ??
        "Prepared from Operations Planner for founder review.",
    })),
    status,
    created_by_label: "NEXUS",
    created_by_user_id: input.ownerId,
    metadata: {
      source: "operations_planner",
      transcript: input.transcript ?? null,
      launch_readiness_score: launchReadiness.score,
    },
  };
}

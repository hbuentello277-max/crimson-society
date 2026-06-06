import type { NexusSeverity } from "@/lib/nexus/constants";
import type { AlertRuleRow } from "@/lib/alerts/types";

const MEMBER_BLOCKING_WORKFLOWS = new Set([
  "user_signup",
  "user_login",
  "messaging",
  "blackcard_purchase",
]);

const CATEGORY_BONUS: Record<string, number> = {
  mission: 15,
  revenue: 12,
  commerce: 12,
  security: 10,
  infra: 8,
  growth: 5,
  recovery: 0,
};

function severityBase(severity: NexusSeverity, category: string): number {
  if (category === "recovery") {
    return 8;
  }

  if (severity === "critical") {
    return 75;
  }

  if (severity === "warning") {
    return 50;
  }

  return 15;
}

function durationBonus(firstSeenAt: string | null, evaluatedAt: string): number {
  if (!firstSeenAt) {
    return 0;
  }

  const minutes = Math.max(0, (new Date(evaluatedAt).getTime() - new Date(firstSeenAt).getTime()) / 60_000);
  return Math.min(15, Math.floor(minutes / 10));
}

export function computeImpactScore(input: {
  severity: NexusSeverity;
  category: string;
  scope: string;
  scope_id: string;
  evaluated_at: string;
  first_seen_at?: string | null;
  failing_workflow_count?: number;
  down_integration_count?: number;
  metric_delta_pct?: number | null;
}): number {
  let score = severityBase(input.severity, input.category);
  score += CATEGORY_BONUS[input.category] ?? 0;

  if (input.scope === "workflow" && MEMBER_BLOCKING_WORKFLOWS.has(input.scope_id)) {
    score += 10;
  }

  if ((input.failing_workflow_count ?? 0) >= 2) {
    score += Math.min(10, ((input.failing_workflow_count ?? 0) - 1) * 5);
  }

  if ((input.down_integration_count ?? 0) >= 2) {
    score += 8;
  }

  if (input.metric_delta_pct !== null && input.metric_delta_pct !== undefined) {
    const drop = Math.abs(input.metric_delta_pct);
    if (drop >= 20) {
      score += 10;
    } else if (drop >= 10) {
      score += 5;
    }
  }

  score += durationBonus(input.first_seen_at ?? null, input.evaluated_at);

  return Math.max(1, Math.min(100, Math.round(score)));
}

export function computeImpactForRuleMatch(input: {
  rule: AlertRuleRow;
  scope: string;
  scope_id: string;
  evaluated_at: string;
  first_seen_at?: string | null;
  context: {
    failing_workflow_count: number;
    down_integration_count: number;
    metric_delta_pct?: number | null;
  };
}): number {
  return computeImpactScore({
    severity: input.rule.severity,
    category: input.rule.category,
    scope: input.scope,
    scope_id: input.scope_id,
    evaluated_at: input.evaluated_at,
    first_seen_at: input.first_seen_at,
    failing_workflow_count: input.context.failing_workflow_count,
    down_integration_count: input.context.down_integration_count,
    metric_delta_pct: input.context.metric_delta_pct,
  });
}

import type {
  AlertEvaluationContext,
  RecoveryCandidate,
  ScopeState,
} from "@/lib/alerts/types";
import { buildDedupeKey, buildRecoveryDedupeKey, buildRecoveryNoticeDedupeKey } from "@/lib/alerts/deduplication";

type ActiveAlertLookup = {
  id: string;
  rule_id: string | null;
  dedupe_key: string | null;
};

function parseScopeKey(key: string): { scope: string; scope_id: string } | null {
  const idx = key.indexOf(":");
  if (idx <= 0) {
    return null;
  }

  return {
    scope: key.slice(0, idx),
    scope_id: key.slice(idx + 1),
  };
}

function inferPairedRuleId(scope: string, scopeId: string, previousStatus?: string): string {
  if (scope === "integration") {
    return previousStatus === "degraded" ? "health.integration.degraded" : "health.integration.down";
  }

  if (scope === "workflow") {
    if (scopeId === "user_signup") {
      return "mission.signup.blocked";
    }
    if (scopeId === "blackcard_purchase") {
      return "mission.blackcard.blocked";
    }
    if (scopeId === "messaging") {
      return "mission.messaging.blocked";
    }
    return previousStatus === "degraded" ? "mission.workflow.degraded" : "mission.workflow.failing";
  }

  if (scope === "global" && scopeId === "mission.health_score") {
    return previousStatus && Number(previousStatus) < 50
      ? "mission.score.critical"
      : "mission.score.degraded";
  }

  if (scope === "global") {
    return `${scopeId}.recovered`;
  }

  if (scope === "source") {
    return "stripe.webhook.failures";
  }

  if (scope === "deployment") {
    return "deploy.production.failed";
  }

  return `recovery.${scope}.${scopeId}`;
}

function currentStatusLabel(
  context: AlertEvaluationContext,
  scope: string,
  scopeId: string,
): string {
  if (scope === "integration") {
    return context.integrations[scopeId]?.status ?? "unknown";
  }

  if (scope === "workflow") {
    return context.mission_workflows[scopeId]?.status ?? "unknown";
  }

  if (scope === "global" && scopeId === "mission.health_score") {
    return context.mission_score === null ? "unknown" : String(context.mission_score);
  }

  if (scope === "global") {
    return String(context.metrics[scopeId]?.value ?? "unknown");
  }

  if (scope === "deployment") {
    return context.deployments.find((row) => row.id === scopeId)?.status ?? "resolved";
  }

  return "recovered";
}

export function detectRecoveries(input: {
  previous_state: Record<string, ScopeState>;
  context: AlertEvaluationContext;
  active_alerts: ActiveAlertLookup[];
}): RecoveryCandidate[] {
  const recoveries: RecoveryCandidate[] = [];
  const evaluatedAt = input.context.evaluated_at;

  for (const [key, previous] of Object.entries(input.previous_state)) {
    if (!previous.was_bad) {
      continue;
    }

    const current = input.context.evaluation_state[key];
    if (!current || current.was_bad) {
      continue;
    }

    const parsed = parseScopeKey(key);
    if (!parsed) {
      continue;
    }

    const { scope, scope_id } = parsed;
    const pairedRuleId = inferPairedRuleId(scope, scope_id, previous.last_status);
    const dedupe_key = buildDedupeKey({
      rule_id: pairedRuleId,
      scope,
      scope_id,
    });
    const originalAlert =
      input.active_alerts.find((alert) => alert.dedupe_key === dedupe_key) ?? null;

    const badSince = previous.bad_since ?? evaluatedAt;
    const durationMinutes = Math.max(
      1,
      Math.round((new Date(evaluatedAt).getTime() - new Date(badSince).getTime()) / 60_000),
    );

    const currentStatus = currentStatusLabel(input.context, scope, scope_id);
    const title =
      scope === "integration"
        ? `${scope_id} integration recovered`
        : scope === "workflow"
          ? `${scope_id} workflow recovered`
          : `${scope_id} recovered`;

    recoveries.push({
      paired_rule_id: pairedRuleId,
      scope,
      scope_id,
      dedupe_key,
      recovery_dedupe_key: buildRecoveryNoticeDedupeKey(dedupe_key),
      title,
      message: `Condition cleared after ${durationMinutes} minutes. Status is now ${currentStatus}.`,
      previous_status: previous.last_status ?? "bad",
      current_status: currentStatus,
      duration_minutes: durationMinutes,
      original_alert_id: originalAlert?.id ?? null,
      evidence: {
        scope,
        scope_id,
        previous_status: previous.last_status ?? null,
        current_status: currentStatus,
        duration_minutes: durationMinutes,
        paired_rule_id: pairedRuleId,
      },
    });
  }

  return recoveries;
}

export function buildRecoveryEventDedupeKey(recovery: RecoveryCandidate): string {
  return buildRecoveryDedupeKey(recovery.dedupe_key);
}

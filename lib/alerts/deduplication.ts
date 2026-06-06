import type { AlertRuleRow } from "@/lib/alerts/types";

export function buildDedupeKey(input: {
  rule_id: string;
  scope: string;
  scope_id: string;
}): string {
  return `${input.rule_id}:${input.scope}:${input.scope_id}`;
}

export function buildRecoveryDedupeKey(originalDedupeKey: string): string {
  return `recovery:${originalDedupeKey}`;
}

export function buildRecoveryNoticeDedupeKey(originalDedupeKey: string): string {
  return `recovery:notice:${originalDedupeKey}`;
}

export function scopeKey(scope: string, scopeId: string): string {
  return `${scope}:${scopeId}`;
}

export function inferScopeFromRule(rule: AlertRuleRow, scopeId: string): { scope: string; scope_id: string } {
  const condition = rule.condition;

  if (condition.type === "integration_status" || condition.integration_slug) {
    return { scope: "integration", scope_id: scopeId };
  }

  if (condition.type === "workflow_slug" || condition.type === "workflow_status") {
    return { scope: "workflow", scope_id: scopeId };
  }

  if (condition.type === "deployment_status") {
    return { scope: "deployment", scope_id: scopeId };
  }

  if (condition.metric_key || condition.type === "threshold") {
    return { scope: "global", scope_id: condition.metric_key ?? scopeId };
  }

  return { scope: "global", scope_id: scopeId };
}

import type { AlertRuleRow } from "@/lib/alerts/types";

export function isWithinCooldown(input: {
  rule: AlertRuleRow;
  lastFiredAt: string | null;
  now?: Date;
}): boolean {
  const { rule, lastFiredAt } = input;
  if (!lastFiredAt || rule.cooldown_minutes <= 0) {
    return false;
  }

  const now = input.now ?? new Date();
  const last = new Date(lastFiredAt);
  const elapsedMs = now.getTime() - last.getTime();
  return elapsedMs < rule.cooldown_minutes * 60_000;
}

export function getRuleLastFiredAt(rule: AlertRuleRow): string | null {
  const fromMetadata = rule.metadata?.last_fired_at;
  if (typeof fromMetadata === "string" && fromMetadata.trim()) {
    return fromMetadata;
  }
  return null;
}

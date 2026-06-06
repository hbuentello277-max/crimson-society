import { createNexusServiceClient } from "@/lib/nexus/client";
import { emitNexusEvent } from "@/lib/events/emit";
import { logNexusActivity } from "@/lib/nexus/activity-log";
import {
  buildAlertEvaluationContext,
  countDownIntegrations,
  countFailingWorkflows,
  loadAlertRules,
} from "@/lib/alerts/context";
import { getRuleLastFiredAt, isWithinCooldown } from "@/lib/alerts/cooldown";
import { buildDedupeKey } from "@/lib/alerts/deduplication";
import { evaluateAlertRule, isRecoveryRule } from "@/lib/alerts/evaluator";
import {
  emitRuleSkippedEvent,
  processRecovery,
  upsertFiringAlert,
} from "@/lib/alerts/generator";
import { computeImpactForRuleMatch } from "@/lib/alerts/impact";
import { detectRecoveries } from "@/lib/alerts/recovery";
import type { AlertRuleRow, NexusAlertEngineResult, ScopeState } from "@/lib/alerts/types";

function cloneScopeState(state: Record<string, ScopeState>): Record<string, ScopeState> {
  return JSON.parse(JSON.stringify(state)) as Record<string, ScopeState>;
}

async function persistEvaluationState(
  admin: ReturnType<typeof createNexusServiceClient>,
  rules: AlertRuleRow[],
  evaluationState: Record<string, ScopeState>,
): Promise<void> {
  await Promise.all(
    rules.map((rule) =>
      admin
        .from("nexus_alert_rules")
        .update({
          metadata: {
            ...rule.metadata,
            evaluation_state: evaluationState,
          },
        })
        .eq("id", rule.id),
    ),
  );
}

async function markRuleFired(
  admin: ReturnType<typeof createNexusServiceClient>,
  rule: AlertRuleRow,
  firedAt: string,
): Promise<void> {
  await admin
    .from("nexus_alert_rules")
    .update({
      metadata: {
        ...rule.metadata,
        last_fired_at: firedAt,
      },
    })
    .eq("id", rule.id);

  rule.metadata.last_fired_at = firedAt;
}

export async function runNexusAlertEngine(): Promise<NexusAlertEngineResult> {
  const evaluatedAt = new Date().toISOString();
  const admin = createNexusServiceClient();

  try {
    const rules = await loadAlertRules(admin);
    const firingRules = rules.filter((rule) => !isRecoveryRule(rule));
    const context = await buildAlertEvaluationContext(admin, rules);
    const previousState = cloneScopeState(context.evaluation_state);

    const { data: activeAlerts } = await admin
      .from("nexus_alerts")
      .select("id, rule_id, dedupe_key")
      .in("status", ["active", "acknowledged"]);

    let rulesEvaluated = 0;
    let alertsCreated = 0;
    let alertsUpdated = 0;
    let alertsResolved = 0;
    let recoveriesEmitted = 0;
    let eventsEmitted = 0;
    const rulesSkipped: Array<{ rule_id: string; reason: string }> = [];

    const failingWorkflowCount = countFailingWorkflows(context);
    const downIntegrationCount = countDownIntegrations(context);

    for (const rule of firingRules) {
      rulesEvaluated += 1;
      const outcomes = evaluateAlertRule(rule, context);

      for (const outcome of outcomes) {
        if (outcome.kind === "skipped") {
          rulesSkipped.push({ rule_id: rule.rule_id, reason: outcome.reason });
          const emitted = await emitRuleSkippedEvent(admin, rule.rule_id, outcome.reason);
          if (emitted) {
            eventsEmitted += 1;
          }
          continue;
        }

        if (outcome.kind === "no_match") {
          continue;
        }

        const match = outcome.match;
        const dedupe_key = buildDedupeKey({
          rule_id: rule.rule_id,
          scope: match.scope,
          scope_id: match.scope_id,
        });

        const { data: recentAlert } = await admin
          .from("nexus_alerts")
          .select("updated_at")
          .eq("dedupe_key", dedupe_key)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const lastFiredAt =
          (recentAlert?.updated_at as string | undefined) ?? getRuleLastFiredAt(rule);

        if (isWithinCooldown({ rule, lastFiredAt })) {
          continue;
        }

        const impact_score = computeImpactForRuleMatch({
          rule,
          scope: match.scope,
          scope_id: match.scope_id,
          evaluated_at: context.evaluated_at,
          context: {
            failing_workflow_count: failingWorkflowCount,
            down_integration_count: downIntegrationCount,
            metric_delta_pct:
              typeof match.evidence.delta_pct === "number"
                ? (match.evidence.delta_pct as number)
                : null,
          },
        });

        const result = await upsertFiringAlert(admin, {
          rule,
          scope: match.scope,
          scope_id: match.scope_id,
          dedupe_key,
          category: rule.category,
          severity: rule.severity,
          title: match.title,
          message: match.message,
          evidence: match.evidence,
          impact_score,
          integration_id: match.integration_id,
        });

        if (result.action === "created") {
          alertsCreated += 1;
        } else {
          alertsUpdated += 1;
        }

        if (result.eventEmitted) {
          eventsEmitted += 1;
        }

        await markRuleFired(admin, rule, evaluatedAt);
      }
    }

    const recoveries = detectRecoveries({
      previous_state: previousState,
      context,
      active_alerts: (activeAlerts ?? []).map((row) => ({
        id: row.id as string,
        rule_id: (row.rule_id as string | null) ?? null,
        dedupe_key: (row.dedupe_key as string | null) ?? null,
      })),
    });

    for (const recovery of recoveries) {
      const result = await processRecovery(admin, recovery);
      if (result.resolved) {
        alertsResolved += 1;
      }
      if (result.eventEmitted) {
        recoveriesEmitted += 1;
        eventsEmitted += 1;
      }
    }

    await persistEvaluationState(admin, rules, context.evaluation_state);

    const summaryEvent = await emitNexusEvent({
      source: "collector",
      category: "infra",
      eventType: "alert.evaluation.completed",
      severity: "info",
      title: "Nexus alert evaluation completed",
      description: `Evaluated ${rulesEvaluated} rules; created ${alertsCreated}, updated ${alertsUpdated}, recovered ${recoveriesEmitted}`,
      payload: {
        rules_evaluated: rulesEvaluated,
        alerts_created: alertsCreated,
        alerts_updated: alertsUpdated,
        alerts_resolved: alertsResolved,
        recoveries_emitted: recoveriesEmitted,
        rules_skipped: rulesSkipped,
      },
      occurredAt: evaluatedAt,
    });

    if (summaryEvent.ok) {
      eventsEmitted += 1;
    }

    await logNexusActivity({
      actorType: "collector",
      action: "nexus.alert_evaluation.completed",
      targetType: "nexus",
      details: {
        rules_evaluated: rulesEvaluated,
        alerts_created: alertsCreated,
        alerts_updated: alertsUpdated,
        alerts_resolved: alertsResolved,
        recoveries_emitted: recoveriesEmitted,
        rules_skipped: rulesSkipped,
      },
    });

    return {
      ok: true,
      evaluatedAt,
      rulesEvaluated,
      rulesSkipped,
      alertsCreated,
      alertsUpdated,
      alertsResolved,
      recoveriesEmitted,
      eventsEmitted,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "alert engine failed";
    console.error("[nexus-alerts] engine error", message);

    return {
      ok: false,
      evaluatedAt,
      rulesEvaluated: 0,
      rulesSkipped: [],
      alertsCreated: 0,
      alertsUpdated: 0,
      alertsResolved: 0,
      recoveriesEmitted: 0,
      eventsEmitted: 0,
      error: message,
    };
  }
}

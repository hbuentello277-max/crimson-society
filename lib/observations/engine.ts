import { createNexusServiceClient } from "@/lib/nexus/client";
import { emitNexusEvent } from "@/lib/events/emit";
import { logNexusActivity } from "@/lib/nexus/activity-log";
import { buildObservationEvaluationContext } from "@/lib/observations/context";
import { evaluateObservationRule, OBSERVATION_RULES } from "@/lib/observations/evaluator";
import {
  buildObservationCandidate,
  createObservation,
  emitObservationRuleSkippedEvent,
  expireStaleObservations,
} from "@/lib/observations/generator";
import type { NexusObservationEngineResult } from "@/lib/observations/types";

export async function runNexusObservationEngine(): Promise<NexusObservationEngineResult> {
  const evaluatedAt = new Date().toISOString();
  const admin = createNexusServiceClient();

  try {
    const context = await buildObservationEvaluationContext(admin);
    const rules = OBSERVATION_RULES.filter((rule) => rule.enabled);

    let rulesEvaluated = 0;
    let observationsCreated = 0;
    let observationsSuperseded = 0;
    let eventsEmitted = 0;
    const rulesSkipped: Array<{ rule_id: string; reason: string }> = [];

    for (const rule of rules) {
      rulesEvaluated += 1;
      const outcomes = evaluateObservationRule(rule, context);

      for (const outcome of outcomes) {
        if (outcome.kind === "skipped") {
          rulesSkipped.push({ rule_id: rule.rule_id, reason: outcome.reason });
          const emitted = await emitObservationRuleSkippedEvent(rule.rule_id, outcome.reason);
          if (emitted) {
            eventsEmitted += 1;
          }
          continue;
        }

        if (outcome.kind === "no_match") {
          continue;
        }

        const candidate = buildObservationCandidate(outcome.match, evaluatedAt);
        const result = await createObservation(admin, candidate);
        observationsCreated += 1;

        if (result.supersededPreviousId) {
          observationsSuperseded += 1;
          eventsEmitted += 1;
        }

        if (result.eventEmitted) {
          eventsEmitted += 1;
        }
      }
    }

    const observationsExpired = await expireStaleObservations(admin, evaluatedAt);

    const summaryEvent = await emitNexusEvent({
      source: "collector",
      category: "infra",
      eventType: "observation.evaluation.completed",
      severity: "info",
      title: "Nexus observation evaluation completed",
      description: `Evaluated ${rulesEvaluated} rules; created ${observationsCreated}, superseded ${observationsSuperseded}`,
      payload: {
        rules_evaluated: rulesEvaluated,
        observations_created: observationsCreated,
        observations_superseded: observationsSuperseded,
        observations_expired: observationsExpired,
        rules_skipped: rulesSkipped,
      },
      occurredAt: evaluatedAt,
    });

    if (summaryEvent.ok) {
      eventsEmitted += 1;
    }

    await logNexusActivity({
      actorType: "collector",
      action: "nexus.observation_evaluation.completed",
      targetType: "nexus",
      details: {
        rules_evaluated: rulesEvaluated,
        observations_created: observationsCreated,
        observations_superseded: observationsSuperseded,
        observations_expired: observationsExpired,
        rules_skipped: rulesSkipped,
        events_emitted: eventsEmitted,
      },
    });

    return {
      ok: true,
      evaluatedAt,
      rulesEvaluated,
      rulesSkipped,
      observationsCreated,
      observationsSuperseded,
      observationsExpired,
      eventsEmitted,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "observation engine failed";
    console.error("[nexus-observations] engine error", message);

    return {
      ok: false,
      evaluatedAt,
      rulesEvaluated: 0,
      rulesSkipped: [],
      observationsCreated: 0,
      observationsSuperseded: 0,
      observationsExpired: 0,
      eventsEmitted: 0,
      error: message,
    };
  }
}

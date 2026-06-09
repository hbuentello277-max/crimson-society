import { createNexusServiceClient } from "@/lib/nexus/client";
import { emitNexusEvent } from "@/lib/events/emit";
import { runAllMissionWorkflowChecks } from "@/lib/mission-health/checks";
import {
  computeMissionHealthFromChecks,
  eventSeverityForMissionStatus,
  eventSeverityForWorkflowDbStatus,
  workflowDbStatusFromCheck,
} from "@/lib/mission-health/scoring";
import type { MissionCheckResult, NexusMissionHealthEngineResult } from "@/lib/mission-health/types";
import { MISSION_WORKFLOW_REGISTRY, MISSION_WORKFLOW_SLUGS } from "@/lib/mission-health/workflows";

type WorkflowRow = {
  id: string;
  slug: string;
  status: string;
};

async function loadRecentWorkflowRates(
  admin: ReturnType<typeof createNexusServiceClient>,
  workflowId: string,
): Promise<{ success_count_1h: number; failure_count_1h: number; success_rate_1h: number | null }> {
  const since = new Date(Date.now() - 60 * 60_000).toISOString();
  const { data, error } = await admin
    .from("nexus_mission_checks")
    .select("status")
    .eq("workflow_id", workflowId)
    .gte("checked_at", since);

  if (error) {
    return { success_count_1h: 0, failure_count_1h: 0, success_rate_1h: null };
  }

  const rows = data ?? [];
  const success_count_1h = rows.filter((row) => row.status === "pass").length;
  const failure_count_1h = rows.filter((row) => row.status === "fail").length;
  const total = success_count_1h + failure_count_1h;

  return {
    success_count_1h,
    failure_count_1h,
    success_rate_1h: total > 0 ? Math.round((success_count_1h / total) * 10_000) / 10_000 : null,
  };
}

function workflowEventDescription(check: MissionCheckResult): string | null {
  if (typeof check.details.error === "string") {
    return check.details.error;
  }

  if (typeof check.details.reason === "string") {
    return check.details.reason;
  }

  return null;
}

export async function runNexusMissionHealthEngine(): Promise<NexusMissionHealthEngineResult> {
  const checkedAt = new Date().toISOString();
  const admin = createNexusServiceClient();

  try {
    const checkResults = await runAllMissionWorkflowChecks(admin);
    const { score, status, missionCritical } = computeMissionHealthFromChecks(
      checkResults,
      MISSION_WORKFLOW_REGISTRY,
    );

    const { data: workflowRows, error: workflowError } = await admin
      .from("nexus_mission_workflows")
      .select("id, slug, status")
      .in("slug", [...MISSION_WORKFLOW_SLUGS]);

    if (workflowError) {
      throw new Error(workflowError.message);
    }

    const workflowMap = new Map<string, WorkflowRow>();
    for (const row of workflowRows ?? []) {
      workflowMap.set(row.slug as string, row as WorkflowRow);
    }

    let checksRecorded = 0;
    let eventsEmitted = 0;
    const workflowSummaries: NexusMissionHealthEngineResult["workflows"] = [];

    for (const check of checkResults) {
      const workflow = workflowMap.get(check.workflow_slug);
      const workflowId = workflow?.id ?? null;
      const previousStatus = workflow?.status ?? "unknown";
      const nextDbStatus = workflowDbStatusFromCheck(check.status);

      workflowSummaries.push({
        slug: check.workflow_slug,
        status: nextDbStatus,
        workflow_score: check.workflow_score,
        check_status: check.status,
      });

      if (!workflowId) {
        console.warn("[nexus-mission-health] missing workflow row for", check.workflow_slug);
        continue;
      }

      const { error: insertError } = await admin.from("nexus_mission_checks").insert({
        workflow_id: workflowId,
        status: check.status,
        latency_ms: check.latency_ms,
        check_method: check.check_method,
        details: check.details,
        checked_at: check.checked_at,
      });

      if (!insertError) {
        checksRecorded += 1;
      } else {
        console.warn(
          "[nexus-mission-health] failed to record check",
          check.workflow_slug,
          insertError.message,
        );
      }

      const rates = await loadRecentWorkflowRates(admin, workflowId);
      const definition = MISSION_WORKFLOW_REGISTRY[check.workflow_slug];

      const updatePayload: Record<string, unknown> = {
        status: nextDbStatus,
        last_check_at: checkedAt,
        failure_count_1h: rates.failure_count_1h,
        success_count_1h: rates.success_count_1h,
        success_rate_1h: rates.success_rate_1h,
        metadata: {
          last_check_status: check.status,
          last_workflow_score: check.workflow_score,
          last_signal: check.details.signal ?? null,
          activity_state: check.details.activity_state ?? null,
          low_activity: check.details.low_activity === true,
          checked_at: checkedAt,
        },
      };

      if (check.status === "pass") {
        updatePayload.last_success_at = checkedAt;
      }

      if (definition) {
        updatePayload.config = {
          threshold_mode: definition.threshold_mode,
          warning_threshold: definition.warning_threshold,
          critical_threshold: definition.critical_threshold,
          activity_window_minutes: definition.activity_window_minutes,
        };
      }

      const { error: updateError } = await admin
        .from("nexus_mission_workflows")
        .update(updatePayload)
        .eq("id", workflowId);

      if (updateError) {
        console.warn(
          "[nexus-mission-health] failed to update workflow",
          check.workflow_slug,
          updateError.message,
        );
      }

      if (previousStatus !== nextDbStatus) {
        const emitted = await emitNexusEvent({
          source: "collector",
          category: "mission",
          eventType: "mission.workflow.status_changed",
          severity: eventSeverityForWorkflowDbStatus(nextDbStatus),
          title: `${check.workflow_slug} platform workflow status changed to ${nextDbStatus}`,
          description: workflowEventDescription(check),
          payload: {
            workflow_slug: check.workflow_slug,
            previous_status: previousStatus,
            next_status: nextDbStatus,
            workflow_score: check.workflow_score,
          },
          occurredAt: checkedAt,
          metadata: check.details,
        });

        if (emitted.ok) {
          eventsEmitted += 1;
        }
      }

      if (check.status !== "pass") {
        const emitted = await emitNexusEvent({
          source: "collector",
          category: "mission",
          eventType: `mission.check.${check.status}`,
          severity: check.status === "fail" ? "critical" : "warning",
          title: `${check.workflow_slug} platform check ${check.status}`,
          description: workflowEventDescription(check),
          payload: {
            workflow_slug: check.workflow_slug,
            check_method: check.check_method,
            status: check.status,
            workflow_score: check.workflow_score,
          },
          occurredAt: check.checked_at,
          metadata: check.details,
        });

        if (emitted.ok) {
          eventsEmitted += 1;
        }
      }
    }

    const summaryEvent = await emitNexusEvent({
      source: "collector",
      category: "mission",
      eventType: "mission.health.completed",
      severity: eventSeverityForMissionStatus(status),
      title: "Nexus platform status check completed",
      description: `Platform status: ${status} (score ${score})`,
      payload: {
        mission_score: score,
        mission_status: status,
        mission_critical: missionCritical,
        workflows: workflowSummaries,
      },
      occurredAt: checkedAt,
    });

    if (summaryEvent.ok) {
      eventsEmitted += 1;
    }

    if (missionCritical) {
      const criticalEvent = await emitNexusEvent({
        source: "collector",
        category: "mission",
        eventType: "mission.health.critical",
        severity: "critical",
        title: "Platform health is critical",
        description: `Platform score ${score} is below operational threshold`,
        payload: {
          mission_score: score,
          mission_status: status,
          mission_critical: true,
          workflows: workflowSummaries.filter((item) => item.status === "failing"),
        },
        occurredAt: checkedAt,
      });

      if (criticalEvent.ok) {
        eventsEmitted += 1;
      }
    }

    return {
      ok: true,
      checkedAt,
      score,
      status,
      missionCritical,
      workflows: workflowSummaries,
      eventsEmitted,
      checksRecorded,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "platform health engine failed";
    console.error("[nexus-mission-health] engine error", message);

    return {
      ok: false,
      checkedAt,
      score: 0,
      status: "unknown",
      missionCritical: false,
      workflows: [],
      eventsEmitted: 0,
      checksRecorded: 0,
      error: message,
    };
  }
}

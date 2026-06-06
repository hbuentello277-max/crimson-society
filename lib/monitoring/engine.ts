import { createNexusServiceClient } from "@/lib/nexus/client";
import { NEXUS_INTEGRATION_SLUGS, type NexusIntegrationSlug } from "@/lib/nexus/constants";
import { emitNexusEvent } from "@/lib/events/emit";
import {
  aggregateIntegrationStatus,
  aggregateSystemStatus,
  groupChecksByIntegration,
  summarizeIntegrationError,
  summarizeIntegrationLatency,
} from "@/lib/monitoring/aggregator";
import { runCrimsonSocietyProbe } from "@/lib/monitoring/probes/crimson-society";
import { runGithubProbe } from "@/lib/monitoring/probes/github";
import { runResendProbe } from "@/lib/monitoring/probes/resend";
import { runStripeProbe } from "@/lib/monitoring/probes/stripe";
import { runSupabaseProbe } from "@/lib/monitoring/probes/supabase";
import { runVercelProbe } from "@/lib/monitoring/probes/vercel";
import type {
  HealthProbeResult,
  NexusHealthEngineResult,
} from "@/lib/monitoring/types";

type IntegrationRow = {
  id: string;
  slug: NexusIntegrationSlug;
  status: string;
};

async function runAllProbes(): Promise<HealthProbeResult[]> {
  const batches = await Promise.all([
    runSupabaseProbe(),
    runStripeProbe(),
    runGithubProbe(),
    runVercelProbe(),
    runResendProbe(),
    runCrimsonSocietyProbe(),
  ]);

  return batches.flat();
}

function eventSeverityForStatus(status: string): "info" | "warning" | "critical" {
  if (status === "down") {
    return "critical";
  }

  if (status === "degraded") {
    return "warning";
  }

  return "info";
}

export async function runNexusHealthEngine(): Promise<NexusHealthEngineResult> {
  const checkedAt = new Date().toISOString();
  const admin = createNexusServiceClient();

  try {
    const probeResults = await runAllProbes();
    const grouped = groupChecksByIntegration(probeResults);

    const { data: integrationRows, error: integrationError } = await admin
      .from("nexus_integrations")
      .select("id, slug, status")
      .in("slug", [...NEXUS_INTEGRATION_SLUGS]);

    if (integrationError) {
      throw new Error(integrationError.message);
    }

    const integrationMap = new Map<string, IntegrationRow>();
    for (const row of integrationRows ?? []) {
      integrationMap.set(row.slug as NexusIntegrationSlug, row as IntegrationRow);
    }

    let checksRecorded = 0;
    let eventsEmitted = 0;

    for (const slug of NEXUS_INTEGRATION_SLUGS) {
      const checks = grouped[slug] ?? [];
      const integration = integrationMap.get(slug);
      const integrationId = integration?.id ?? null;
      const previousStatus = integration?.status ?? "unknown";
      const nextStatus = aggregateIntegrationStatus(checks);
      const latencyMs = summarizeIntegrationLatency(checks);
      const errorMessage = summarizeIntegrationError(checks);

      for (const check of checks) {
        if (!integrationId) {
          console.warn("[nexus-health] missing integration row for", slug);
          continue;
        }

        const { error } = await admin.from("nexus_health_checks").insert({
          integration_id: integrationId,
          check_type: check.check_type,
          status: check.status,
          latency_ms: check.latency_ms,
          response_code: check.response_code,
          details: check.details,
          checked_at: check.checked_at,
        });

        if (!error) {
          checksRecorded += 1;
        } else {
          console.warn("[nexus-health] failed to record check", slug, check.check_type, error.message);
        }
      }

      if (integrationId) {
        const updatePayload: Record<string, unknown> = {
          status: nextStatus,
          last_check_at: checkedAt,
          latency_ms: latencyMs,
          error_message: errorMessage,
          metadata: {
            last_probe_count: checks.length,
            checked_at: checkedAt,
          },
        };

        if (nextStatus === "healthy") {
          updatePayload.last_healthy_at = checkedAt;
        }

        const { error: updateError } = await admin
          .from("nexus_integrations")
          .update(updatePayload)
          .eq("id", integrationId);

        if (updateError) {
          console.warn("[nexus-health] failed to update integration", slug, updateError.message);
        }
      }

      if (previousStatus !== nextStatus) {
        const emitted = await emitNexusEvent({
          source: "collector",
          category: "health",
          eventType: "health.integration.status_changed",
          severity: eventSeverityForStatus(nextStatus),
          title: `${slug} status changed to ${nextStatus}`,
          description: errorMessage,
          integrationId,
          payload: {
            integration_slug: slug,
            previous_status: previousStatus,
            next_status: nextStatus,
            checks: checks.length,
          },
          occurredAt: checkedAt,
        });

        if (emitted.ok) {
          eventsEmitted += 1;
        }
      }

      for (const check of checks.filter((item) => item.status !== "pass")) {
        const emitted = await emitNexusEvent({
          source: "collector",
          category: "health",
          eventType: `health.check.${check.status}`,
          severity: check.status === "fail" ? "critical" : "warning",
          title: `${slug} ${check.check_type} check ${check.status}`,
          description:
            typeof check.details.error === "string"
              ? check.details.error
              : typeof check.details.reason === "string"
                ? check.details.reason
                : null,
          integrationId,
          payload: {
            integration_slug: slug,
            check_type: check.check_type,
            status: check.status,
            response_code: check.response_code,
          },
          occurredAt: check.checked_at,
          metadata: check.details,
        });

        if (emitted.ok) {
          eventsEmitted += 1;
        }
      }
    }

    const integrationSummaries = NEXUS_INTEGRATION_SLUGS.map((slug) => {
      const checks = grouped[slug] ?? [];
      return {
        slug,
        status: aggregateIntegrationStatus(checks),
        latency_ms: summarizeIntegrationLatency(checks),
        error_message: summarizeIntegrationError(checks),
        checks: checks.length,
      };
    });

    const systemStatus = aggregateSystemStatus(
      integrationSummaries.map((item) => item.status),
    );

    const summaryEvent = await emitNexusEvent({
      source: "collector",
      category: "health",
      eventType: "health.check.completed",
      severity: systemStatus === "critical" ? "critical" : systemStatus === "degraded" ? "warning" : "info",
      title: "Nexus system health check completed",
      description: `System status: ${systemStatus}`,
      payload: {
        system_status: systemStatus,
        integrations: integrationSummaries,
      },
      occurredAt: checkedAt,
    });

    if (summaryEvent.ok) {
      eventsEmitted += 1;
    }

    return {
      ok: true,
      checkedAt,
      integrations: integrationSummaries,
      systemStatus,
      eventsEmitted,
      checksRecorded,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "health engine failed";
    console.error("[nexus-health] engine error", message);

    return {
      ok: false,
      checkedAt,
      integrations: [],
      systemStatus: "unknown",
      eventsEmitted: 0,
      checksRecorded: 0,
      error: message,
    };
  }
}

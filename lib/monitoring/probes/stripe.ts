import { createNexusServiceClient } from "@/lib/nexus/client";
import { getStripe } from "@/lib/stripe";
import { INTEGRATION_THRESHOLDS } from "@/lib/monitoring/thresholds";
import {
  buildProbeResult,
  latencyProbeStatus,
  nowIso,
  timedProbe,
  unconfiguredProbe,
} from "@/lib/monitoring/probe-utils";
import type { HealthProbeResult } from "@/lib/monitoring/types";

const SLUG = "stripe" as const;
const thresholds = INTEGRATION_THRESHOLDS.stripe;

export async function runStripeProbe(): Promise<HealthProbeResult[]> {
  const checkedAt = nowIso();
  const results: HealthProbeResult[] = [];

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return [
      unconfiguredProbe(SLUG, "api", "STRIPE_SECRET_KEY"),
      unconfiguredProbe(SLUG, "webhook", "STRIPE_SECRET_KEY"),
    ];
  }

  try {
    const stripe = getStripe();
    const api = await timedProbe(async () => stripe.balance.retrieve());
    results.push(
      buildProbeResult({
        integration_slug: SLUG,
        check_type: "api",
        status: latencyProbeStatus(
          api.latency_ms,
          thresholds.latency!.passMs,
          thresholds.latency!.warnMs,
        ),
        latency_ms: api.latency_ms,
        response_code: 200,
        details: { ok: true },
        checked_at: checkedAt,
      }),
    );
  } catch (error) {
    results.push(
      buildProbeResult({
        integration_slug: SLUG,
        check_type: "api",
        status: "fail",
        details: {
          error: error instanceof Error ? error.message : "stripe api probe failed",
        },
        checked_at: checkedAt,
      }),
    );
  }

  try {
    const admin = createNexusServiceClient();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error } = await admin
      .from("stripe_webhook_events")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("received_at", oneHourAgo);

    if (error) {
      results.push(
        buildProbeResult({
          integration_slug: SLUG,
          check_type: "webhook",
          status: "warn",
          details: { error: error.message },
          checked_at: checkedAt,
        }),
      );
    } else {
      const failedCount = count ?? 0;
      let status: "pass" | "warn" | "fail" = "pass";
      if (failedCount > thresholds.webhookFailuresFail) {
        status = "fail";
      } else if (failedCount >= thresholds.webhookFailuresWarn) {
        status = "warn";
      }

      results.push(
        buildProbeResult({
          integration_slug: SLUG,
          check_type: "webhook",
          status,
          details: {
            failed_count_1h: failedCount,
            window_minutes: 60,
          },
          checked_at: checkedAt,
        }),
      );
    }
  } catch (error) {
    results.push(
      buildProbeResult({
        integration_slug: SLUG,
        check_type: "webhook",
        status: "warn",
        details: {
          error: error instanceof Error ? error.message : "stripe webhook probe failed",
        },
        checked_at: checkedAt,
      }),
    );
  }

  return results;
}

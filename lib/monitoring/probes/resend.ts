import { createNexusServiceClient } from "@/lib/nexus/client";
import { isResendConfigured } from "@/lib/email/resend";
import { INTEGRATION_THRESHOLDS } from "@/lib/monitoring/thresholds";
import {
  buildProbeResult,
  latencyProbeStatus,
  nowIso,
  timedProbe,
  unconfiguredProbe,
} from "@/lib/monitoring/probe-utils";
import type { HealthProbeResult } from "@/lib/monitoring/types";

const SLUG = "resend" as const;
const thresholds = INTEGRATION_THRESHOLDS.resend;

export async function runResendProbe(): Promise<HealthProbeResult[]> {
  const checkedAt = nowIso();
  const results: HealthProbeResult[] = [];

  if (!isResendConfigured()) {
    return [
      unconfiguredProbe(SLUG, "api", "RESEND_API_KEY"),
      unconfiguredProbe(SLUG, "config", "RESEND_FROM_EMAIL"),
    ];
  }

  const apiKey = process.env.RESEND_API_KEY!.trim();

  try {
    const api = await timedProbe(async () =>
      fetch("https://api.resend.com/domains", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }),
    );

    results.push(
      buildProbeResult({
        integration_slug: SLUG,
        check_type: "api",
        status: api.result.ok
          ? latencyProbeStatus(
              api.latency_ms,
              thresholds.latency!.passMs,
              thresholds.latency!.warnMs,
            )
          : "fail",
        latency_ms: api.latency_ms,
        response_code: api.result.status,
        details: { ok: api.result.ok },
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
          error: error instanceof Error ? error.message : "resend api probe failed",
        },
        checked_at: checkedAt,
      }),
    );
  }

  try {
    const admin = createNexusServiceClient();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await admin
      .from("shop_order_email_events")
      .select("id", { count: "exact", head: true })
      .gte("sent_at", since);

    if (error) {
      results.push(
        buildProbeResult({
          integration_slug: SLUG,
          check_type: "email_delivery",
          status: "warn",
          details: { error: error.message },
          checked_at: checkedAt,
        }),
      );
    } else {
      results.push(
        buildProbeResult({
          integration_slug: SLUG,
          check_type: "email_delivery",
          status: "pass",
          details: {
            sent_count_24h: count ?? 0,
          },
          checked_at: checkedAt,
        }),
      );
    }
  } catch (error) {
    results.push(
      buildProbeResult({
        integration_slug: SLUG,
        check_type: "email_delivery",
        status: "warn",
        details: {
          error: error instanceof Error ? error.message : "resend delivery probe failed",
        },
        checked_at: checkedAt,
      }),
    );
  }

  return results;
}

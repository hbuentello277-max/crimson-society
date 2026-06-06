import { createNexusServiceClient } from "@/lib/nexus/client";
import { INTEGRATION_THRESHOLDS } from "@/lib/monitoring/thresholds";
import {
  buildProbeResult,
  getAppBaseUrl,
  latencyProbeStatus,
  nowIso,
  timedProbe,
  unconfiguredProbe,
} from "@/lib/monitoring/probe-utils";
import type { HealthProbeResult } from "@/lib/monitoring/types";

const SLUG = "crimson_society" as const;
const thresholds = INTEGRATION_THRESHOLDS.crimson_society;

export async function runCrimsonSocietyProbe(): Promise<HealthProbeResult[]> {
  const checkedAt = nowIso();
  const results: HealthProbeResult[] = [];
  const appUrl = getAppBaseUrl();

  if (!appUrl) {
    results.push(unconfiguredProbe(SLUG, "app", "NEXT_PUBLIC_APP_URL"));
  } else {
    try {
      const app = await timedProbe(async () =>
        fetch(`${appUrl}/manifest.webmanifest`, {
          method: "GET",
          cache: "no-store",
        }),
      );

      results.push(
        buildProbeResult({
          integration_slug: SLUG,
          check_type: "app",
          status: app.result.ok
            ? latencyProbeStatus(
                app.latency_ms,
                thresholds.latency!.passMs,
                thresholds.latency!.warnMs,
              )
            : "fail",
          latency_ms: app.latency_ms,
          response_code: app.result.status,
          details: {
            url: `${appUrl}/manifest.webmanifest`,
            ok: app.result.ok,
          },
          checked_at: checkedAt,
        }),
      );
    } catch (error) {
      results.push(
        buildProbeResult({
          integration_slug: SLUG,
          check_type: "app",
          status: "fail",
          details: {
            url: appUrl,
            error: error instanceof Error ? error.message : "app probe failed",
          },
          checked_at: checkedAt,
        }),
      );
    }
  }

  try {
    const admin = createNexusServiceClient();
    const { count, error } = await admin
      .from("push_notification_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    if (error) {
      results.push(
        buildProbeResult({
          integration_slug: SLUG,
          check_type: "push_queue",
          status: "warn",
          details: { error: error.message },
          checked_at: checkedAt,
        }),
      );
    } else {
      const pending = count ?? 0;
      let status: "pass" | "warn" | "fail" = "pass";
      if (pending > thresholds.pushBacklogFail) {
        status = "fail";
      } else if (pending >= thresholds.pushBacklogWarn) {
        status = "warn";
      }

      results.push(
        buildProbeResult({
          integration_slug: SLUG,
          check_type: "push_queue",
          status,
          details: { pending_count: pending },
          checked_at: checkedAt,
        }),
      );
    }
  } catch (error) {
    results.push(
      buildProbeResult({
        integration_slug: SLUG,
        check_type: "push_queue",
        status: "warn",
        details: {
          error: error instanceof Error ? error.message : "push queue probe failed",
        },
        checked_at: checkedAt,
      }),
    );
  }

  return results;
}

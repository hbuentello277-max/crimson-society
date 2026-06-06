import { createNexusServiceClient } from "@/lib/nexus/client";
import { INTEGRATION_THRESHOLDS } from "@/lib/monitoring/thresholds";
import {
  buildProbeResult,
  latencyProbeStatus,
  nowIso,
  timedProbe,
} from "@/lib/monitoring/probe-utils";
import type { HealthProbeResult } from "@/lib/monitoring/types";

const SLUG = "supabase" as const;
const thresholds = INTEGRATION_THRESHOLDS.supabase;

export async function runSupabaseProbe(): Promise<HealthProbeResult[]> {
  const checkedAt = nowIso();
  const admin = createNexusServiceClient();
  const results: HealthProbeResult[] = [];
  let databaseStatus: "pass" | "warn" | "fail" = "fail";
  let databaseLatencyMs: number | null = null;

  try {
    const db = await timedProbe(async () =>
      admin.from("nexus_integrations").select("id").limit(1),
    );
    const dbError = db.result.error?.message ?? null;
    databaseLatencyMs = db.latency_ms;
    databaseStatus = dbError
      ? "fail"
      : latencyProbeStatus(
          db.latency_ms,
          thresholds.latency!.passMs,
          thresholds.latency!.warnMs,
        );
    results.push(
      buildProbeResult({
        integration_slug: SLUG,
        check_type: "database",
        status: databaseStatus,
        latency_ms: db.latency_ms,
        response_code: dbError ? 500 : 200,
        details: { ok: !dbError, error: dbError },
        checked_at: checkedAt,
      }),
    );
  } catch (error) {
    results.push(
      buildProbeResult({
        integration_slug: SLUG,
        check_type: "database",
        status: "fail",
        details: {
          error: error instanceof Error ? error.message : "database probe failed",
        },
        checked_at: checkedAt,
      }),
    );
  }

  try {
    const auth = await timedProbe(async () =>
      admin.auth.admin.listUsers({ page: 1, perPage: 1 }),
    );
    const authError = auth.result.error?.message ?? null;
    results.push(
      buildProbeResult({
        integration_slug: SLUG,
        check_type: "auth",
        status: authError ? "fail" : "pass",
        latency_ms: auth.latency_ms,
        response_code: authError ? 500 : 200,
        details: { ok: !authError, error: authError },
        checked_at: checkedAt,
      }),
    );
  } catch (error) {
    results.push(
      buildProbeResult({
        integration_slug: SLUG,
        check_type: "auth",
        status: "fail",
        details: {
          error: error instanceof Error ? error.message : "auth probe failed",
        },
        checked_at: checkedAt,
      }),
    );
  }

  try {
    const storage = await timedProbe(async () => admin.storage.listBuckets());
    const storageError = storage.result.error?.message ?? null;
    results.push(
      buildProbeResult({
        integration_slug: SLUG,
        check_type: "storage",
        status: storageError ? "fail" : "pass",
        latency_ms: storage.latency_ms,
        response_code: storageError ? 500 : 200,
        details: {
          ok: !storageError,
          bucket_count: storage.result.data?.length ?? 0,
          error: storageError,
        },
        checked_at: checkedAt,
      }),
    );
  } catch (error) {
    results.push(
      buildProbeResult({
        integration_slug: SLUG,
        check_type: "storage",
        status: "fail",
        details: {
          error: error instanceof Error ? error.message : "storage probe failed",
        },
        checked_at: checkedAt,
      }),
    );
  }

  results.push(
    buildProbeResult({
      integration_slug: SLUG,
      check_type: "realtime",
      status: databaseStatus === "fail" ? "warn" : "pass",
      latency_ms: databaseLatencyMs,
      response_code: databaseStatus === "fail" ? 500 : 200,
      details: {
        ok: databaseStatus !== "fail",
        derived_from: "database",
        note: "Realtime is not independently probed in Nexus Mark I.",
      },
      checked_at: checkedAt,
    }),
  );

  return results;
}

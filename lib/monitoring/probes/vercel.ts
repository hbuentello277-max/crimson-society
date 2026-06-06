import { INTEGRATION_THRESHOLDS } from "@/lib/monitoring/thresholds";
import {
  buildProbeResult,
  latencyProbeStatus,
  nowIso,
  timedProbe,
  unconfiguredProbe,
} from "@/lib/monitoring/probe-utils";
import type { HealthProbeResult } from "@/lib/monitoring/types";

const SLUG = "vercel" as const;
const thresholds = INTEGRATION_THRESHOLDS.vercel;

export async function runVercelProbe(): Promise<HealthProbeResult[]> {
  const checkedAt = nowIso();
  const token = process.env.VERCEL_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();

  if (!token) {
    return [unconfiguredProbe(SLUG, "api", "VERCEL_TOKEN")];
  }

  if (!projectId) {
    return [
      unconfiguredProbe(SLUG, "project", "VERCEL_PROJECT_ID"),
      ...(await runVercelAccountProbe(token, checkedAt)),
    ];
  }

  const results: HealthProbeResult[] = [];

  try {
    const project = await timedProbe(async () =>
      fetch(`https://api.vercel.com/v9/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    );

    const body = (await project.result.json().catch(() => ({}))) as {
      name?: string;
      error?: { message?: string };
    };

    results.push(
      buildProbeResult({
        integration_slug: SLUG,
        check_type: "project",
        status: project.result.ok
          ? latencyProbeStatus(
              project.latency_ms,
              thresholds.latency!.passMs,
              thresholds.latency!.warnMs,
            )
          : "fail",
        latency_ms: project.latency_ms,
        response_code: project.result.status,
        details: {
          project_id: projectId,
          project_name: body.name ?? null,
          error: body.error?.message ?? null,
        },
        checked_at: checkedAt,
      }),
    );
  } catch (error) {
    results.push(
      buildProbeResult({
        integration_slug: SLUG,
        check_type: "project",
        status: "fail",
        details: {
          project_id: projectId,
          error: error instanceof Error ? error.message : "vercel project probe failed",
        },
        checked_at: checkedAt,
      }),
    );
  }

  return results;
}

async function runVercelAccountProbe(
  token: string,
  checkedAt: string,
): Promise<HealthProbeResult[]> {
  try {
    const api = await timedProbe(async () =>
      fetch("https://api.vercel.com/v2/user", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );

    return [
      buildProbeResult({
        integration_slug: SLUG,
        check_type: "api",
        status: api.result.ok ? "pass" : "warn",
        latency_ms: api.latency_ms,
        response_code: api.result.status,
        details: { ok: api.result.ok },
        checked_at: checkedAt,
      }),
    ];
  } catch (error) {
    return [
      buildProbeResult({
        integration_slug: SLUG,
        check_type: "api",
        status: "warn",
        details: {
          error: error instanceof Error ? error.message : "vercel api probe failed",
        },
        checked_at: checkedAt,
      }),
    ];
  }
}

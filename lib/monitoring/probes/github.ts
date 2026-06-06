import { INTEGRATION_THRESHOLDS } from "@/lib/monitoring/thresholds";
import {
  buildProbeResult,
  latencyProbeStatus,
  nowIso,
  timedProbe,
  unconfiguredProbe,
} from "@/lib/monitoring/probe-utils";
import type { HealthProbeResult } from "@/lib/monitoring/types";

const SLUG = "github" as const;
const thresholds = INTEGRATION_THRESHOLDS.github;

export async function runGithubProbe(): Promise<HealthProbeResult[]> {
  const checkedAt = nowIso();
  const token = process.env.GITHUB_TOKEN?.trim();
  const repo = process.env.GITHUB_REPO?.trim();

  if (!token) {
    return [unconfiguredProbe(SLUG, "api", "GITHUB_TOKEN")];
  }

  const results: HealthProbeResult[] = [];

  try {
    const rate = await timedProbe(async () =>
      fetch("https://api.github.com/rate_limit", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }),
    );

    const body = (await rate.result.json().catch(() => ({}))) as {
      resources?: { core?: { remaining?: number } };
      message?: string;
    };

    const remaining = body.resources?.core?.remaining ?? null;
    let status = latencyProbeStatus(
      rate.latency_ms,
      thresholds.latency!.passMs,
      thresholds.latency!.warnMs,
    );

    if (!rate.result.ok) {
      status = "fail";
    } else if (
      typeof remaining === "number" &&
      remaining <= thresholds.rateLimitRemainingFail
    ) {
      status = "fail";
    } else if (
      typeof remaining === "number" &&
      remaining <= thresholds.rateLimitRemainingWarn
    ) {
      status = "warn";
    }

    results.push(
      buildProbeResult({
        integration_slug: SLUG,
        check_type: "api",
        status,
        latency_ms: rate.latency_ms,
        response_code: rate.result.status,
        details: {
          rate_limit_remaining: remaining,
          message: body.message ?? null,
        },
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
          error: error instanceof Error ? error.message : "github api probe failed",
        },
        checked_at: checkedAt,
      }),
    );
  }

  if (!repo) {
    results.push(unconfiguredProbe(SLUG, "repo", "GITHUB_REPO"));
    return results;
  }

  try {
    const repoCheck = await timedProbe(async () =>
      fetch(`https://api.github.com/repos/${repo}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }),
    );

    results.push(
      buildProbeResult({
        integration_slug: SLUG,
        check_type: "repo",
        status: repoCheck.result.ok ? "pass" : "fail",
        latency_ms: repoCheck.latency_ms,
        response_code: repoCheck.result.status,
        details: {
          repo,
          ok: repoCheck.result.ok,
        },
        checked_at: checkedAt,
      }),
    );
  } catch (error) {
    results.push(
      buildProbeResult({
        integration_slug: SLUG,
        check_type: "repo",
        status: "fail",
        details: {
          repo,
          error: error instanceof Error ? error.message : "github repo probe failed",
        },
        checked_at: checkedAt,
      }),
    );
  }

  return results;
}

import type { HealthCheckStatus, HealthProbeResult } from "@/lib/monitoring/types";
import type { NexusIntegrationSlug } from "@/lib/nexus/constants";
import { safeProbeDetails } from "@/lib/monitoring/redact";
import { latencyStatus } from "@/lib/monitoring/thresholds";

export function nowIso(): string {
  return new Date().toISOString();
}

export function buildProbeResult(input: {
  integration_slug: NexusIntegrationSlug;
  check_type: string;
  status: HealthCheckStatus;
  latency_ms?: number | null;
  response_code?: number | null;
  details?: Record<string, unknown>;
  checked_at?: string;
}): HealthProbeResult {
  return {
    integration_slug: input.integration_slug,
    check_type: input.check_type,
    status: input.status,
    latency_ms: input.latency_ms ?? null,
    response_code: input.response_code ?? null,
    details: safeProbeDetails(input.details ?? {}),
    checked_at: input.checked_at ?? nowIso(),
  };
}

export function unconfiguredProbe(
  integration_slug: NexusIntegrationSlug,
  check_type: string,
  envVar: string,
): HealthProbeResult {
  return buildProbeResult({
    integration_slug,
    check_type,
    status: "warn",
    details: {
      configured: false,
      reason: `${envVar} not set`,
    },
  });
}

export async function timedProbe<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; latency_ms: number }> {
  const started = Date.now();
  const result = await fn();
  return { result, latency_ms: Date.now() - started };
}

export function latencyProbeStatus(
  latencyMs: number,
  passMs: number,
  warnMs: number,
): HealthCheckStatus {
  return latencyStatus(latencyMs, { passMs, warnMs });
}

export function getAppBaseUrl(): string | null {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/$/, "")}`;
  }

  return null;
}

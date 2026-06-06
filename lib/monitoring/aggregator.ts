import type { NexusIntegrationSlug } from "@/lib/nexus/constants";
import type {
  HealthProbeResult,
  IntegrationHealthStatus,
  SystemHealthStatus,
} from "@/lib/monitoring/types";

export function aggregateIntegrationStatus(
  checks: HealthProbeResult[],
): IntegrationHealthStatus {
  if (checks.length === 0) {
    return "unknown";
  }

  if (checks.some((check) => check.status === "fail")) {
    return "down";
  }

  if (checks.some((check) => check.status === "warn")) {
    return "degraded";
  }

  if (checks.every((check) => check.status === "pass")) {
    return "healthy";
  }

  return "unknown";
}

export function aggregateSystemStatus(
  integrationStatuses: IntegrationHealthStatus[],
): SystemHealthStatus {
  if (integrationStatuses.length === 0) {
    return "unknown";
  }

  if (integrationStatuses.some((status) => status === "down")) {
    return "critical";
  }

  if (integrationStatuses.some((status) => status === "degraded")) {
    return "degraded";
  }

  if (integrationStatuses.every((status) => status === "healthy")) {
    return "operational";
  }

  return "unknown";
}

export function groupChecksByIntegration(
  checks: HealthProbeResult[],
): Record<NexusIntegrationSlug, HealthProbeResult[]> {
  const grouped = {} as Record<NexusIntegrationSlug, HealthProbeResult[]>;

  for (const check of checks) {
    if (!grouped[check.integration_slug]) {
      grouped[check.integration_slug] = [];
    }
    grouped[check.integration_slug].push(check);
  }

  return grouped;
}

export function summarizeIntegrationLatency(
  checks: HealthProbeResult[],
): number | null {
  const latencies = checks
    .map((check) => check.latency_ms)
    .filter((value): value is number => typeof value === "number");

  if (latencies.length === 0) {
    return null;
  }

  return Math.max(...latencies);
}

export function summarizeIntegrationError(
  checks: HealthProbeResult[],
): string | null {
  const failed = checks.find((check) => check.status === "fail");
  if (!failed) {
    const warned = checks.find((check) => check.status === "warn");
    if (warned?.details?.reason && typeof warned.details.reason === "string") {
      return warned.details.reason;
    }
    if (warned?.details?.error && typeof warned.details.error === "string") {
      return warned.details.error;
    }
    return null;
  }

  if (typeof failed.details.error === "string") {
    return failed.details.error;
  }

  return `${failed.check_type} check failed`;
}

import type { NexusIntegrationSlug } from "@/lib/nexus/constants";

export type HealthCheckStatus = "pass" | "warn" | "fail";

export type IntegrationHealthStatus =
  | "healthy"
  | "degraded"
  | "down"
  | "unknown"
  | "maintenance";

export type SystemHealthStatus = "operational" | "degraded" | "critical" | "unknown";

export type HealthProbeResult = {
  integration_slug: NexusIntegrationSlug;
  check_type: string;
  status: HealthCheckStatus;
  latency_ms: number | null;
  response_code: number | null;
  details: Record<string, unknown>;
  checked_at: string;
};

export type NexusHealthEngineResult = {
  ok: boolean;
  checkedAt: string;
  integrations: Array<{
    slug: NexusIntegrationSlug;
    status: IntegrationHealthStatus;
    latency_ms: number | null;
    error_message: string | null;
    checks: number;
  }>;
  systemStatus: SystemHealthStatus;
  eventsEmitted: number;
  checksRecorded: number;
  error?: string;
};

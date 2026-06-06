import type { SupabaseClient } from "@supabase/supabase-js";
import { NEXUS_HEALTH_RECENT_WINDOW_MS } from "@/lib/monitoring/thresholds";
import { aggregateSystemStatus } from "@/lib/monitoring/aggregator";
import type { IntegrationHealthStatus, SystemHealthStatus } from "@/lib/monitoring/types";

export type NexusHealthIntegrationSummary = {
  id: string;
  slug: string;
  display_name: string;
  status: IntegrationHealthStatus;
  last_check_at: string | null;
  last_healthy_at: string | null;
  latency_ms: number | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
};

export type NexusHealthCheckSummary = {
  id: string;
  integration_id: string;
  integration_slug: string | null;
  check_type: string;
  status: string;
  latency_ms: number | null;
  response_code: number | null;
  details: Record<string, unknown>;
  checked_at: string;
};

export type NexusHealthSnapshot = {
  systemStatus: SystemHealthStatus;
  checkedAt: string | null;
  integrations: NexusHealthIntegrationSummary[];
  latestChecks: NexusHealthCheckSummary[];
};

export async function getNexusHealthSnapshot(
  supabase: SupabaseClient,
): Promise<NexusHealthSnapshot> {
  const since = new Date(Date.now() - NEXUS_HEALTH_RECENT_WINDOW_MS).toISOString();

  const [{ data: integrations, error: integrationsError }, { data: checks, error: checksError }] =
    await Promise.all([
      supabase
        .from("nexus_integrations")
        .select(
          "id, slug, display_name, status, last_check_at, last_healthy_at, latency_ms, error_message, metadata",
        )
        .order("slug", { ascending: true }),
      supabase
        .from("nexus_health_checks")
        .select("id, integration_id, check_type, status, latency_ms, response_code, details, checked_at")
        .gte("checked_at", since)
        .order("checked_at", { ascending: false })
        .limit(100),
    ]);

  if (integrationsError) {
    throw new Error(integrationsError.message);
  }

  if (checksError) {
    throw new Error(checksError.message);
  }

  const integrationRows = integrations ?? [];
  const integrationById = new Map(
    integrationRows.map((row) => [row.id as string, row]),
  );

  const latestChecks: NexusHealthCheckSummary[] = (checks ?? []).map((row) => {
    const integration = integrationById.get(row.integration_id as string);
    return {
      id: row.id as string,
      integration_id: row.integration_id as string,
      integration_slug: (integration?.slug as string | undefined) ?? null,
      check_type: row.check_type as string,
      status: row.status as string,
      latency_ms: (row.latency_ms as number | null) ?? null,
      response_code: (row.response_code as number | null) ?? null,
      details: (row.details as Record<string, unknown>) ?? {},
      checked_at: row.checked_at as string,
    };
  });

  const integrationSummaries: NexusHealthIntegrationSummary[] = integrationRows.map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    display_name: row.display_name as string,
    status: row.status as IntegrationHealthStatus,
    last_check_at: (row.last_check_at as string | null) ?? null,
    last_healthy_at: (row.last_healthy_at as string | null) ?? null,
    latency_ms: (row.latency_ms as number | null) ?? null,
    error_message: (row.error_message as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  }));

  const latestCheckAt = integrationSummaries.reduce<string | null>((latest, row) => {
    if (!row.last_check_at) {
      return latest;
    }

    if (!latest || row.last_check_at > latest) {
      return row.last_check_at;
    }

    return latest;
  }, null);

  return {
    systemStatus: aggregateSystemStatus(
      integrationSummaries.map((row) => row.status),
    ),
    checkedAt: latestCheckAt,
    integrations: integrationSummaries,
    latestChecks,
  };
}

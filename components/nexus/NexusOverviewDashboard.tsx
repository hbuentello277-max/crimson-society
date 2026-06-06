"use client";

import Link from "next/link";
import type { NexusAlertSummaryRow } from "@/lib/alerts/types";
import type { NexusIncidentSummaryRow } from "@/lib/incidents/types";
import type { NexusObservationSummaryRow } from "@/lib/observations/types";
import type { NexusHealthIntegrationSummary } from "@/lib/monitoring/health-summary";
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatRelativeTime,
  integrationDisplayName,
  isWithinHours,
} from "@/lib/nexus/format";
import { NEXUS_INTEGRATION_SLUGS } from "@/lib/nexus/constants";
import { NexusEmptyState } from "@/components/nexus/NexusEmptyState";
import { NexusStatusBadge } from "@/components/nexus/NexusStatusBadge";
import {
  NexusCommandPanel,
  NexusConfidenceIndicator,
  NexusLoadingPanel,
  NexusPriorityBadge,
  NexusRefreshButton,
  NexusStatCard,
} from "@/components/nexus/NexusShared";
import { useNexusOverview } from "@/hooks/nexus/useNexusOverview";

type HealthPayload = {
  system?: { status?: string; checked_at?: string | null };
  integrations?: NexusHealthIntegrationSummary[];
};

type MissionPayload = {
  score?: number;
  status?: string;
  mission_critical?: boolean;
  checked_at?: string | null;
  workflows?: Array<{
    slug: string;
    display_name: string;
    workflow_status: string;
    workflow_score: number | null;
    success_rate_1h: number | null;
  }>;
};

type MetricsPayload = {
  growth?: { total_users?: number; new_users_this_week?: number };
  blackcard?: { active_members?: number };
  revenue?: { estimated_mrr?: number; estimated_arr?: number };
};

type AlertsPayload = {
  counts?: { active?: number; critical?: number; warning?: number };
  active?: NexusAlertSummaryRow[];
  recent_history?: NexusAlertSummaryRow[];
  collected_at?: string;
};

type IncidentsPayload = {
  counts?: { open?: number; investigating?: number; mitigated?: number };
  open?: NexusIncidentSummaryRow[];
  recent_history?: NexusIncidentSummaryRow[];
  collected_at?: string;
};

type ObservationsPayload = {
  counts?: { active?: number; critical?: number; warning?: number };
  active?: NexusObservationSummaryRow[];
  collected_at?: string;
};

function integrationRows(integrations: NexusHealthIntegrationSummary[]) {
  const bySlug = new Map(integrations.map((item) => [item.slug, item]));

  return NEXUS_INTEGRATION_SLUGS.map((slug) => {
    const row = bySlug.get(slug);
    return (
      row ?? {
        id: slug,
        slug,
        display_name: integrationDisplayName(slug),
        status: "unknown",
        last_check_at: null,
        last_healthy_at: null,
        latency_ms: null,
        error_message: null,
        metadata: {},
      }
    );
  });
}

function recentAlerts(alerts: AlertsPayload | null) {
  return [...(alerts?.active ?? []), ...(alerts?.recent_history ?? [])]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 5);
}

function resolvedLast24h(incidents: IncidentsPayload | null) {
  return (incidents?.recent_history ?? []).filter((incident) =>
    isWithinHours(incident.resolved_at, 24),
  ).length;
}

function topObservations(observations: ObservationsPayload | null) {
  return [...(observations?.active ?? [])]
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, 4);
}

function latestTimestamp(...values: Array<string | null | undefined>) {
  const valid = values.filter((value): value is string => Boolean(value));
  if (valid.length === 0) {
    return null;
  }

  return valid.sort((a, b) => b.localeCompare(a))[0] ?? null;
}

export function NexusOverviewDashboard() {
  const { data, errors, loading, refresh } = useNexusOverview();

  const health = data.health as HealthPayload | null;
  const mission = data.missionHealth as MissionPayload | null;
  const metrics = data.metrics as MetricsPayload | null;
  const alerts = data.alerts as AlertsPayload | null;
  const incidents = data.incidents as IncidentsPayload | null;
  const observations = data.observations as ObservationsPayload | null;

  const systemStatus = health?.system?.status ?? "unknown";
  const workflows = mission?.workflows ?? [];
  const degradedWorkflows = workflows.filter((item) =>
    ["degraded", "impaired", "critical", "failing"].includes(
      String(item.workflow_status).toLowerCase(),
    ),
  );
  const integrations = integrationRows(health?.integrations ?? []);
  const lastUpdated = latestTimestamp(
    health?.system?.checked_at ?? undefined,
    mission?.checked_at ?? undefined,
    alerts?.collected_at,
    incidents?.collected_at,
    observations?.collected_at,
  );

  if (loading) {
    return <NexusLoadingPanel rows={6} />;
  }

  const hasData =
    health || mission || metrics || alerts || incidents || observations;

  return (
    <div className="space-y-5 overflow-x-hidden md:space-y-6">
      <div className="flex flex-col gap-3 border-b border-[#b4141e]/15 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">
            Last updated {formatDateTime(lastUpdated)}
          </p>
        </div>
        <NexusRefreshButton onClick={() => void refresh()} />
      </div>

      {errors.length > 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-200">
            Some intelligence feeds are unavailable. Partial data is shown below.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <NexusStatCard
          label="System Status"
          href="/admin/nexus/system-health"
          value={<span className="capitalize">{systemStatus}</span>}
          badge={<NexusStatusBadge label={systemStatus} />}
        />
        <NexusStatCard
          label="Mission Score"
          href="/admin/nexus/mission-health"
          value={formatNumber(mission?.score)}
          sublabel={mission?.status ?? "unknown"}
          badge={<NexusStatusBadge label={mission?.status ?? "unknown"} />}
        />
        <NexusStatCard
          label="Active Alerts"
          href="/admin/nexus/alerts"
          value={formatNumber(alerts?.counts?.active)}
          sublabel={`${alerts?.counts?.critical ?? 0} critical`}
        />
        <NexusStatCard
          label="Open Incidents"
          href="/admin/nexus/incidents"
          value={formatNumber(incidents?.open?.length)}
          sublabel={`${incidents?.counts?.investigating ?? 0} investigating`}
        />
        <NexusStatCard
          label="Observations"
          href="/admin/nexus/observations"
          value={formatNumber(observations?.counts?.active)}
          sublabel={`${observations?.counts?.critical ?? 0} critical`}
        />
        <NexusStatCard
          label="MRR"
          href="/admin/nexus/metrics"
          value={formatCurrency(metrics?.revenue?.estimated_mrr)}
          sublabel={`${formatNumber(metrics?.blackcard?.active_members)} Blackcard`}
        />
      </div>

      <NexusCommandPanel title="Integrations Status" href="/admin/nexus/system-health">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {integrations.map((integration) => (
            <div
              key={integration.slug}
              className="rounded-lg border border-[#b4141e]/20 bg-black/40 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-white">
                  {integrationDisplayName(integration.slug)}
                </p>
                <NexusStatusBadge label={integration.status} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-600">Latency</p>
                  <p className="mt-0.5 text-zinc-300">
                    {integration.latency_ms != null ? `${integration.latency_ms}ms` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-600">Checked</p>
                  <p className="mt-0.5 text-zinc-300">
                    {formatRelativeTime(integration.last_check_at)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </NexusCommandPanel>

      <div className="grid gap-4 xl:grid-cols-2">
        <NexusCommandPanel title="Mission Health" href="/admin/nexus/mission-health">
          <div className="mb-4 flex items-center justify-center rounded-xl border border-[#b4141e]/20 bg-black/50 py-6">
            <div className="text-center">
              <p className="text-5xl font-semibold text-white">{formatNumber(mission?.score)}</p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-[#e87a82]">
                Mission composite
              </p>
              <div className="mt-3 flex justify-center">
                <NexusStatusBadge label={mission?.status ?? "unknown"} />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {(degradedWorkflows.length > 0 ? degradedWorkflows : workflows.slice(0, 5)).map(
              (workflow) => (
                <div
                  key={workflow.slug}
                  className="flex items-center justify-between rounded-lg border border-[#b4141e]/15 bg-black/30 px-3 py-2"
                >
                  <span className="truncate text-sm text-zinc-300">{workflow.display_name}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <NexusStatusBadge label={workflow.workflow_status} />
                    <span className="text-xs text-zinc-500">{workflow.workflow_score ?? "—"}</span>
                  </div>
                </div>
              ),
            )}
          </div>
        </NexusCommandPanel>

        <NexusCommandPanel title="Highest Priority Observations" href="/admin/nexus/observations">
          {topObservations(observations).length === 0 ? (
            <p className="text-sm text-zinc-500">No active observations.</p>
          ) : (
            <div className="space-y-3">
              {topObservations(observations).map((observation) => (
                <div
                  key={observation.id}
                  className="rounded-lg border border-[#b4141e]/15 bg-black/30 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <NexusStatusBadge label={observation.severity} />
                    <NexusPriorityBadge tier={observation.priority_tier} />
                    <span className="text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                      Score {observation.priority_score}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-white">{observation.title}</p>
                  <div className="mt-3">
                    <NexusConfidenceIndicator value={observation.confidence} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </NexusCommandPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <NexusCommandPanel title="Alert & Incident Summary">
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-[#b4141e]/15 bg-black/30 p-3 text-center">
              <p className="text-xl font-semibold text-white">{formatNumber(alerts?.counts?.active)}</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-zinc-500">Active alerts</p>
            </div>
            <div className="rounded-lg border border-[#b4141e]/15 bg-black/30 p-3 text-center">
              <p className="text-xl font-semibold text-white">{formatNumber(incidents?.open?.length)}</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-zinc-500">Open incidents</p>
            </div>
          </div>
          {recentAlerts(alerts).length === 0 && (incidents?.open ?? []).length === 0 ? (
            <p className="text-sm text-zinc-500">No active triage items.</p>
          ) : (
            <div className="space-y-2">
              {recentAlerts(alerts).slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-lg border border-[#b4141e]/10 bg-black/25 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <NexusStatusBadge label={alert.severity} />
                    <span className="text-[9px] uppercase tracking-[0.14em] text-zinc-600">Alert</span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-300">{alert.title}</p>
                </div>
              ))}
              {(incidents?.open ?? []).slice(0, 2).map((incident) => (
                <div
                  key={incident.id}
                  className="rounded-lg border border-[#b4141e]/10 bg-black/25 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <NexusStatusBadge label={incident.severity} />
                    <span className="text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                      Incident
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-300">{incident.title}</p>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/admin/nexus/alerts"
              className="text-[10px] uppercase tracking-[0.18em] text-[#e87a82] hover:text-[#f1c3c7]"
            >
              Alerts →
            </Link>
            <Link
              href="/admin/nexus/incidents"
              className="text-[10px] uppercase tracking-[0.18em] text-[#e87a82] hover:text-[#f1c3c7]"
            >
              Incidents →
            </Link>
            <span className="text-[10px] text-zinc-600">
              {resolvedLast24h(incidents)} resolved in 24h
            </span>
          </div>
        </NexusCommandPanel>

        <NexusCommandPanel title="Business Intelligence" href="/admin/nexus/metrics">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: "Total users", value: formatNumber(metrics?.growth?.total_users) },
              { label: "New this week", value: formatNumber(metrics?.growth?.new_users_this_week) },
              { label: "Blackcard", value: formatNumber(metrics?.blackcard?.active_members) },
              { label: "MRR", value: formatCurrency(metrics?.revenue?.estimated_mrr) },
              { label: "ARR", value: formatCurrency(metrics?.revenue?.estimated_arr) },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-[#b4141e]/15 bg-black/30 p-3"
              >
                <p className="text-lg font-semibold text-white">{item.value}</p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-zinc-500">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </NexusCommandPanel>
      </div>

      {!hasData ? (
        <NexusEmptyState
          title="No Nexus intelligence available"
          description="Verify owner access and ensure Nexus collectors have run in production."
        />
      ) : null}
    </div>
  );
}

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
  NexusConfidenceIndicator,
  NexusLoadingPanel,
  NexusMetricCard,
  NexusOverviewSection,
  NexusPriorityBadge,
  NexusRefreshButton,
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
  growth?: {
    total_users?: number;
    new_users_this_week?: number;
  };
  blackcard?: {
    active_members?: number;
  };
  revenue?: {
    estimated_mrr?: number;
    estimated_arr?: number;
  };
};

type AlertsPayload = {
  counts?: {
    active?: number;
    critical?: number;
    warning?: number;
  };
  active?: NexusAlertSummaryRow[];
  recent_history?: NexusAlertSummaryRow[];
};

type IncidentsPayload = {
  counts?: {
    open?: number;
    investigating?: number;
    mitigated?: number;
  };
  open?: NexusIncidentSummaryRow[];
  recent_history?: NexusIncidentSummaryRow[];
};

type ObservationsPayload = {
  counts?: { active?: number; critical?: number; warning?: number };
  active?: NexusObservationSummaryRow[];
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
  const combined = [...(alerts?.active ?? []), ...(alerts?.recent_history ?? [])];
  return combined
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 4);
}

function resolvedLast24h(incidents: IncidentsPayload | null) {
  return (incidents?.recent_history ?? []).filter((incident) =>
    isWithinHours(incident.resolved_at, 24),
  ).length;
}

function topObservations(observations: ObservationsPayload | null) {
  return [...(observations?.active ?? [])]
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, 3);
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

  if (loading) {
    return <NexusLoadingPanel rows={6} />;
  }

  const hasData =
    health || mission || metrics || alerts || incidents || observations;

  return (
    <div className="space-y-8 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">
            Operational overview
          </p>
          <h2 className="mt-2 font-serif text-3xl text-white md:text-4xl">Command Center</h2>
        </div>
        <NexusRefreshButton onClick={() => void refresh()} />
      </div>

      {errors.length > 0 ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-200">
            Some intelligence feeds are unavailable. Partial data is shown below.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <NexusOverviewSection title="Platform Status" href="/admin/nexus/system-health">
          <div className="flex flex-wrap items-center gap-3">
            <NexusStatusBadge label={systemStatus} />
            <p className="text-4xl font-semibold capitalize text-white">{systemStatus}</p>
          </div>
          <p className="mt-3 text-sm text-zinc-500">
            Last checked {formatRelativeTime(health?.system?.checked_at)}
          </p>
        </NexusOverviewSection>

        <NexusOverviewSection title="Mission Health" href="/admin/nexus/mission-health">
          <div className="flex flex-wrap items-end gap-3">
            <NexusStatusBadge label={mission?.status ?? "unknown"} />
            <p className="text-4xl font-semibold text-white">
              {formatNumber(mission?.score)}
            </p>
            <span className="text-sm text-zinc-500">mission score</span>
          </div>
          <div className="mt-4 space-y-2">
            {(degradedWorkflows.length > 0 ? degradedWorkflows : workflows.slice(0, 4)).map(
              (workflow) => (
                <div
                  key={workflow.slug}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                >
                  <span className="text-sm text-zinc-300">{workflow.display_name}</span>
                  <div className="flex items-center gap-2">
                    <NexusStatusBadge label={workflow.workflow_status} />
                    <span className="text-xs text-zinc-500">
                      {workflow.workflow_score ?? "—"}
                    </span>
                  </div>
                </div>
              ),
            )}
          </div>
        </NexusOverviewSection>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <NexusMetricCard
          label="Alerts"
          href="/admin/nexus/alerts"
          value={formatNumber(alerts?.counts?.active)}
          hint={`${alerts?.counts?.critical ?? 0} critical · ${alerts?.counts?.warning ?? 0} warning`}
          badge={<NexusStatusBadge label="triage" tone="warning" />}
        />
        <NexusMetricCard
          label="Incidents"
          href="/admin/nexus/incidents"
          value={formatNumber(incidents?.open?.length)}
          hint={`${incidents?.counts?.investigating ?? 0} investigating · ${resolvedLast24h(incidents)} resolved 24h`}
        />
        <NexusMetricCard
          label="Observations"
          href="/admin/nexus/observations"
          value={formatNumber(observations?.counts?.active)}
          hint={`${observations?.counts?.critical ?? 0} critical patterns`}
        />
        <NexusMetricCard
          label="Business Intelligence"
          href="/admin/nexus/metrics"
          value={formatCurrency(metrics?.revenue?.estimated_mrr)}
          hint={`${formatNumber(metrics?.growth?.total_users)} users · ${formatNumber(metrics?.blackcard?.active_members)} Blackcard`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <NexusOverviewSection title="Alerts Activity" href="/admin/nexus/alerts">
          {recentAlerts(alerts).length === 0 ? (
            <p className="text-sm text-zinc-500">No recent alert activity.</p>
          ) : (
            <div className="space-y-2">
              {recentAlerts(alerts).map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <NexusStatusBadge label={alert.severity} />
                    <NexusStatusBadge label={alert.status} tone="neutral" />
                  </div>
                  <p className="mt-2 text-sm font-medium text-white">{alert.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Updated {formatRelativeTime(alert.updated_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </NexusOverviewSection>

        <NexusOverviewSection title="Highest Priority Observations" href="/admin/nexus/observations">
          {topObservations(observations).length === 0 ? (
            <p className="text-sm text-zinc-500">No active observations.</p>
          ) : (
            <div className="space-y-3">
              {topObservations(observations).map((observation) => (
                <div
                  key={observation.id}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <NexusStatusBadge label={observation.severity} />
                    <NexusPriorityBadge tier={observation.priority_tier} />
                  </div>
                  <p className="mt-2 text-sm font-medium text-white">{observation.title}</p>
                  <div className="mt-3">
                    <NexusConfidenceIndicator value={observation.confidence} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </NexusOverviewSection>
      </div>

      <NexusOverviewSection title="Business Intelligence" href="/admin/nexus/metrics">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Total users", value: formatNumber(metrics?.growth?.total_users) },
            {
              label: "New this week",
              value: formatNumber(metrics?.growth?.new_users_this_week),
            },
            {
              label: "Blackcard members",
              value: formatNumber(metrics?.blackcard?.active_members),
            },
            { label: "Estimated MRR", value: formatCurrency(metrics?.revenue?.estimated_mrr) },
            { label: "Estimated ARR", value: formatCurrency(metrics?.revenue?.estimated_arr) },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-white/10 bg-black/30 p-4"
            >
              <p className="text-2xl font-semibold text-white">{item.value}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </NexusOverviewSection>

      <NexusOverviewSection title="Integrations" href="/admin/nexus/system-health">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {integrations.map((integration) => (
            <div
              key={integration.slug}
              className="rounded-xl border border-white/10 bg-black/30 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-white">
                  {integrationDisplayName(integration.slug)}
                </p>
                <NexusStatusBadge label={integration.status} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-500">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em]">Latency</p>
                  <p className="mt-1 text-sm text-zinc-300">
                    {integration.latency_ms != null
                      ? `${integration.latency_ms}ms`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em]">Last check</p>
                  <p className="mt-1 text-sm text-zinc-300">
                    {formatDateTime(integration.last_check_at)}
                  </p>
                </div>
              </div>
              {integration.error_message ? (
                <p className="mt-3 text-xs text-red-300">{integration.error_message}</p>
              ) : null}
            </div>
          ))}
        </div>
      </NexusOverviewSection>

      <div className="flex flex-wrap gap-2">
        {[
          { href: "/admin/nexus/system-health", label: "System Health" },
          { href: "/admin/nexus/mission-health", label: "Mission Health" },
          { href: "/admin/nexus/metrics", label: "Metrics" },
          { href: "/admin/nexus/alerts", label: "Alerts" },
          { href: "/admin/nexus/incidents", label: "Incidents" },
          { href: "/admin/nexus/observations", label: "Observations" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full border border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-zinc-400 transition hover:border-[#b4141e]/50 hover:text-[#f1c3c7]"
          >
            {item.label}
          </Link>
        ))}
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

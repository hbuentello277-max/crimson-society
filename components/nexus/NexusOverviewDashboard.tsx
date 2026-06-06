"use client";

import Link from "next/link";
import type { NexusAlertSummaryRow } from "@/lib/alerts/types";
import type { NexusIncidentSummaryRow } from "@/lib/incidents/types";
import type { NexusObservationSummaryRow } from "@/lib/observations/types";
import type { NexusEventFeedRow } from "@/lib/nexus/events-summary";
import type { NexusHealthIntegrationSummary } from "@/lib/monitoring/health-summary";
import type { IntegrationHealthStatus } from "@/lib/monitoring/types";
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
  NexusCommandFrame,
  NexusCommandPanel,
  NexusLoadingPanel,
  NexusMiniStat,
  NexusPanelHeader,
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
  checked_at?: string | null;
  workflows?: Array<{
    slug: string;
    display_name: string;
    workflow_status: string;
    workflow_score: number | null;
  }>;
};

type MetricsPayload = {
  growth?: { total_users?: number; new_users_this_week?: number };
  blackcard?: { active_members?: number };
  revenue?: { estimated_mrr?: number; estimated_arr?: number };
  activity?: {
    posts_today?: number;
    meets_today?: number;
    messages_today?: number;
    posts_this_week?: number;
    meets_this_week?: number;
    messages_this_week?: number;
  };
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

type EventsPayload = {
  events?: NexusEventFeedRow[];
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
        status: "unknown" as IntegrationHealthStatus,
        last_check_at: null,
        last_healthy_at: null,
        latency_ms: null,
        error_message: null,
        metadata: {},
      }
    );
  });
}

function isDegradedIntegration(status: string) {
  return ["down", "degraded", "failing", "error", "unknown"].includes(status.toLowerCase());
}

function isDegradedWorkflow(status: string) {
  return ["degraded", "impaired", "critical", "failing"].includes(status.toLowerCase());
}

function topObservations(observations: ObservationsPayload | null) {
  return [...(observations?.active ?? [])]
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, 3);
}

function resolvedLast24h(incidents: IncidentsPayload | null) {
  return (incidents?.recent_history ?? []).filter((incident) =>
    isWithinHours(incident.resolved_at, 24),
  ).length;
}

function latestTimestamp(...values: Array<string | null | undefined>) {
  const valid = values.filter((value): value is string => Boolean(value));
  if (valid.length === 0) {
    return null;
  }

  return valid.sort((a, b) => b.localeCompare(a))[0] ?? null;
}

function IntegrationCell({ integration }: { integration: NexusHealthIntegrationSummary }) {
  const degraded = isDegradedIntegration(integration.status);

  return (
    <div
      className={`rounded-md border px-2.5 py-2 ${
        degraded
          ? "border-red-500/35 bg-red-500/[0.06] shadow-[0_0_12px_rgba(220,38,38,0.12)]"
          : "border-[#b4141e]/20 bg-black/50"
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-[11px] font-medium leading-tight text-white">
          {integrationDisplayName(integration.slug)}
        </p>
        <NexusStatusBadge label={integration.status} />
      </div>
      <div className="mt-1.5 flex justify-between text-[9px] text-zinc-500">
        <span>{integration.latency_ms != null ? `${integration.latency_ms}ms` : "—"}</span>
        <span>{formatRelativeTime(integration.last_check_at)}</span>
      </div>
      {degraded && integration.error_message ? (
        <p className="mt-1.5 line-clamp-2 text-[10px] leading-snug text-red-300">
          {integration.error_message}
        </p>
      ) : null}
    </div>
  );
}

export function NexusOverviewDashboard() {
  const { data, errors, loading, refresh } = useNexusOverview();

  const health = data.health as HealthPayload | null;
  const mission = data.missionHealth as MissionPayload | null;
  const metrics = data.metrics as MetricsPayload | null;
  const alerts = data.alerts as AlertsPayload | null;
  const incidents = data.incidents as IncidentsPayload | null;
  const observations = data.observations as ObservationsPayload | null;
  const events = data.events as EventsPayload | null;

  const systemStatus = health?.system?.status ?? "unknown";
  const workflows = mission?.workflows ?? [];
  const integrations = integrationRows(health?.integrations ?? []);
  const degradedCount = integrations.filter((item) => isDegradedIntegration(item.status)).length;
  const lastUpdated = latestTimestamp(
    health?.system?.checked_at ?? undefined,
    mission?.checked_at ?? undefined,
    alerts?.collected_at,
    incidents?.collected_at,
    observations?.collected_at,
    events?.collected_at,
  );

  if (loading) {
    return <NexusLoadingPanel rows={4} />;
  }

  const hasData =
    health || mission || metrics || alerts || incidents || observations || events;

  return (
    <div className="overflow-x-hidden">
      <NexusCommandFrame>
        <div className="flex items-center justify-between gap-2 border-b border-[#b4141e]/15 px-3 py-2">
          <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">
            Updated {formatDateTime(lastUpdated)}
          </p>
          <NexusRefreshButton onClick={() => void refresh()} />
        </div>

        {errors.length > 0 ? (
          <div className="border-b border-amber-500/20 bg-amber-500/10 px-3 py-2">
            <p className="text-[11px] text-amber-200">Partial feed — some sources unavailable.</p>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-1.5 border-b border-[#b4141e]/15 p-2 sm:grid-cols-3 lg:grid-cols-6">
          <NexusStatCard
            compact
            label="System"
            href="/admin/nexus/system-health"
            value={<span className="capitalize">{systemStatus}</span>}
          />
          <NexusStatCard
            compact
            label="Mission"
            href="/admin/nexus/mission-health"
            value={formatNumber(mission?.score)}
            sublabel={mission?.status ?? "—"}
          />
          <NexusStatCard
            compact
            label="Alerts"
            href="/admin/nexus/alerts"
            value={formatNumber(alerts?.counts?.active)}
            sublabel={`${alerts?.counts?.critical ?? 0} crit`}
          />
          <NexusStatCard
            compact
            label="Incidents"
            href="/admin/nexus/incidents"
            value={formatNumber(incidents?.open?.length)}
            sublabel={`${incidents?.counts?.investigating ?? 0} inv`}
          />
          <NexusStatCard
            compact
            label="Observations"
            href="/admin/nexus/observations"
            value={formatNumber(observations?.counts?.active)}
            sublabel={`${observations?.counts?.critical ?? 0} crit`}
          />
          <NexusStatCard
            compact
            label="MRR"
            href="/admin/nexus/metrics"
            value={formatCurrency(metrics?.revenue?.estimated_mrr)}
            sublabel={`${formatNumber(metrics?.blackcard?.active_members)} BC`}
          />
        </div>

        <NexusCommandPanel title="Integration Grid" href="/admin/nexus/system-health">
          <div className="mb-2 flex items-center justify-between rounded-md border border-[#b4141e]/20 bg-black/40 px-2.5 py-1.5">
            <span className="text-[9px] uppercase tracking-[0.16em] text-zinc-500">System scan</span>
            <span className="text-[10px] text-zinc-300">
              <span className="capitalize text-white">{systemStatus}</span>
              {degradedCount > 0 ? (
                <span className="text-red-300"> · {degradedCount} degraded</span>
              ) : null}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {integrations.map((integration) => (
              <IntegrationCell key={integration.slug} integration={integration} />
            ))}
          </div>
        </NexusCommandPanel>

        <div className="grid border-t border-[#b4141e]/15 lg:grid-cols-2">
          <NexusCommandPanel title="Mission Monitor" href="/admin/nexus/mission-health">
            <div className="flex gap-3">
              <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border border-[#b4141e]/40 bg-black/60 shadow-[0_0_16px_rgba(180,20,30,0.15)]">
                <p className="text-2xl font-semibold text-white">{formatNumber(mission?.score)}</p>
                <p className="text-[7px] uppercase tracking-[0.14em] text-zinc-500">Score</p>
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <NexusStatusBadge label={mission?.status ?? "unknown"} />
                {workflows.slice(0, 4).map((workflow) => {
                  const degraded = isDegradedWorkflow(workflow.workflow_status);

                  return (
                    <div
                      key={workflow.slug}
                      className={`flex items-center justify-between rounded px-2 py-1 text-[10px] ${
                        degraded
                          ? "border border-red-500/30 bg-red-500/10"
                          : "border border-[#b4141e]/10 bg-black/30"
                      }`}
                    >
                      <span className="truncate text-zinc-300">{workflow.display_name}</span>
                      <span className="ml-2 shrink-0 text-zinc-500">
                        {workflow.workflow_score ?? "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </NexusCommandPanel>

          <NexusCommandPanel title="Intelligence Findings" href="/admin/nexus/observations">
            {topObservations(observations).length === 0 ? (
              <p className="text-[11px] text-zinc-500">No active observations.</p>
            ) : (
              <div className="space-y-1.5">
                {topObservations(observations).map((observation) => (
                  <div
                    key={observation.id}
                    className="rounded-md border border-[#b4141e]/15 bg-black/40 px-2.5 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-1">
                      <NexusStatusBadge label={observation.severity} />
                      <NexusPriorityBadge tier={observation.priority_tier} />
                      <span className="text-[8px] text-zinc-600">
                        {Math.round(observation.confidence * 100)}%
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-[11px] font-medium text-white">
                      {observation.title}
                    </p>
                    {observation.summary ? (
                      <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-zinc-500">
                        {observation.summary}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </NexusCommandPanel>
        </div>

        <div className="grid border-t border-[#b4141e]/15 lg:grid-cols-2">
          <NexusCommandPanel title="Triage Status">
            <div className="mb-2 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
              <NexusMiniStat label="Active" value={formatNumber(alerts?.counts?.active)} />
              <NexusMiniStat
                label="Critical"
                value={formatNumber(alerts?.counts?.critical)}
                tone="critical"
              />
              <NexusMiniStat label="Open" value={formatNumber(incidents?.open?.length)} />
              <NexusMiniStat
                label="Investigating"
                value={formatNumber(incidents?.counts?.investigating)}
                tone="warning"
              />
              <NexusMiniStat label="Resolved 24h" value={resolvedLast24h(incidents)} />
            </div>
            <div className="flex gap-2 text-[9px] uppercase tracking-[0.14em]">
              <Link href="/admin/nexus/alerts" className="text-[#e87a82] hover:text-[#f1c3c7]">
                Alerts
              </Link>
              <Link href="/admin/nexus/incidents" className="text-[#e87a82] hover:text-[#f1c3c7]">
                Incidents
              </Link>
            </div>
          </NexusCommandPanel>

          <NexusCommandPanel title="Business Intel" href="/admin/nexus/metrics">
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
              {[
                { label: "Users", value: formatNumber(metrics?.growth?.total_users) },
                { label: "New/wk", value: formatNumber(metrics?.growth?.new_users_this_week) },
                { label: "Blackcard", value: formatNumber(metrics?.blackcard?.active_members) },
                { label: "MRR", value: formatCurrency(metrics?.revenue?.estimated_mrr) },
                { label: "ARR", value: formatCurrency(metrics?.revenue?.estimated_arr) },
              ].map((item) => (
                <NexusMiniStat key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {[
                { label: "Posts", value: formatNumber(metrics?.activity?.posts_today) },
                { label: "Meets", value: formatNumber(metrics?.activity?.meets_today) },
                { label: "Messages", value: formatNumber(metrics?.activity?.messages_today) },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-md border border-[#b4141e]/15 bg-black/30 px-2 py-1.5 text-center"
                >
                  <p className="text-xs font-medium text-white">{item.value}</p>
                  <p className="text-[8px] uppercase tracking-[0.12em] text-zinc-600">
                    {item.label} today
                  </p>
                </div>
              ))}
            </div>
          </NexusCommandPanel>
        </div>

        <section className="border-t border-[#b4141e]/15">
          <NexusPanelHeader title="Live Activity Feed" />
          <div className="space-y-1 p-2">
            {(events?.events ?? []).length === 0 ? (
              <p className="px-1 py-3 text-center text-[11px] text-zinc-500">
                No recent Nexus events recorded.
              </p>
            ) : (
              (events?.events ?? []).map((event) => (
                <div
                  key={event.id}
                  className="flex gap-2 rounded-md border border-[#b4141e]/10 bg-black/30 px-2.5 py-2"
                >
                  <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b4141e]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <NexusStatusBadge label={event.severity} />
                      <span className="text-[8px] uppercase tracking-[0.12em] text-zinc-600">
                        {event.category}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-200">{event.title}</p>
                    {event.description ? (
                      <p className="line-clamp-1 text-[10px] text-zinc-500">{event.description}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-[9px] text-zinc-600">
                    {formatRelativeTime(event.occurred_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </NexusCommandFrame>

      {!hasData ? (
        <div className="mt-4">
          <NexusEmptyState
            title="No Nexus intelligence available"
            description="Verify owner access and ensure Nexus collectors have run in production."
          />
        </div>
      ) : null}
    </div>
  );
}

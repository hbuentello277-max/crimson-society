"use client";

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
} from "@/lib/nexus/format";
import { NEXUS_INTEGRATION_SLUGS } from "@/lib/nexus/constants";
import { NEXUS_LABELS, formatNexusDisplayText } from "@/lib/nexus/terminology";
import { NexusEmptyState } from "@/components/nexus/NexusEmptyState";
import {
  NexusDensePanel,
  NexusFeedRow,
  NexusMicroRow,
  NexusStatusChip,
} from "@/components/nexus/NexusCommandUI";
import { NexusMissionRing } from "@/components/nexus/NexusMissionRing";
import { NexusPriorityBadge } from "@/components/nexus/NexusShared";
import { NexusStatusBadge } from "@/components/nexus/NexusStatusBadge";
import { NexusLoadingPanel, NexusRefreshButton } from "@/components/nexus/NexusShared";
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
  };
};

type AlertsPayload = {
  counts?: { active?: number; critical?: number; warning?: number };
  active?: NexusAlertSummaryRow[];
  collected_at?: string;
};

type IncidentsPayload = {
  counts?: { open?: number; investigating?: number };
  open?: NexusIncidentSummaryRow[];
  collected_at?: string;
};

type ObservationsPayload = {
  counts?: { active?: number; critical?: number };
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

function isDegraded(status: string) {
  return ["down", "degraded", "failing", "error", "unknown"].includes(status.toLowerCase());
}

function isDegradedWorkflow(status: string) {
  return ["degraded", "impaired", "critical", "failing"].includes(status.toLowerCase());
}

function systemTone(status: string): "healthy" | "warning" | "critical" | "default" {
  const s = status.toLowerCase();
  if (["operational", "healthy", "nominal"].includes(s)) return "healthy";
  if (["degraded", "impaired", "warning"].includes(s)) return "warning";
  if (["critical", "down", "failing"].includes(s)) return "critical";
  return "default";
}

function topObservations(observations: ObservationsPayload | null) {
  return [...(observations?.active ?? [])]
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, 2);
}

function latestTimestamp(...values: Array<string | null | undefined>) {
  const valid = values.filter((v): v is string => Boolean(v));
  return valid.sort((a, b) => b.localeCompare(a))[0] ?? null;
}

function infrastructureChipValue(systemStatus: string, degradedCount: number) {
  if (degradedCount > 0) {
    return `${degradedCount} issue${degradedCount === 1 ? "" : "s"}`;
  }

  return <span className="capitalize">{systemStatus}</span>;
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
  const workflowStatus = mission?.status ?? "unknown";
  const workflows = mission?.workflows ?? [];
  const integrations = integrationRows(health?.integrations ?? []);
  const degradedIntegrations = integrations.filter((item) => isDegraded(item.status));
  const degradedWorkflows = workflows.filter((wf) => isDegradedWorkflow(wf.workflow_status));
  const lastUpdated = latestTimestamp(
    health?.system?.checked_at,
    mission?.checked_at,
    alerts?.collected_at,
    incidents?.collected_at,
    observations?.collected_at,
    events?.collected_at,
  );

  if (loading) {
    return <NexusLoadingPanel rows={3} />;
  }

  const hasData = health || mission || metrics || alerts || incidents || observations || events;

  return (
    <div className="flex h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-5.5rem)] min-h-[32rem] flex-col gap-1 overflow-hidden lg:h-[calc(100dvh-env(safe-area-inset-top)-4.5rem)]">
      <div className="flex shrink-0 items-center justify-between gap-2 rounded border border-[#b4141e]/25 bg-[#060405]/90 px-2 py-1">
        <p className="truncate text-[8px] uppercase tracking-[0.14em] text-zinc-500">
          {NEXUS_LABELS.operationsOverview} · Sync {formatDateTime(lastUpdated)}
        </p>
        <div className="flex items-center gap-2">
          {errors.length > 0 ? (
            <span className="text-[8px] uppercase tracking-[0.1em] text-amber-400">Partial</span>
          ) : null}
          {(degradedIntegrations.length > 0 || degradedWorkflows.length > 0) && (
            <span className="text-[8px] uppercase tracking-[0.1em] text-red-400">
              {degradedIntegrations.length > 0
                ? `${NEXUS_LABELS.infrastructure}: ${degradedIntegrations.length}`
                : null}
              {degradedIntegrations.length > 0 && degradedWorkflows.length > 0 ? " · " : null}
              {degradedWorkflows.length > 0
                ? `${NEXUS_LABELS.userWorkflows}: ${degradedWorkflows.length}`
                : null}
            </span>
          )}
          <NexusRefreshButton onClick={() => void refresh()} />
        </div>
      </div>

      <div className="flex shrink-0 gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <NexusStatusChip
          label={NEXUS_LABELS.infrastructure}
          value={infrastructureChipValue(systemStatus, degradedIntegrations.length)}
          href="/admin/nexus/system-health"
          pulse={degradedIntegrations.length > 0}
          tone={
            degradedIntegrations.length > 0
              ? "critical"
              : systemTone(systemStatus)
          }
        />
        <NexusStatusChip
          label={NEXUS_LABELS.userWorkflows}
          value={<span className="capitalize">{workflowStatus}</span>}
          href="/admin/nexus/mission-health"
          pulse={degradedWorkflows.length > 0}
          tone={systemTone(workflowStatus)}
        />
        <NexusStatusChip
          label={NEXUS_LABELS.workflowHealthScore}
          value={formatNumber(mission?.score)}
          href="/admin/nexus/mission-health"
          tone={systemTone(workflowStatus)}
        />
        <NexusStatusChip
          label="MRR"
          value={formatCurrency(metrics?.revenue?.estimated_mrr)}
          href="/admin/nexus/metrics"
        />
        <NexusStatusChip
          label="Alerts"
          value={formatNumber(alerts?.counts?.active)}
          href="/admin/nexus/alerts"
          tone={(alerts?.counts?.critical ?? 0) > 0 ? "critical" : "default"}
        />
        <NexusStatusChip
          label="Incidents"
          value={formatNumber(incidents?.open?.length)}
          href="/admin/nexus/incidents"
          tone={(incidents?.open?.length ?? 0) > 0 ? "warning" : "default"}
        />
        <NexusStatusChip
          label={NEXUS_LABELS.insights}
          value={formatNumber(observations?.counts?.active)}
          href="/admin/nexus/observations"
          tone={(observations?.counts?.critical ?? 0) > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-1 overflow-hidden lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)_minmax(0,0.85fr)] lg:grid-rows-1">
        <NexusDensePanel
          title={NEXUS_LABELS.userWorkflowMonitor}
          href="/admin/nexus/mission-health"
          className="min-h-0"
          bodyClassName="flex flex-col items-center justify-center gap-1 overflow-y-auto"
          collapsible
          defaultOpen
        >
          <NexusMissionRing score={mission?.score} status={mission?.status} size={76} />
          <div className="w-full space-y-0.5">
            {workflows.slice(0, 5).map((wf) => (
              <NexusMicroRow
                key={wf.slug}
                label={wf.display_name}
                value={wf.workflow_score ?? "—"}
                badge={wf.workflow_status}
                alert={isDegradedWorkflow(wf.workflow_status)}
              />
            ))}
          </div>
        </NexusDensePanel>

        <div className="flex min-h-0 flex-col gap-1 overflow-hidden">
          <NexusDensePanel
            title={NEXUS_LABELS.infrastructure}
            href="/admin/nexus/system-health"
            className="min-h-0 shrink-0 lg:max-h-[42%]"
            bodyClassName="grid grid-cols-2 gap-0.5 overflow-y-auto sm:grid-cols-3"
            collapsible
            defaultOpen
          >
            {integrations.map((item) => {
              const degraded = isDegraded(item.status);
              return (
                <div
                  key={item.slug}
                  className={`rounded px-1.5 py-1 ${
                    degraded ? "border border-red-500/30 bg-red-500/10" : "bg-black/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-0.5">
                    <span className="truncate text-[9px] text-white">
                      {integrationDisplayName(item.slug)}
                    </span>
                    <NexusStatusBadge label={item.status} />
                  </div>
                  <p className="text-[8px] text-zinc-600">
                    {item.latency_ms != null ? `${item.latency_ms}ms` : "—"} ·{" "}
                    {formatRelativeTime(item.last_check_at)}
                  </p>
                  {degraded && item.error_message ? (
                    <p className="mt-0.5 line-clamp-2 text-[8px] leading-tight text-red-300">
                      {item.error_message}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </NexusDensePanel>

          <NexusDensePanel
            title="Revenue & Activity"
            href="/admin/nexus/metrics"
            className="min-h-0 flex-1"
            bodyClassName="overflow-y-auto"
            collapsible
            defaultOpen
          >
            <div className="grid grid-cols-4 gap-0.5 sm:grid-cols-7">
              {[
                { l: "Users", v: formatNumber(metrics?.growth?.total_users) },
                { l: "+Wk", v: formatNumber(metrics?.growth?.new_users_this_week) },
                { l: "BC", v: formatNumber(metrics?.blackcard?.active_members) },
                { l: "MRR", v: formatCurrency(metrics?.revenue?.estimated_mrr) },
                { l: "ARR", v: formatCurrency(metrics?.revenue?.estimated_arr) },
                { l: "Posts", v: formatNumber(metrics?.activity?.posts_today) },
                { l: "Msgs", v: formatNumber(metrics?.activity?.messages_today) },
              ].map((item) => (
                <div
                  key={item.l}
                  className="rounded border border-[#b4141e]/15 bg-black/40 px-1 py-1 text-center"
                >
                  <p className="text-[10px] font-medium text-white">{item.v}</p>
                  <p className="text-[7px] uppercase text-zinc-600">{item.l}</p>
                </div>
              ))}
            </div>
            <div className="mt-1">
              <NexusMicroRow label="Meets today" value={formatNumber(metrics?.activity?.meets_today)} />
            </div>
          </NexusDensePanel>
        </div>

        <div className="flex min-h-0 flex-col gap-1 overflow-hidden">
          <NexusDensePanel
            title="Response Queue"
            href="/admin/nexus/alerts"
            className="min-h-0 flex-1"
            bodyClassName="space-y-0.5 overflow-y-auto"
            collapsible
            defaultOpen
          >
            {(alerts?.active ?? []).length === 0 && (incidents?.open ?? []).length === 0 ? (
              <p className="py-2 text-center text-[10px] text-zinc-600">No open alerts or incidents</p>
            ) : (
              <>
                {(alerts?.active ?? []).slice(0, 3).map((alert) => (
                  <NexusFeedRow
                    key={alert.id}
                    title={formatNexusDisplayText(alert.title)}
                    meta="alert"
                    severity={alert.severity}
                    time={formatRelativeTime(alert.updated_at)}
                  />
                ))}
                {(incidents?.open ?? []).slice(0, 2).map((inc) => (
                  <NexusFeedRow
                    key={inc.id}
                    title={formatNexusDisplayText(inc.title)}
                    meta="incident"
                    severity={inc.severity}
                    time={formatRelativeTime(inc.started_at)}
                  />
                ))}
              </>
            )}
          </NexusDensePanel>

          <NexusDensePanel
            title={NEXUS_LABELS.insights}
            href="/admin/nexus/observations"
            className="min-h-0 shrink-0"
            bodyClassName="space-y-1 overflow-y-auto"
            collapsible
            defaultOpen
          >
            {topObservations(observations).length === 0 ? (
              <p className="text-[10px] text-zinc-600">No active insights</p>
            ) : (
              topObservations(observations).map((obs) => (
                <div key={obs.id} className="rounded bg-black/40 px-1.5 py-1">
                  <div className="flex flex-wrap gap-1">
                    <NexusStatusBadge label={obs.severity} />
                    <NexusPriorityBadge tier={obs.priority_tier} />
                    <span className="text-[8px] text-zinc-600">{Math.round(obs.confidence * 100)}%</span>
                  </div>
                  <p className="line-clamp-1 text-[10px] text-white">
                    {formatNexusDisplayText(obs.title)}
                  </p>
                  {obs.summary ? (
                    <p className="line-clamp-1 text-[9px] text-zinc-500">
                      {formatNexusDisplayText(obs.summary)}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </NexusDensePanel>
        </div>
      </div>

      <NexusDensePanel
        title="Live Feed"
        className="min-h-0 max-h-[22%] shrink-0"
        bodyClassName="overflow-y-auto"
        collapsible
        defaultOpen={false}
      >
        {(events?.events ?? []).length === 0 ? (
          <p className="py-2 text-center text-[10px] text-zinc-600">No events</p>
        ) : (
          (events?.events ?? []).slice(0, 6).map((event) => (
            <NexusFeedRow
              key={event.id}
              title={formatNexusDisplayText(event.title)}
              meta={event.category}
              severity={event.severity}
              time={formatRelativeTime(event.occurred_at)}
            />
          ))
        )}
      </NexusDensePanel>

      {!hasData ? (
        <NexusEmptyState
          title="No Nexus data"
          description="Verify owner access and collectors."
        />
      ) : null}
    </div>
  );
}

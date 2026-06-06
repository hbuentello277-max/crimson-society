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
} from "@/lib/nexus/format";
import { NEXUS_INTEGRATION_SLUGS } from "@/lib/nexus/constants";
import { NEXUS_LABELS, formatNexusDisplayText } from "@/lib/nexus/terminology";
import { NexusEmptyState } from "@/components/nexus/NexusEmptyState";
import {
  NexusActivityTile,
  NexusDensePanel,
  NexusFeedRow,
  NexusInsightCard,
  NexusIntegrationCard,
  NexusMicroRow,
  NexusOverviewMetricCard,
  NexusQueueSlot,
} from "@/components/nexus/NexusCommandUI";
import { NexusWorkflowHealthBar } from "@/components/nexus/NexusWorkflowHealthBar";
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

function toneToCardTone(
  tone: "healthy" | "warning" | "critical" | "default",
): "healthy" | "warning" | "critical" | "default" {
  return tone;
}

function topObservations(observations: ObservationsPayload | null) {
  return [...(observations?.active ?? [])]
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, 3);
}

function latestTimestamp(...values: Array<string | null | undefined>) {
  const valid = values.filter((v): v is string => Boolean(v));
  return valid.sort((a, b) => b.localeCompare(a))[0] ?? null;
}

function infrastructureChipValue(systemStatus: string, degradedCount: number) {
  if (degradedCount > 0) {
    return `${degradedCount} Issue${degradedCount === 1 ? "" : "s"}`;
  }

  return <span className="capitalize">{systemStatus}</span>;
}

function workflowChipValue(status: string) {
  const normalized = status.toLowerCase();
  if (["degraded", "impaired", "warning"].includes(normalized)) {
    return "Degraded Status";
  }
  return <span className="capitalize">{status}</span>;
}

function workflowHealthValue(score: number | null | undefined) {
  if (typeof score === "number" && Number.isFinite(score)) {
    return `${score}% Score`;
  }
  return "—";
}

function mrrValue(mrr: number | null | undefined) {
  const formatted = formatCurrency(mrr);
  if (formatted === "—" || formatted === "$0") {
    return formatted === "—" ? "—" : "$0 Monthly";
  }
  return `${formatted} Monthly`;
}

function buildInsightCards(
  degradedIntegrations: number,
  degradedWorkflows: number,
  mrr: number | null | undefined,
  observations: ObservationsPayload | null,
) {
  const cards: Array<{ title: string; summary: string; tone: "healthy" | "warning" | "revenue" }> =
    [];

  if (degradedIntegrations === 0) {
    cards.push({
      title: "All critical systems operational",
      summary: "Infrastructure is stable",
      tone: "healthy",
    });
  }

  if (degradedWorkflows > 0) {
    cards.push({
      title: "User workflows need attention",
      summary: `${degradedWorkflows} workflow${degradedWorkflows === 1 ? "" : "s"} degraded`,
      tone: "warning",
    });
  }

  const formattedMrr = formatCurrency(mrr);
  if (formattedMrr !== "—") {
    cards.push({
      title: "Revenue steady",
      summary: `MRR holding at ${formattedMrr}`,
      tone: "revenue",
    });
  }

  for (const obs of topObservations(observations)) {
    cards.push({
      title: formatNexusDisplayText(obs.title),
      summary: formatNexusDisplayText(obs.summary ?? ""),
      tone: obs.severity === "critical" ? "warning" : "healthy",
    });
  }

  return cards.slice(0, 4);
}

export function NexusOverviewDashboard({ showFounderLink = false }: { showFounderLink?: boolean }) {
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
  const insightCards = buildInsightCards(
    degradedIntegrations.length,
    degradedWorkflows.length,
    metrics?.revenue?.estimated_mrr,
    observations,
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto">
      {showFounderLink ? (
        <div className="flex items-center justify-start">
          <Link
            href="/admin/nexus"
            className="rounded-lg border border-[#b4141e]/40 bg-[#b4141e]/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[#f1c3c7] transition hover:bg-[#b4141e]/20"
          >
            Founder
          </Link>
        </div>
      ) : null}
      <NexusDensePanel
        title={NEXUS_LABELS.operationsOverview}
        collapsible
        compact
        defaultOpen
        headerAction={
          <div className="flex min-w-0 items-center gap-2">
            <p className="hidden max-w-[9rem] truncate text-[9px] uppercase tracking-[0.1em] text-zinc-500 sm:block">
              {formatRelativeTime(lastUpdated) || formatDateTime(lastUpdated)}
            </p>
            {errors.length > 0 ? (
              <span className="text-[9px] uppercase tracking-[0.1em] text-amber-400">Partial</span>
            ) : null}
            <NexusRefreshButton compact onClick={() => void refresh()} />
          </div>
        }
      >
        <p className="mb-2.5 text-[9px] uppercase tracking-[0.1em] text-zinc-500 sm:hidden">
          Last sync: {formatRelativeTime(lastUpdated) || formatDateTime(lastUpdated)}
        </p>
        <div className="grid min-w-0 grid-cols-2 gap-2">
          <NexusOverviewMetricCard
            label={NEXUS_LABELS.infrastructure}
            value={infrastructureChipValue(systemStatus, degradedIntegrations.length)}
            href="/admin/nexus/system-health"
            tone={
              degradedIntegrations.length > 0
                ? "critical"
                : toneToCardTone(systemTone(systemStatus))
            }
          />
          <NexusOverviewMetricCard
            label={NEXUS_LABELS.userWorkflows}
            value={workflowChipValue(workflowStatus)}
            href="/admin/nexus/mission-health"
            tone={toneToCardTone(systemTone(workflowStatus))}
          />
          <NexusOverviewMetricCard
            label={NEXUS_LABELS.workflowHealthScore}
            value={workflowHealthValue(mission?.score)}
            href="/admin/nexus/mission-health"
            tone="healthy"
          />
          <NexusOverviewMetricCard
            label="MRR"
            value={mrrValue(metrics?.revenue?.estimated_mrr)}
            href="/admin/nexus/metrics"
            tone="revenue"
          />
        </div>
      </NexusDensePanel>

      <NexusDensePanel
        title={NEXUS_LABELS.userWorkflowMonitor}
        href="/admin/nexus/mission-health"
        collapsible
        defaultOpen
      >
        <NexusWorkflowHealthBar
          score={mission?.score}
          status={mission?.status}
          workflows={workflows}
        />
        <div className="mt-4 space-y-2">
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

      <NexusDensePanel
        title={NEXUS_LABELS.infrastructure}
        href="/admin/nexus/system-health"
        collapsible
        defaultOpen
        bodyClassName="grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        {integrations.map((item) => {
          const degraded = isDegraded(item.status);
          return (
            <NexusIntegrationCard
              key={item.slug}
              name={integrationDisplayName(item.slug)}
              latency={item.latency_ms != null ? `${item.latency_ms}ms` : "—"}
              status={item.status}
              checkedAt={formatRelativeTime(item.last_check_at) || "—"}
              errorMessage={item.error_message}
              degraded={degraded}
            />
          );
        })}
      </NexusDensePanel>

      <NexusDensePanel
        title="Revenue & Activity"
        href="/admin/nexus/metrics"
        collapsible
        defaultOpen
        bodyClassName="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        <NexusActivityTile label="Users" value={formatNumber(metrics?.growth?.total_users)} />
        <NexusActivityTile
          label="New This Week"
          value={formatNumber(metrics?.growth?.new_users_this_week)}
        />
        <NexusActivityTile
          label="Blackcard"
          value={formatNumber(metrics?.blackcard?.active_members)}
        />
        <NexusActivityTile
          label="MRR"
          value={formatCurrency(metrics?.revenue?.estimated_mrr)}
        />
        <NexusActivityTile
          label="ARR"
          value={formatCurrency(metrics?.revenue?.estimated_arr)}
        />
        <NexusActivityTile
          label="Posts Today"
          value={formatNumber(metrics?.activity?.posts_today)}
        />
        <NexusActivityTile
          label="Messages"
          value={formatNumber(metrics?.activity?.messages_today)}
        />
        <NexusActivityTile
          label="Meets Today"
          value={formatNumber(metrics?.activity?.meets_today)}
        />
      </NexusDensePanel>

      <NexusDensePanel
        title="Response Queue"
        href="/admin/nexus/alerts"
        collapsible
        defaultOpen
      >
        {(alerts?.active ?? []).length === 0 && (incidents?.open ?? []).length === 0 ? (
          <div className="flex gap-3">
            <NexusQueueSlot
              label="alerts"
              empty
              icon={
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <path d="M10 3.5a4 4 0 0 1 4 4v2.5l1.5 2.5H4.5L6 10V7.5a4 4 0 0 1 4-4Z" />
                </svg>
              }
            />
            <NexusQueueSlot
              label="incidents"
              empty
              icon={
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <path d="M10 3.5 16.5 15.5H3.5L10 3.5Z" strokeLinejoin="round" />
                </svg>
              }
            />
          </div>
        ) : (
          <div className="space-y-1">
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
          </div>
        )}
      </NexusDensePanel>

      <NexusDensePanel
        title={NEXUS_LABELS.insights}
        href="/admin/nexus/observations"
        collapsible
        defaultOpen
      >
        {insightCards.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500">No active insights</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {insightCards.map((card, index) => (
              <NexusInsightCard
                key={`${card.title}-${index}`}
                title={card.title}
                summary={card.summary}
                tone={card.tone}
              />
            ))}
          </div>
        )}
      </NexusDensePanel>

      <NexusDensePanel
        title="Live Feed"
        collapsible
        defaultOpen={false}
      >
        {(events?.events ?? []).length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500">No events</p>
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

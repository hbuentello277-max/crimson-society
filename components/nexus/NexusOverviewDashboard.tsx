"use client";

import Link from "next/link";
import { useMemo } from "react";
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
import { isDegradedWorkflowStatus } from "@/lib/mission-health/degraded";
import { NEXUS_INTEGRATION_SLUGS } from "@/lib/nexus/constants";
import { explainPlatformStatusMismatch } from "@/lib/nexus/platform-status-display";
import { NEXUS_LABELS } from "@/lib/nexus/terminology";
import {
  NexusActivityTile,
  NexusDensePanel,
  NexusFeedRow,
  NexusIntegrationCard,
  NexusMicroRow,
  NexusOverviewMetricCard,
  NexusStatusChip,
} from "@/components/nexus/NexusCommandUI";
import { NexusWorkflowHealthBar } from "@/components/nexus/NexusWorkflowHealthBar";
import { NexusLoadingPanel, NexusRefreshButton } from "@/components/nexus/NexusShared";
import { useExecutiveCommand } from "@/hooks/nexus/useExecutiveCommand";
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
};

type AlertsPayload = {
  counts?: { active?: number; critical?: number };
  active?: NexusAlertSummaryRow[];
};

type IncidentsPayload = {
  counts?: { open?: number };
  open?: NexusIncidentSummaryRow[];
};

type ObservationsPayload = {
  active?: NexusObservationSummaryRow[];
};

type EventsPayload = {
  events?: NexusEventFeedRow[];
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

function launchTone(status: string): "healthy" | "warning" | "critical" | "default" {
  if (status === "not_ready") return "critical";
  if (status === "approaching") return "warning";
  return "healthy";
}

export function NexusOverviewDashboard({ showFounderLink = false }: { showFounderLink?: boolean }) {
  const {
    summary,
    error: execError,
    loading: execLoading,
    refresh: refreshExec,
  } = useExecutiveCommand();
  const { data, errors, loading: overviewLoading, refresh: refreshOverview } = useNexusOverview();

  const loading = execLoading || overviewLoading;

  const health = data.health as HealthPayload | null;
  const mission = data.missionHealth as MissionPayload | null;
  const metrics = data.metrics as MetricsPayload | null;
  const alerts = data.alerts as AlertsPayload | null;
  const incidents = data.incidents as IncidentsPayload | null;
  const observations = data.observations as ObservationsPayload | null;
  const events = data.events as EventsPayload | null;

  const derived = useMemo(() => {
    const workflows = mission?.workflows ?? [];
    const integrations = integrationRows(health?.integrations ?? []);
    const degradedWorkflows = workflows.filter((wf) => isDegradedWorkflowStatus(wf.workflow_status));
    const degradedIntegrations = integrations.filter((item) => isDegraded(item.status));

    return {
      workflows,
      integrations,
      degradedWorkflows,
      degradedIntegrations,
      openIncidents: incidents?.counts?.open ?? incidents?.open?.length ?? 0,
      openAlerts: alerts?.counts?.active ?? 0,
      criticalAlerts: alerts?.counts?.critical ?? 0,
    };
  }, [alerts, health, incidents, mission]);

  const refresh = async () => {
    await Promise.all([refreshExec(), refreshOverview()]);
  };

  if (loading) {
    return <NexusLoadingPanel rows={3} />;
  }

  const exec = summary?.executive_summary;
  const platformHealth = summary?.platform_health;
  const business = summary?.business_health;
  const actionCenter = summary?.action_center;

  const statusExplanation =
    platformHealth && exec
      ? explainPlatformStatusMismatch({
          platformStatusLabel: platformHealth.platform_status,
          platformHealthScore: platformHealth.platform_health_score,
          openIncidents: derived.openIncidents,
          openAlerts: platformHealth.open_alerts,
          criticalAlerts: platformHealth.critical_alerts,
          failedJobs: platformHealth.failed_jobs,
          degradedWorkflows: derived.degradedWorkflows.length,
          workflowHealthScore: mission?.score ?? platformHealth.platform_health_score,
        })
      : null;

  const priorities = (summary?.todays_priorities ?? []).slice(0, 3);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto">
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

      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Founder command center</p>
          <h2 className="font-serif text-xl text-white">Overview</h2>
        </div>
        <div className="flex items-center gap-2">
          {errors.length > 0 || execError ? (
            <span className="text-[9px] uppercase tracking-[0.1em] text-amber-400">Partial</span>
          ) : null}
          <NexusRefreshButton compact onClick={() => void refresh()} />
        </div>
      </header>

      {execError || !summary ? (
        <p className="rounded-lg border border-amber-500/25 bg-amber-950/20 px-3 py-2 text-sm text-amber-100">
          Executive signals are temporarily unavailable. Operational metrics may still load below.
        </p>
      ) : null}

      {/* Section 1: Operations Overview */}
      <NexusDensePanel
        title={NEXUS_LABELS.operationsOverview}
        collapsible
        compact
        defaultOpen
        headerAction={
          summary?.collected_at ? (
            <span className="hidden text-[9px] uppercase tracking-[0.1em] text-zinc-500 sm:inline">
              {formatRelativeTime(summary.collected_at)}
            </span>
          ) : null
        }
      >
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <NexusOverviewMetricCard
            label="Platform Status"
            value={platformHealth?.platform_status ?? exec?.platform_status_label ?? "—"}
            href="/admin/nexus/mission-control"
            tone={
              platformHealth?.platform_status?.toLowerCase().includes("risk") ||
              platformHealth?.platform_status?.toLowerCase().includes("critical")
                ? "warning"
                : "healthy"
            }
          />
          <NexusOverviewMetricCard
            label="Launch Readiness"
            value={exec ? `${exec.launch_readiness_score}` : "—"}
            tone={exec ? launchTone(exec.launch_readiness_status) : "default"}
          />
          <NexusOverviewMetricCard
            label="Platform Health"
            value={platformHealth?.platform_health_score ?? mission?.score ?? "—"}
            href="/admin/nexus/mission-health"
            tone="healthy"
          />
          <NexusOverviewMetricCard
            label="MRR"
            value={formatCurrency(business?.estimated_mrr ?? metrics?.revenue?.estimated_mrr)}
            href="/admin/nexus/metrics"
            tone="revenue"
          />
        </div>
        {statusExplanation ? (
          <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed text-amber-100/90">
            {statusExplanation}
          </p>
        ) : null}
        {exec?.recommended_focus_today ? (
          <p className="mt-2 text-sm text-zinc-400">
            <span className="text-[#e87a82]">Focus:</span> {exec.recommended_focus_today}
          </p>
        ) : null}
      </NexusDensePanel>

      {/* Section 2: Today's Priorities */}
      <NexusDensePanel title="Today's Priorities" collapsible compact defaultOpen>
        {priorities.length === 0 ? (
          <p className="text-sm text-zinc-500">No urgent priorities. Platform is within normal parameters.</p>
        ) : (
          <ol className="space-y-2">
            {priorities.map((priority, index) => (
              <li
                key={priority.id}
                className="rounded-lg border border-[#b4141e]/20 bg-black/25 px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-white">
                    {index + 1}. {priority.title}
                  </p>
                  <span className="shrink-0 text-[9px] uppercase tracking-[0.12em] text-zinc-500">
                    {priority.urgency}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-400">{priority.reason}</p>
                <Link
                  href={priority.related_route}
                  className="mt-2 inline-flex text-[10px] uppercase tracking-[0.12em] text-[#f1c3c7] hover:underline"
                >
                  {priority.suggested_next_action}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </NexusDensePanel>

      {/* Section 3: Action Center Summary */}
      <NexusDensePanel title="Action Center Summary" collapsible compact defaultOpen>
        <div className="grid grid-cols-3 gap-2">
          <NexusOverviewMetricCard
            label="Pending approvals"
            value={formatNumber(actionCenter?.pending_approvals)}
            tone={(actionCenter?.pending_approvals ?? 0) > 0 ? "warning" : "default"}
          />
          <NexusOverviewMetricCard
            label="Draft actions"
            value={formatNumber(actionCenter?.draft_actions)}
          />
          <NexusOverviewMetricCard
            label="Decisions required"
            value={formatNumber(
              (actionCenter?.pending_approvals ?? 0) + (actionCenter?.draft_actions ?? 0),
            )}
            tone={(actionCenter?.pending_approvals ?? 0) > 0 ? "warning" : "default"}
          />
        </div>
        <Link
          href="/admin/nexus/actions"
          className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-[#b4141e]/50 bg-[#b4141e]/10 px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-[#f1c3c7] transition hover:bg-[#b4141e]/20"
        >
          Open Action Center
        </Link>
      </NexusDensePanel>

      {/* Section 4: Business Health */}
      <NexusDensePanel title="Business Health" collapsible compact defaultOpen>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <NexusOverviewMetricCard
            label="Members"
            value={formatNumber(business?.total_members ?? metrics?.growth?.total_users)}
            href="/admin/nexus/metrics"
          />
          <NexusOverviewMetricCard
            label="Blackcard Members"
            value={formatNumber(business?.blackcard_active_members ?? metrics?.blackcard?.active_members)}
            href="/admin/blackcard"
          />
          <NexusOverviewMetricCard
            label="MRR"
            value={formatCurrency(business?.estimated_mrr ?? metrics?.revenue?.estimated_mrr)}
            tone="revenue"
            href="/admin/nexus/metrics"
          />
          <NexusOverviewMetricCard
            label="ARR"
            value={formatCurrency(business?.estimated_arr ?? metrics?.revenue?.estimated_arr)}
            tone="revenue"
            href="/admin/nexus/metrics"
          />
          <NexusOverviewMetricCard
            label="Revenue trend"
            value={business?.revenue_status ?? "—"}
            tone="revenue"
          />
          <NexusOverviewMetricCard
            label="Growth trend"
            value={business?.membership_growth ?? "—"}
          />
        </div>
      </NexusDensePanel>

      {/* Section 5: Platform Health */}
      <NexusDensePanel
        title="Platform Health"
        href="/admin/nexus/mission-health"
        collapsible
        compact
        defaultOpen
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <NexusOverviewMetricCard
            label="Health score"
            value={platformHealth?.platform_health_score ?? mission?.score ?? "—"}
          />
          <NexusOverviewMetricCard
            label="Failed jobs"
            value={formatNumber(platformHealth?.failed_jobs)}
            tone={(platformHealth?.failed_jobs ?? 0) > 0 ? "warning" : "healthy"}
          />
          <NexusOverviewMetricCard
            label="Open alerts"
            value={formatNumber(platformHealth?.open_alerts ?? derived.openAlerts)}
            href="/admin/nexus/alerts"
            tone={(platformHealth?.critical_alerts ?? 0) > 0 ? "critical" : (platformHealth?.open_alerts ?? 0) > 0 ? "warning" : "healthy"}
          />
          <NexusOverviewMetricCard
            label="Open incidents"
            value={formatNumber(derived.openIncidents)}
            href="/admin/nexus/incidents"
            tone={derived.openIncidents > 0 ? "warning" : "healthy"}
          />
        </div>
      </NexusDensePanel>

      {/* Platform Workflow Review — compact default */}
      <NexusDensePanel
        title={NEXUS_LABELS.userWorkflowMonitor}
        href="/admin/nexus/mission-health"
        collapsible
        compact
        defaultOpen
      >
        <NexusWorkflowHealthBar
          score={mission?.score}
          status={mission?.status}
          workflows={derived.workflows}
        />
        <details className="mt-3 group">
          <summary className="cursor-pointer list-none text-[10px] uppercase tracking-[0.14em] text-zinc-500 marker:content-none">
            <span className="group-open:hidden">▶ View Workflow Details</span>
            <span className="hidden group-open:inline">▼ Hide Workflow Details</span>
          </summary>
          <div className="mt-3 space-y-2">
            {derived.workflows.map((wf) => (
              <NexusMicroRow
                key={wf.slug}
                label={wf.display_name}
                value={wf.workflow_score ?? "—"}
                badge={wf.workflow_status}
                alert={isDegradedWorkflowStatus(wf.workflow_status)}
              />
            ))}
          </div>
        </details>
      </NexusDensePanel>

      {/* Collapsed deep systems */}
      <NexusDensePanel
        title="Infrastructure Detail"
        href="/admin/nexus/system-health"
        collapsible
        compact
        defaultOpen={false}
        bodyClassName="grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        {derived.integrations.map((item) => (
          <NexusIntegrationCard
            key={item.slug}
            name={integrationDisplayName(item.slug)}
            latency={item.latency_ms != null ? `${item.latency_ms}ms` : "—"}
            status={item.status}
            checkedAt={formatRelativeTime(item.last_check_at) || "—"}
            errorMessage={item.error_message}
            degraded={isDegraded(item.status)}
          />
        ))}
      </NexusDensePanel>

      <NexusDensePanel
        title="Metrics Detail"
        href="/admin/nexus/metrics"
        collapsible
        compact
        defaultOpen={false}
        bodyClassName="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        <NexusActivityTile label="New This Week" value={formatNumber(metrics?.growth?.new_users_this_week)} />
        <NexusActivityTile label="Shop activity" value={business?.shop_activity ?? "—"} />
        <NexusActivityTile label="Credits activity" value={business?.credits_activity ?? "—"} />
        <NexusActivityTile label="Active rewards" value={formatNumber(business?.active_rewards)} />
      </NexusDensePanel>

      <NexusDensePanel title="Alert History" href="/admin/nexus/alerts" collapsible compact defaultOpen={false}>
        {(alerts?.active ?? []).length === 0 ? (
          <p className="text-sm text-zinc-500">No active alerts.</p>
        ) : (
          (alerts?.active ?? []).slice(0, 5).map((alert) => (
            <NexusFeedRow
              key={alert.id}
              title={alert.title}
              meta="alert"
              severity={alert.severity}
              time={formatRelativeTime(alert.updated_at)}
            />
          ))
        )}
      </NexusDensePanel>

      <NexusDensePanel title="Incident History" href="/admin/nexus/incidents" collapsible compact defaultOpen={false}>
        {(incidents?.open ?? []).length === 0 ? (
          <p className="text-sm text-zinc-500">No open incidents.</p>
        ) : (
          (incidents?.open ?? []).slice(0, 5).map((inc) => (
            <NexusFeedRow
              key={inc.id}
              title={inc.title}
              meta="incident"
              severity={inc.severity}
              time={formatRelativeTime(inc.started_at)}
            />
          ))
        )}
      </NexusDensePanel>

      <NexusDensePanel title="Reports" href="/admin/nexus/reports" collapsible compact defaultOpen={false}>
        <p className="text-sm text-zinc-400">Weekly and monthly founder reports are available in Reports.</p>
        <Link href="/admin/nexus/reports" className="mt-2 inline-flex text-[10px] uppercase tracking-[0.14em] text-[#f1c3c7]">
          Open Reports →
        </Link>
      </NexusDensePanel>

      <NexusDensePanel title="Correlations" href="/admin/nexus/correlations" collapsible compact defaultOpen={false}>
        <p className="text-sm text-zinc-400">Cross-metric correlations and pattern detection.</p>
      </NexusDensePanel>

      <NexusDensePanel title="Forecasting" href="/admin/nexus/forecasting" collapsible compact defaultOpen={false}>
        <p className="text-sm text-zinc-400">Revenue and growth forecasting models.</p>
      </NexusDensePanel>

      <NexusDensePanel title="Memory" href="/admin/nexus/memory" collapsible compact defaultOpen={false}>
        <p className="text-sm text-zinc-400">Founder decisions, blockers, and milestones.</p>
      </NexusDensePanel>

      <NexusDensePanel title="Intelligence Detail" href="/admin/nexus/intelligence" collapsible compact defaultOpen={false}>
        <p className="text-sm text-zinc-400">Platform Intelligence risks, opportunities, and briefings.</p>
      </NexusDensePanel>

      <NexusDensePanel
        title="Operational Intelligence Detail"
        href="/admin/nexus/operational-intelligence"
        collapsible
        compact
        defaultOpen={false}
      >
        <p className="text-sm text-zinc-400">Operational signals and cross-system operational view.</p>
      </NexusDensePanel>

      <NexusDensePanel title="Runbooks" href="/admin/nexus/runbooks" collapsible compact defaultOpen={false}>
        <p className="text-sm text-zinc-400">Incident and operations runbooks.</p>
      </NexusDensePanel>

      <NexusDensePanel title="Job Monitoring" href="/admin/nexus/mission-control" collapsible compact defaultOpen={false}>
        <div className="flex flex-wrap gap-2">
          <NexusStatusChip
            label="Failed jobs"
            value={formatNumber(platformHealth?.failed_jobs)}
            tone={(platformHealth?.failed_jobs ?? 0) > 0 ? "warning" : "healthy"}
            href="/admin/nexus/mission-control"
          />
          <NexusStatusChip
            label="Last sync"
            value={formatRelativeTime(health?.system?.checked_at) || formatDateTime(health?.system?.checked_at) || "—"}
          />
        </div>
      </NexusDensePanel>

      <NexusDensePanel title="Insights" href="/admin/nexus/observations" collapsible compact defaultOpen={false}>
        {(observations?.active ?? []).length === 0 ? (
          <p className="text-sm text-zinc-500">No active insights.</p>
        ) : (
          (observations?.active ?? []).slice(0, 3).map((obs) => (
            <NexusFeedRow
              key={obs.id}
              title={obs.title}
              meta="insight"
              severity={obs.severity}
              time={formatRelativeTime(obs.updated_at)}
            />
          ))
        )}
      </NexusDensePanel>

      <NexusDensePanel title="Live Feed" collapsible compact defaultOpen={false}>
        {(events?.events ?? []).length === 0 ? (
          <p className="text-sm text-zinc-500">No recent events.</p>
        ) : (
          (events?.events ?? []).slice(0, 6).map((event) => (
            <NexusFeedRow
              key={event.id}
              title={event.title}
              meta={event.category}
              severity={event.severity}
              time={formatRelativeTime(event.occurred_at)}
            />
          ))
        )}
      </NexusDensePanel>
    </div>
  );
}

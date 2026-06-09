"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import {
  NexusDensePanel,
  NexusOverviewMetricCard,
  NexusStatusChip,
} from "@/components/nexus/NexusCommandUI";
import { NexusLoadingPanel } from "@/components/nexus/NexusShared";
import { useExecutiveCommand } from "@/hooks/nexus/useExecutiveCommand";
import type { ExecutiveCommandSummary } from "@/lib/executive-command/types";
import { formatNumber, formatRelativeTime } from "@/lib/nexus/format";

async function postNexusJson<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? `Request failed (${response.status})`);
  }
  return payload as T;
}

function launchTone(status: ExecutiveCommandSummary["executive_summary"]["launch_readiness_status"]) {
  if (status === "not_ready") return "critical" as const;
  if (status === "approaching") return "warning" as const;
  return "healthy" as const;
}

function EmptyLine({ children }: { children: string }) {
  return <p className="text-sm text-zinc-500">{children}</p>;
}

function MemoryList({
  items,
  emptyLabel,
}: {
  items: Array<{ id: string; title: string; summary: string }>;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <EmptyLine>{emptyLabel}</EmptyLine>;
  }

  return (
    <ul className="space-y-2">
      {items.slice(0, 4).map((item) => (
        <li key={item.id} className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
          <p className="text-sm font-medium text-white">{item.title}</p>
          <p className="mt-1 text-xs text-zinc-400">{item.summary}</p>
        </li>
      ))}
    </ul>
  );
}

export function ExecutiveCommandCenter({ onRefresh }: { onRefresh?: () => Promise<void> }) {
  const { summary, error, loading, refresh } = useExecutiveCommand();
  const [creatingDrafts, setCreatingDrafts] = useState(false);
  const [plannerMessage, setPlannerMessage] = useState<string | null>(null);

  const handleRefresh = useCallback(async () => {
    await refresh();
    if (onRefresh) {
      await onRefresh();
    }
  }, [onRefresh, refresh]);

  const createActionDrafts = useCallback(async (planId: string) => {
    setCreatingDrafts(true);
    setPlannerMessage(null);
    try {
      await postNexusJson(`/api/nexus/operations-plans/${planId}/action-drafts`);
      setPlannerMessage("Action Center drafts created and set to pending approval.");
      await refresh();
    } catch {
      setPlannerMessage("Could not create Action Center drafts from this plan.");
    } finally {
      setCreatingDrafts(false);
    }
  }, [refresh]);

  if (loading) {
    return <NexusLoadingPanel rows={5} />;
  }

  if (error || !summary) {
    return (
      <section className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-100">
        Executive Command Center is temporarily unavailable.{" "}
        <button type="button" onClick={() => void handleRefresh()} className="underline">
          Retry
        </button>
      </section>
    );
  }

  const { executive_summary: exec, platform_health: health, business_health: business } = summary;
  const plan = summary.operations_planner.recommended_plan;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <header className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[#b4141e]/30 bg-[#060405]/95 px-3 py-3 sm:px-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Executive Command Center</p>
          <h1 className="mt-1 font-serif text-xl text-white sm:text-2xl">What should I focus on right now?</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Read-only summary composed from existing NEXUS systems. Actions still require Action Center approval.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NexusStatusChip
            label="Platform Status"
            value={exec.platform_status_label}
            tone={exec.overall_platform_status === "critical" ? "critical" : exec.overall_platform_status === "warning" ? "warning" : "healthy"}
            href="/admin/nexus/mission-control"
          />
          <NexusStatusChip
            label="Launch readiness"
            value={`${exec.launch_readiness_score}`}
            tone={launchTone(exec.launch_readiness_status)}
          />
        </div>
      </header>

      {summary.partial ? (
        <p className="rounded-lg border border-amber-500/25 bg-amber-950/20 px-3 py-2 text-xs text-amber-100">
          Some signals are partial. {summary.warnings?.[0] ?? "Review linked sections for full detail."}
        </p>
      ) : null}

      <NexusDensePanel title="Executive Summary" defaultOpen compact collapsible>
        <div className="grid gap-2 sm:grid-cols-2">
          <NexusOverviewMetricCard
            label="Overall platform status"
            value={exec.platform_status_label}
            href="/admin/nexus/mission-control"
            tone={exec.overall_platform_status === "critical" ? "critical" : exec.overall_platform_status === "warning" ? "warning" : "healthy"}
          />
          <NexusOverviewMetricCard
            label="Launch readiness score"
            value={`${exec.launch_readiness_score} / 100`}
            tone={launchTone(exec.launch_readiness_status)}
          />
        </div>
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-zinc-300">
            <span className="text-[#e87a82]">Recommended focus today:</span> {exec.recommended_focus_today}
          </p>
          {exec.top_risk ? (
            <p className="text-zinc-300">
              <span className="text-amber-300">Top risk:</span> {exec.top_risk.title} — {exec.top_risk.summary}
            </p>
          ) : (
            <EmptyLine>No major cross-system risks detected right now.</EmptyLine>
          )}
          {exec.top_opportunity ? (
            <p className="text-zinc-300">
              <span className="text-emerald-300">Top opportunity:</span> {exec.top_opportunity.title} —{" "}
              {exec.top_opportunity.summary}
            </p>
          ) : (
            <EmptyLine>No standout opportunities surfaced in today's briefing.</EmptyLine>
          )}
        </div>
      </NexusDensePanel>

      <NexusDensePanel title="Today's Priorities" defaultOpen compact collapsible>
        {summary.todays_priorities.length === 0 ? (
          <EmptyLine>No urgent priorities detected. Platform is operating within normal parameters.</EmptyLine>
        ) : (
          <ol className="space-y-2">
            {summary.todays_priorities.map((priority, index) => (
              <li
                key={priority.id}
                className="rounded-lg border border-[#b4141e]/20 bg-black/25 px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-white">
                    {index + 1}. {priority.title}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] ${
                      priority.urgency === "critical"
                        ? "bg-red-500/15 text-red-200"
                        : priority.urgency === "high"
                          ? "bg-amber-500/15 text-amber-200"
                          : "bg-zinc-500/15 text-zinc-300"
                    }`}
                  >
                    {priority.urgency}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-400">{priority.reason}</p>
                <p className="mt-2 text-xs text-[#f1c3c7]">Next: {priority.suggested_next_action}</p>
                <Link
                  href={priority.related_route}
                  className="mt-2 inline-flex text-[10px] uppercase tracking-[0.12em] text-zinc-500 hover:text-[#f1c3c7]"
                >
                  Open related section
                </Link>
              </li>
            ))}
          </ol>
        )}
      </NexusDensePanel>

      <NexusDensePanel
        title="Platform Health"
        href="/admin/nexus/mission-health"
        defaultOpen
        compact
        collapsible
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <NexusOverviewMetricCard label="Platform Status" value={health.platform_status} href="/admin/nexus/mission-control" />
          <NexusOverviewMetricCard
            label="Platform Health"
            value={health.platform_health_score ?? "—"}
            href="/admin/nexus/mission-health"
          />
          <NexusOverviewMetricCard
            label="Failed jobs"
            value={health.failed_jobs}
            tone={health.failed_jobs > 0 ? "warning" : "healthy"}
          />
          <NexusOverviewMetricCard
            label="Open alerts"
            value={health.open_alerts}
            href="/admin/nexus/alerts"
            tone={health.critical_alerts > 0 ? "critical" : health.open_alerts > 0 ? "warning" : "healthy"}
          />
        </div>
        <div className="mt-3">
          <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-500">Recent incidents</p>
          {health.recent_incidents.length === 0 ? (
            <EmptyLine>No open incidents.</EmptyLine>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {health.recent_incidents.map((incident) => (
                <li key={incident.id}>
                  <Link href={incident.href} className="text-sm text-zinc-200 hover:text-white">
                    {incident.title}
                  </Link>
                  <span className="ml-2 text-xs text-zinc-500">
                    {incident.severity} · {incident.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </NexusDensePanel>

      <NexusDensePanel title="Business Health" defaultOpen={false} compact collapsible>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          <NexusOverviewMetricCard label="Revenue" value={business.revenue_status} tone="revenue" href="/admin/nexus/metrics" />
          <NexusOverviewMetricCard
            label="Blackcard growth"
            value={business.blackcard_growth}
            href="/admin/blackcard"
          />
          <NexusOverviewMetricCard
            label="Membership growth"
            value={business.membership_growth}
            href="/admin/nexus/metrics"
          />
          <NexusOverviewMetricCard label="Shop activity" value={business.shop_activity} href="/admin/shop" />
          <NexusOverviewMetricCard
            label="Credits / rewards"
            value={business.credits_activity}
            href="/admin/rewards"
          />
          <NexusOverviewMetricCard
            label="Active rewards"
            value={business.active_rewards ?? "—"}
            href="/admin/credits"
          />
        </div>
      </NexusDensePanel>

      <NexusDensePanel title="Operations Planner" defaultOpen={false} compact collapsible>
        {plan ? (
          <div className="space-y-2">
            <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-500">
              {plan.plan_type} plan · Priority {plan.priority}
            </p>
            <h3 className="text-sm font-medium text-white">{plan.title}</h3>
            <p className="text-sm text-zinc-400">{plan.objective}</p>
            <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
              <span>Confidence: <span className="text-white">{plan.confidence_score}</span></span>
              <span>Impact: <span className="text-white">{plan.estimated_impact_score}</span></span>
            </div>
            <p className="text-sm text-zinc-300">{plan.reason}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={creatingDrafts || plan.id === "recommended-preview"}
                onClick={() => void createActionDrafts(plan.id)}
                className="rounded-lg border border-[#b4141e]/50 bg-[#b4141e]/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#f1c3c7] transition hover:bg-[#b4141e]/20 disabled:opacity-50"
              >
                {creatingDrafts ? "Creating drafts…" : "Create Action Drafts"}
              </button>
              <Link
                href="/admin/nexus/actions"
                className="rounded-lg border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-zinc-300 transition hover:border-white/25"
              >
                Action Center
              </Link>
            </div>
            {plannerMessage ? <p className="text-xs text-zinc-400">{plannerMessage}</p> : null}
          </div>
        ) : (
          <EmptyLine>
            No recommended operations plan right now. Generate one from Operations Planner when risks or opportunities shift.
          </EmptyLine>
        )}
      </NexusDensePanel>

      <NexusDensePanel title="Action Center" href="/admin/nexus/actions" defaultOpen={false} compact collapsible>
        <div className="grid grid-cols-3 gap-2">
          <NexusOverviewMetricCard
            label="Pending approvals"
            value={formatNumber(summary.action_center.pending_approvals)}
            href="/admin/nexus/actions"
            tone={summary.action_center.pending_approvals > 0 ? "warning" : "default"}
          />
          <NexusOverviewMetricCard label="Draft actions" value={formatNumber(summary.action_center.draft_actions)} />
          <NexusOverviewMetricCard
            label="Approved awaiting execution"
            value={formatNumber(summary.action_center.approved_awaiting_execution)}
          />
        </div>
        <div className="mt-3">
          {summary.action_center.recent_items.length === 0 ? (
            <EmptyLine>No draft or pending actions in queue.</EmptyLine>
          ) : (
            <ul className="space-y-1.5">
              {summary.action_center.recent_items.slice(0, 4).map((action) => (
                <li key={action.id} className="text-sm text-zinc-300">
                  <span className="text-white">{action.title}</span>
                  <span className="ml-2 text-xs text-zinc-500">{action.status.replaceAll("_", " ")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </NexusDensePanel>

      <NexusDensePanel title="Founder Memory" href="/admin/nexus/memory" defaultOpen={false} compact collapsible>
        <p className="mb-3 text-xs text-zinc-500">
          Current NEXUS phase: <span className="text-white">Phase {summary.founder_memory.current_nexus_phase}</span>
          {summary.collected_at ? (
            <span className="ml-2">· Updated {formatRelativeTime(summary.collected_at)}</span>
          ) : null}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-500">Recent decisions</p>
            <div className="mt-2">
              <MemoryList items={summary.founder_memory.recent_decisions} emptyLabel="No recent decisions logged." />
            </div>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-500">Current blockers</p>
            <div className="mt-2">
              <MemoryList items={summary.founder_memory.current_blockers} emptyLabel="No active blockers in memory." />
            </div>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-500">Completed milestones</p>
            <div className="mt-2">
              <MemoryList
                items={summary.founder_memory.completed_milestones}
                emptyLabel="No recent milestones recorded."
              />
            </div>
          </div>
        </div>
      </NexusDensePanel>

      <p className="text-center text-[10px] uppercase tracking-[0.14em] text-zinc-600">
        Read-only executive view · Last composed {formatRelativeTime(summary.collected_at)}
      </p>
    </div>
  );
}

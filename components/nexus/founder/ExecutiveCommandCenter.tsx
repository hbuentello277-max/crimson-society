"use client";

import Link from "next/link";
import { useCallback, useState, type ReactNode } from "react";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import { useNexusStoredState } from "@/hooks/nexus/useNexusPageState";
import { NexusLoadingPanel } from "@/components/nexus/NexusShared";
import { NEXUS_LABELS } from "@/lib/nexus/terminology";
import type { ExecutiveCommandSummary } from "@/lib/executive-command/types";

type Payload = ExecutiveCommandSummary & { ok?: boolean };

function CollapsibleSection({
  id,
  title,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-black/30">
      <button
        type="button"
        id={`${id}-toggle`}
        aria-expanded={expanded}
        aria-controls={`${id}-panel`}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
      >
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#e87a82]">{title}</span>
        <span className="text-sm text-zinc-400">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded ? (
        <div id={`${id}-panel`} className="border-t border-white/10 px-3 py-3">
          {children}
        </div>
      ) : null}
    </section>
  );
}

async function postActionDrafts(planId: string): Promise<void> {
  const response = await fetch(`/api/nexus/operations-plans/${planId}/action-drafts`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Failed to create action drafts.");
  }
}

export function ExecutiveCommandCenter() {
  const { data, error, loading, refresh } = useNexusFetch<Payload>("/api/nexus/executive-command");
  const [summaryOpen, setSummaryOpen] = useNexusStoredState("nexus:executive:summary", true);
  const [platformOpen, setPlatformOpen] = useNexusStoredState("nexus:executive:platform", false);
  const [businessOpen, setBusinessOpen] = useNexusStoredState("nexus:executive:business", false);
  const [plannerOpen, setPlannerOpen] = useNexusStoredState("nexus:executive:planner", true);
  const [actionsOpen, setActionsOpen] = useNexusStoredState("nexus:executive:actions", true);
  const [memoryOpen, setMemoryOpen] = useNexusStoredState("nexus:executive:memory", false);
  const [prioritiesOpen, setPrioritiesOpen] = useNexusStoredState("nexus:executive:priorities", true);
  const [creatingDrafts, setCreatingDrafts] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const createDrafts = useCallback(async (planId: string) => {
    setCreatingDrafts(true);
    setMessage(null);
    try {
      await postActionDrafts(planId);
      setMessage("Action Center drafts created. All remain pending approval.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not create action drafts.");
    } finally {
      setCreatingDrafts(false);
    }
  }, []);

  if (loading) {
    return <NexusLoadingPanel rows={3} />;
  }

  if (error || !data?.executive_summary) {
    return (
      <section className="rounded-2xl border border-[#b4141e]/25 bg-black/40 p-4">
        <p className="text-sm text-amber-200">Executive Command Center is temporarily unavailable.</p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="mt-3 rounded-lg border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-zinc-300"
        >
          Retry
        </button>
      </section>
    );
  }

  const exec = data.executive_summary;
  const plan = data.operations_planner.plan;

  return (
    <section
      id="executive-command-center"
      className="rounded-2xl border border-[#b4141e]/30 bg-gradient-to-r from-[#120608]/90 via-[#0a0608]/90 to-black/90 p-3 sm:p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Executive Command Center</p>
          <h2 className="mt-1 font-serif text-xl text-white sm:text-2xl">What should I focus on right now?</h2>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.14em] text-zinc-400 transition hover:border-white/25 hover:text-zinc-200"
        >
          Refresh
        </button>
      </div>

      {message ? <p className="mt-3 text-sm text-zinc-300">{message}</p> : null}

      <div className="mt-3 space-y-2">
        <CollapsibleSection
          id="executive-summary"
          title="Executive Summary"
          expanded={summaryOpen}
          onToggle={() => setSummaryOpen((value) => !value)}
        >
          <dl className="grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
            <div>
              <dt className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Overall status</dt>
              <dd className="text-white">{exec.overall_platform_status}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Launch readiness</dt>
              <dd className="text-white">
                {exec.launch_readiness_score}/100 ({exec.launch_readiness_status})
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Top risk</dt>
              <dd>{exec.top_risk ?? "None flagged"}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Top opportunity</dt>
              <dd>{exec.top_opportunity ?? "None flagged"}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm text-[#f1c3c7]">
            <span className="text-zinc-500">Focus today: </span>
            {exec.recommended_focus_today}
          </p>
        </CollapsibleSection>

        <CollapsibleSection
          id="platform-health"
          title={NEXUS_LABELS.platformHealth}
          expanded={platformOpen}
          onToggle={() => setPlatformOpen((value) => !value)}
        >
          <dl className="grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">{NEXUS_LABELS.platformStatus}</dt>
              <dd className="text-white">{data.platform_health.platform_status}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">{NEXUS_LABELS.platformHealth}</dt>
              <dd className="text-white">
                {data.platform_health.platform_health}
                {data.platform_health.platform_health_score != null
                  ? ` (${data.platform_health.platform_health_score})`
                  : ""}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Failed jobs</dt>
              <dd>{data.platform_health.failed_jobs}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Open alerts</dt>
              <dd>{data.platform_health.open_alerts}</dd>
            </div>
          </dl>
          {data.platform_health.recent_incidents.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm text-zinc-300">
              {data.platform_health.recent_incidents.map((incident) => (
                <li key={incident.id}>
                  {incident.title} <span className="text-zinc-500">({incident.severity})</span>
                </li>
              ))}
            </ul>
          ) : null}
        </CollapsibleSection>

        <CollapsibleSection
          id="business-health"
          title="Business Health"
          expanded={businessOpen}
          onToggle={() => setBusinessOpen((value) => !value)}
        >
          <dl className="grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
            <div><dt className="text-zinc-500">Revenue</dt><dd>{data.business_health.revenue_status}</dd></div>
            <div><dt className="text-zinc-500">Blackcard</dt><dd>{data.business_health.blackcard_growth}</dd></div>
            <div><dt className="text-zinc-500">Membership</dt><dd>{data.business_health.membership_growth}</dd></div>
            <div><dt className="text-zinc-500">Shop</dt><dd>{data.business_health.shop_activity}</dd></div>
            <div className="sm:col-span-2">
              <dt className="text-zinc-500">Credits / rewards</dt>
              <dd>{data.business_health.credits_activity}</dd>
            </div>
          </dl>
        </CollapsibleSection>

        <CollapsibleSection
          id="operations-planner"
          title="Operations Planner"
          expanded={plannerOpen}
          onToggle={() => setPlannerOpen((value) => !value)}
        >
          {plan ? (
            <div className="space-y-2 text-sm text-zinc-300">
              <p className="font-medium text-white">{plan.title}</p>
              <p>Priority: {plan.priority} · Confidence: {plan.confidence_score} · Impact: {plan.estimated_impact_score}</p>
              <p>{plan.reason}</p>
              <button
                type="button"
                disabled={creatingDrafts}
                onClick={() => void createDrafts(plan.id)}
                className="rounded-lg border border-[#b4141e]/50 bg-[#b4141e]/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#f1c3c7] disabled:opacity-50"
              >
                {creatingDrafts ? "Creating…" : "Create Action Drafts"}
              </button>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No recommended operations plan is available yet.</p>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          id="action-center"
          title="Action Center"
          expanded={actionsOpen}
          onToggle={() => setActionsOpen((value) => !value)}
        >
          <dl className="grid gap-2 text-sm text-zinc-300 sm:grid-cols-3">
            <div><dt className="text-zinc-500">Pending approval</dt><dd className="text-white">{data.action_center.pending_approval}</dd></div>
            <div><dt className="text-zinc-500">Drafts</dt><dd>{data.action_center.draft}</dd></div>
            <div><dt className="text-zinc-500">Approved</dt><dd>{data.action_center.approved_awaiting_execution}</dd></div>
          </dl>
          {data.action_center.recent_titles.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm text-zinc-400">
              {data.action_center.recent_titles.map((title) => (
                <li key={title}>{title}</li>
              ))}
            </ul>
          ) : null}
          <Link
            href="/admin/nexus/actions"
            className="mt-3 inline-flex rounded-lg border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-zinc-300"
          >
            Open Action Center
          </Link>
        </CollapsibleSection>

        <CollapsibleSection
          id="founder-memory"
          title="Founder Memory"
          expanded={memoryOpen}
          onToggle={() => setMemoryOpen((value) => !value)}
        >
          <p className="text-xs text-zinc-500">{data.founder_memory.current_phase}</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <MemoryList title="Recent decisions" items={data.founder_memory.recent_decisions} />
            <MemoryList title="Current blockers" items={data.founder_memory.current_blockers} />
            <MemoryList title="Completed milestones" items={data.founder_memory.completed_milestones} />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          id="todays-priorities"
          title="Today's Priorities"
          expanded={prioritiesOpen}
          onToggle={() => setPrioritiesOpen((value) => !value)}
        >
          <ul className="space-y-2">
            {data.todays_priorities.map((priority) => (
              <li key={priority.id} className="rounded-lg border border-white/10 px-3 py-2 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-white">{priority.title}</p>
                  <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-[#e87a82]">
                    {priority.urgency}
                  </span>
                </div>
                <p className="mt-1 text-zinc-400">{priority.reason}</p>
                <p className="mt-1 text-zinc-300">Next: {priority.suggested_next_action}</p>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      </div>
    </section>
  );
}

function MemoryList({
  title,
  items,
}: {
  title: string;
  items: Array<{ title: string; summary: string }>;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{title}</p>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-zinc-500">None recorded.</p>
      ) : (
        <ul className="mt-1 space-y-1 text-sm text-zinc-300">
          {items.map((item) => (
            <li key={`${title}:${item.title}`}>
              <span className="text-white">{item.title}</span>
              <span className="text-zinc-500"> — {item.summary}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

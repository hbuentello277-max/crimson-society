"use client";

import { useMemo } from "react";
import type { ExecutiveReportSummary } from "@/lib/reports/types";
import type { MonthlyExecutiveReport } from "@/lib/reports/types";
import type { WeeklyExecutiveReport } from "@/lib/reports/types";
import { formatCurrency, formatNumber } from "@/lib/nexus/format";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import {
  useNexusScrollRestoration,
  useNexusStoredState,
} from "@/hooks/nexus/useNexusPageState";
import { ExecutiveSnapshot } from "@/components/nexus/reports/ExecutiveSnapshot";
import { WeeklyReportPanel } from "@/components/nexus/reports/WeeklyReportPanel";
import { MonthlyReportPanel } from "@/components/nexus/reports/MonthlyReportPanel";
import {
  NEXUS_PANEL_CLASS,
  NexusListEmpty,
  NexusSectionFrame,
  NexusStatCard,
  NexusTabFilter,
} from "@/components/nexus/NexusShared";
import { NexusStatusBadge } from "@/components/nexus/NexusStatusBadge";

type SummaryPayload = ExecutiveReportSummary & { ok?: boolean };
type WeeklyPayload = { ok?: boolean; report?: WeeklyExecutiveReport };
type MonthlyPayload = { ok?: boolean; report?: MonthlyExecutiveReport };

type ReportTab = "overview" | "weekly" | "monthly";

const PANEL_CLASS = `${NEXUS_PANEL_CLASS} rounded-2xl border border-white/10 bg-black/25 p-4`;

function InsightList({
  title,
  items,
  empty,
}: {
  title: string;
  items: Array<{ id: string; title: string; severity: string; category: string }>;
  empty: string;
}) {
  return (
    <div className={PANEL_CLASS}>
      <p className="text-[10px] uppercase tracking-[0.22em] text-[#e87a82]">{title}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <NexusStatusBadge label={item.severity} variant="subtle" />
                <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                  {item.category}
                </span>
              </div>
              <p className="mt-2 text-sm text-white">{item.title}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OverviewSections({ summary }: { summary: ExecutiveReportSummary }) {
  const { community_growth, revenue_intelligence, engagement_intelligence, operational_risk } =
    summary;

  return (
    <div className="space-y-4">
      <ExecutiveSnapshot summary={summary} />

      <div className="grid gap-3 lg:grid-cols-2">
        <div className={PANEL_CLASS}>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#e87a82]">Community Growth</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <NexusStatCard label="Total Users" value={formatNumber(community_growth.total_users)} compact />
            <NexusStatCard label="New (Week)" value={formatNumber(community_growth.new_users_this_week)} compact />
            <NexusStatCard label="New (Month)" value={formatNumber(community_growth.new_users_this_month)} compact />
            <NexusStatCard label="Active Estimate" value={formatNumber(community_growth.active_members_estimate)} compact />
          </div>
          {community_growth.top_growth_signals.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {community_growth.top_growth_signals.map((signal) => (
                <li key={signal} className="text-sm text-zinc-300">
                  {signal}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">No growth signals available.</p>
          )}
        </div>

        <div className={PANEL_CLASS}>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#e87a82]">Revenue Intelligence</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <NexusStatCard label="Active Subs" value={formatNumber(revenue_intelligence.active_subscriptions)} compact />
            <NexusStatCard label="Blackcard" value={formatNumber(revenue_intelligence.blackcard_members)} compact />
            <NexusStatCard label="MRR" value={formatCurrency(revenue_intelligence.estimated_mrr)} compact />
            <NexusStatCard label="ARR" value={formatCurrency(revenue_intelligence.estimated_arr)} compact />
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Recent subscription changes (24h):{" "}
            {formatNumber(revenue_intelligence.recent_subscription_changes_24h)}
          </p>
          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Revenue Observations</p>
            {revenue_intelligence.revenue_observations.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">No revenue insights available.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {revenue_intelligence.revenue_observations.map((item) => (
                  <li key={item.id} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-300">
                    {item.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className={PANEL_CLASS}>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#e87a82]">Engagement Intelligence</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <NexusStatCard label="Posts (Week)" value={formatNumber(engagement_intelligence.posts_this_week)} compact />
            <NexusStatCard label="Posts (Month)" value={formatNumber(engagement_intelligence.posts_this_month)} compact />
            <NexusStatCard label="Meets (Week)" value={formatNumber(engagement_intelligence.meets_this_week)} compact />
            <NexusStatCard label="Meets (Month)" value={formatNumber(engagement_intelligence.meets_this_month)} compact />
            <NexusStatCard label="Messages (Week)" value={formatNumber(engagement_intelligence.messages_this_week)} compact />
            <NexusStatCard label="Messages (Month)" value={formatNumber(engagement_intelligence.messages_this_month)} compact />
          </div>
          {engagement_intelligence.activity_trends.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {engagement_intelligence.activity_trends.map((trend) => (
                <li key={trend} className="text-sm text-zinc-300">
                  {trend}
                </li>
              ))}
            </ul>
          ) : null}
          {engagement_intelligence.top_workflows.length > 0 ? (
            <div className="mt-4 space-y-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Top Workflows</p>
              {engagement_intelligence.top_workflows.map((workflow) => (
                <div
                  key={workflow.slug}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2"
                >
                  <span className="truncate text-sm text-white">{workflow.display_name}</span>
                  <NexusStatusBadge label={workflow.workflow_status} variant="subtle" />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className={PANEL_CLASS}>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#e87a82]">Operational Risk Summary</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <NexusStatusBadge label={operational_risk.infrastructure_status ?? "unknown"} />
            <NexusStatusBadge label={operational_risk.workflow_status ?? "unknown"} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <NexusStatCard label="Alerts" value={formatNumber(operational_risk.active_alerts_count)} compact />
            <NexusStatCard label="Incidents" value={formatNumber(operational_risk.open_incidents_count)} compact />
            <NexusStatCard label="Insights" value={formatNumber(operational_risk.active_insights_count)} compact />
            <NexusStatCard label="Commands" value={formatNumber(operational_risk.command_recommendations_count)} compact />
          </div>
          <div className="mt-4">
            <InsightList
              title="Highest-Priority Insights"
              items={operational_risk.highest_priority_insights}
              empty="No active insights."
            />
          </div>
        </div>
      </div>

      {summary.unavailable_metrics.length > 0 ? (
        <div className={`${PANEL_CLASS} border-zinc-700/40 bg-zinc-900/20`}>
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-400">Unavailable Metrics</p>
          <p className="mt-2 text-sm text-zinc-500">
            {summary.unavailable_metrics.join(", ")}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function NexusReportsCenter() {
  const scrollRef = useNexusScrollRestoration("nexus:reports");
  const [tab, setTab] = useNexusStoredState<ReportTab>("nexus:reports:tab", "overview");
  const summaryQuery = useNexusFetch<SummaryPayload>("/api/nexus/reports/summary");
  const weeklyQuery = useNexusFetch<WeeklyPayload>(
    tab === "weekly" ? "/api/nexus/reports/weekly" : null,
  );
  const monthlyQuery = useNexusFetch<MonthlyPayload>(
    tab === "monthly" ? "/api/nexus/reports/monthly" : null,
  );

  const tabs = useMemo(
    () => [
      { id: "overview" as const, label: "Overview" },
      { id: "weekly" as const, label: "Weekly" },
      { id: "monthly" as const, label: "Monthly" },
    ],
    [],
  );

  const loading =
    tab === "overview"
      ? summaryQuery.loading
      : tab === "weekly"
        ? weeklyQuery.loading
        : monthlyQuery.loading;

  const error =
    tab === "overview"
      ? summaryQuery.error
      : tab === "weekly"
        ? weeklyQuery.error
        : monthlyQuery.error;

  const refresh = async () => {
    await summaryQuery.refresh();
    if (tab === "weekly") await weeklyQuery.refresh();
    if (tab === "monthly") await monthlyQuery.refresh();
  };

  const summary = summaryQuery.data;
  const weekly = weeklyQuery.data?.report;
  const monthly = monthlyQuery.data?.report;

  return (
    <div ref={scrollRef}>
      <NexusSectionFrame
        title="Executive Reports"
        description="Read-only intelligence for Crimson Society business and community performance. Mark I — no AI, export, or automation."
        loading={loading}
        error={error}
        onRefresh={refresh}
      >
      {!loading ? (
        <>
          <div className="rounded-2xl border border-[#b4141e]/20 bg-[#b4141e]/5 p-4 text-sm text-zinc-300">
            Executive Reports aggregate existing Nexus metrics, insights, alerts, and operational
            signals. All data is owner-only and read-only.
          </div>

          <NexusTabFilter tabs={tabs} value={tab} onChange={setTab} />

          {tab === "overview" && summary ? <OverviewSections summary={summary} /> : null}

          {tab === "weekly" && weekly ? <WeeklyReportPanel report={weekly} /> : null}
          {tab === "weekly" && !weekly && !error ? (
            <NexusListEmpty title="Weekly report unavailable" description="Could not generate weekly report." />
          ) : null}

          {tab === "monthly" && monthly ? <MonthlyReportPanel report={monthly} /> : null}
          {tab === "monthly" && !monthly && !error ? (
            <NexusListEmpty title="Monthly report unavailable" description="Could not generate monthly report." />
          ) : null}
        </>
      ) : null}
      </NexusSectionFrame>
    </div>
  );
}

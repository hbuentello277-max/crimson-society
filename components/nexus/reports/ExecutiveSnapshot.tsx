"use client";

import type { ExecutiveReportSummary } from "@/lib/reports/types";
import { formatCurrency, formatNumber } from "@/lib/nexus/format";
import { NexusStatCard } from "@/components/nexus/NexusShared";

export function ExecutiveSnapshot({ summary }: { summary: ExecutiveReportSummary }) {
  const { snapshot } = summary;

  const cards = [
    { label: "Total Users", value: formatNumber(snapshot.total_users) },
    { label: "New Users (Week)", value: formatNumber(snapshot.new_users_this_week) },
    { label: "New Users (Month)", value: formatNumber(snapshot.new_users_this_month) },
    { label: "Blackcard Members", value: formatNumber(snapshot.blackcard_members) },
    { label: "Estimated MRR", value: formatCurrency(snapshot.estimated_mrr) },
    { label: "Estimated ARR", value: formatCurrency(snapshot.estimated_arr) },
    { label: "Posts (Week)", value: formatNumber(snapshot.posts_this_week) },
    { label: "Meets (Week)", value: formatNumber(snapshot.meets_created_this_week) },
    { label: "Messages (Week)", value: formatNumber(snapshot.messages_this_week) },
    { label: "Active Insights", value: formatNumber(snapshot.active_observations) },
    { label: "Open Alerts", value: formatNumber(snapshot.open_alerts) },
    { label: "Open Incidents", value: formatNumber(snapshot.open_incidents) },
  ];

  return (
    <section className="space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Executive Snapshot</p>
        <p className="mt-1 text-sm text-zinc-400">
          Read-only business and community performance at a glance.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {cards.map((card) => (
          <NexusStatCard key={card.label} label={card.label} value={card.value} compact />
        ))}
      </div>
    </section>
  );
}

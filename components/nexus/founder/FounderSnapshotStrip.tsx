"use client";

import { formatCurrency, formatNumber } from "@/lib/nexus/format";
import { NexusStatCard } from "@/components/nexus/NexusShared";

export function FounderSnapshotStrip({
  snapshot,
}: {
  snapshot: {
    totalMembers: number | null;
    newMembers: number | null;
    activeProfiles: number | null;
    blackcardMembers: number | null;
    estimatedMrr: number | null;
    estimatedArr: number | null;
    openAlerts: number | null;
    openIncidents: number | null;
    activeInsights: number | null;
    pendingCommands: number | null;
  };
}) {
  const cards = [
    { label: "Total Members", value: formatNumber(snapshot.totalMembers) },
    { label: "New Members", value: formatNumber(snapshot.newMembers) },
    { label: "Active Profiles", value: formatNumber(snapshot.activeProfiles) },
    { label: "Blackcard Members", value: formatNumber(snapshot.blackcardMembers) },
    { label: "Estimated MRR", value: formatCurrency(snapshot.estimatedMrr) },
    { label: "Estimated ARR", value: formatCurrency(snapshot.estimatedArr) },
    { label: "Open Alerts", value: formatNumber(snapshot.openAlerts) },
    { label: "Open Incidents", value: formatNumber(snapshot.openIncidents) },
    { label: "Active Insights", value: formatNumber(snapshot.activeInsights) },
    { label: "Pending Commands", value: formatNumber(snapshot.pendingCommands) },
  ];

  return (
    <section className="space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Daily Snapshot</p>
        <p className="mt-1 text-xs text-zinc-500">Live operational counters</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => (
          <NexusStatCard key={card.label} label={card.label} value={card.value} compact />
        ))}
      </div>
    </section>
  );
}

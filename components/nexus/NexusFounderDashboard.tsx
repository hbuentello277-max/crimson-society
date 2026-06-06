"use client";

import { buildOrbitMetrics, FounderHero } from "@/components/nexus/founder/FounderHero";
import { FounderBriefCard } from "@/components/nexus/founder/FounderBriefCard";
import { FounderSnapshotStrip } from "@/components/nexus/founder/FounderSnapshotStrip";
import { FounderPriorityList } from "@/components/nexus/founder/FounderPriorityList";
import { FounderOpportunityGrid } from "@/components/nexus/founder/FounderOpportunityGrid";
import { FounderQuickActions } from "@/components/nexus/founder/FounderQuickActions";
import { NexusLoadingPanel, NexusRefreshButton } from "@/components/nexus/NexusShared";
import { useNexusFounderDashboard } from "@/hooks/nexus/useNexusFounderDashboard";

export function NexusFounderDashboard() {
  const {
    health,
    metrics,
    mission,
    alerts,
    incidents,
    observations,
    commands,
    platformStatus,
    brief,
    priorities,
    opportunities,
    errors,
    loading,
    refresh,
  } = useNexusFounderDashboard();

  if (loading) {
    return <NexusLoadingPanel rows={4} />;
  }

  const orbitMetrics = buildOrbitMetrics({
    members: metrics?.growth?.total_users ?? null,
    blackcard: metrics?.blackcard?.active_members ?? null,
    mrr: metrics?.revenue?.estimated_mrr ?? null,
    arr: metrics?.revenue?.estimated_arr ?? null,
    alerts: alerts?.counts?.active ?? null,
    incidents: incidents?.open?.length ?? null,
    commands:
      (commands?.counts?.suggested ?? 0) +
      (commands?.counts?.pending_approval ?? 0) +
      (commands?.counts?.approved ?? 0),
    health: health?.system?.status ?? "unknown",
    workflows: mission?.status ?? "unknown",
    insights: observations?.counts?.active ?? null,
  });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto pb-2">
      <div className="flex items-center justify-end">
        {errors.length > 0 ? (
          <span className="mr-auto text-[10px] uppercase tracking-[0.14em] text-amber-400">
            Partial telemetry
          </span>
        ) : null}
        <NexusRefreshButton compact onClick={() => void refresh()} />
      </div>

      <FounderHero
        platformStatus={platformStatus}
        systemStatus={health?.system?.status ?? "unknown"}
        lastHealthCheck={health?.system?.checked_at ?? mission?.checked_at ?? null}
        platformState={platformStatus}
        orbitMetrics={orbitMetrics}
      />

      <FounderBriefCard brief={brief} />

      <FounderSnapshotStrip
        snapshot={{
          totalMembers: metrics?.growth?.total_users ?? null,
          newMembers: metrics?.growth?.new_users_this_week ?? null,
          activeProfiles: metrics?.growth?.active_profiles ?? null,
          blackcardMembers: metrics?.blackcard?.active_members ?? null,
          estimatedMrr: metrics?.revenue?.estimated_mrr ?? null,
          estimatedArr: metrics?.revenue?.estimated_arr ?? null,
          openAlerts: alerts?.counts?.active ?? null,
          openIncidents: incidents?.open?.length ?? null,
          activeInsights: observations?.counts?.active ?? null,
          pendingCommands:
            (commands?.counts?.suggested ?? 0) + (commands?.counts?.pending_approval ?? 0),
        }}
      />

      <FounderPriorityList priorities={priorities} />
      <FounderOpportunityGrid opportunities={opportunities} />
      <FounderQuickActions />
    </div>
  );
}

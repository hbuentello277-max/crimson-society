"use client";

import { useCallback, useMemo } from "react";
import { buildOrbitMetrics, FounderHero } from "@/components/nexus/founder/FounderHero";
import { FounderBriefCard } from "@/components/nexus/founder/FounderBriefCard";
import { MorningBriefingCard } from "@/components/nexus/founder/MorningBriefingCard";
import { FounderSnapshotStrip } from "@/components/nexus/founder/FounderSnapshotStrip";
import { FounderPriorityList } from "@/components/nexus/founder/FounderPriorityList";
import { FounderOpportunityGrid } from "@/components/nexus/founder/FounderOpportunityGrid";
import { FounderQuickActions } from "@/components/nexus/founder/FounderQuickActions";
import { PlatformIntelligenceSection } from "@/components/nexus/founder/PlatformIntelligenceSection";
import { NexusLoadingPanel } from "@/components/nexus/NexusShared";
import { useNexusFounderDashboard } from "@/hooks/nexus/useNexusFounderDashboard";
import { useNexusScrollRestoration } from "@/hooks/nexus/useNexusPageState";
import { useNexusSync } from "@/hooks/nexus/useNexusSync";

export function NexusFounderDashboard() {
  const { ref: scrollRef } = useNexusScrollRestoration("nexus:founder-dashboard");
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

  const { syncing, lastSyncedAt, toast, sync, clearToast } = useNexusSync();

  const handleSync = useCallback(async () => {
    const synced = await sync();
    if (synced) {
      await refresh();
    }
  }, [refresh, sync]);

  const orbitMetrics = useMemo(
    () =>
      buildOrbitMetrics({
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
      }),
    [alerts, commands, health, incidents, metrics, mission, observations],
  );

  const snapshot = useMemo(
    () => ({
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
    }),
    [alerts, commands, incidents, metrics, observations],
  );

  if (loading) {
    return <NexusLoadingPanel rows={4} />;
  }

  return (
    <div
      ref={scrollRef}
      className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto pb-2"
    >
      {toast ? (
        <div
          className={`fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] left-3 right-3 z-50 mx-auto max-w-md rounded-xl border px-4 py-3 text-sm shadow-lg sm:left-auto sm:right-4 ${
            toast.tone === "success"
              ? "border-emerald-500/30 bg-emerald-950/95 text-emerald-100"
              : "border-amber-500/30 bg-amber-950/95 text-amber-100"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <p>{toast.message}</p>
            <button
              type="button"
              onClick={clearToast}
              className="shrink-0 text-[10px] uppercase tracking-[0.14em] opacity-70"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <FounderHero
        platformStatus={platformStatus}
        systemStatus={health?.system?.status ?? "unknown"}
        lastHealthCheck={health?.system?.checked_at ?? mission?.checked_at ?? null}
        platformState={platformStatus}
        orbitMetrics={orbitMetrics}
        onRefresh={() => void handleSync()}
        partialTelemetry={errors.length > 0}
        syncing={syncing}
        lastSyncedAt={lastSyncedAt}
      />

      <MorningBriefingCard />
      <PlatformIntelligenceSection />
      <FounderBriefCard brief={brief} />

      <FounderSnapshotStrip snapshot={snapshot} />

      <FounderPriorityList priorities={priorities} />
      <FounderOpportunityGrid opportunities={opportunities} />
      <FounderQuickActions />
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import type {
  MissionAccelerator,
  MissionControlSummary,
  MissionHistoryItem,
  MissionObjectiveView,
  MissionStatus,
  MissionThreat,
} from "@/lib/mission-control/types";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import { MissionAccelerators } from "@/components/nexus/mission-control/MissionAccelerators";
import { MissionObjectives } from "@/components/nexus/mission-control/MissionObjectives";
import { MissionScoreCard } from "@/components/nexus/mission-control/MissionScoreCard";
import { MissionStatusHero } from "@/components/nexus/mission-control/MissionStatusHero";
import { MissionThreats } from "@/components/nexus/mission-control/MissionThreats";
import { MissionTimeline } from "@/components/nexus/mission-control/MissionTimeline";
import { NexusSectionFrame } from "@/components/nexus/NexusShared";

type MissionControlPayload = Partial<MissionControlSummary> & {
  ok?: boolean;
};

function MissionSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">{title}</p>
        <p className="mt-1 text-xs text-zinc-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function FocusStrip({
  secondaryFocus,
  topThreat,
  topOpportunity,
}: {
  secondaryFocus: string;
  topThreat: string;
  topOpportunity: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <FocusField label="Secondary Focus" value={secondaryFocus} />
      <FocusField label="Top Threat" value={topThreat} tone="threat" />
      <FocusField label="Top Opportunity" value={topOpportunity} tone="opportunity" />
    </div>
  );
}

function FocusField({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "threat" | "opportunity";
}) {
  const border =
    tone === "threat"
      ? "border-amber-500/25 bg-amber-500/5"
      : tone === "opportunity"
        ? "border-emerald-500/25 bg-emerald-500/5"
        : "border-white/10 bg-black/30";

  return (
    <div className={`rounded-xl border px-3 py-3 ${border}`}>
      <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 break-words text-sm leading-6 text-zinc-200">{value}</p>
    </div>
  );
}

export function NexusMissionControlCenter() {
  const { data, error, loading, refresh } = useNexusFetch<MissionControlPayload>(
    "/api/nexus/mission-control",
  );

  const ready = !loading && data?.mission_status;

  return (
    <NexusSectionFrame
      title="Platform Control"
      description="Highest-level strategic view for the founder. Aggregates Planning, Forecasting, Copilot, Operational Intelligence, Memory, Alerts, Incidents, and Health. Read-only — no AI, no execution."
      loading={loading}
      error={error}
      onRefresh={refresh}
    >
      {ready ? (
        <div className="min-w-0 space-y-8 overflow-x-hidden">
          <MissionStatusHero
            missionStatus={data.mission_status as MissionStatus}
            missionScore={data.mission_score ?? 0}
            primaryFocus={data.primary_focus ?? ""}
            missionSummary={data.mission_summary ?? ""}
            onRefresh={refresh}
            loading={loading}
          />

          <FocusStrip
            secondaryFocus={data.secondary_focus ?? ""}
            topThreat={data.top_threat ?? ""}
            topOpportunity={data.top_opportunity ?? ""}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <MissionScoreCard
              missionScore={data.mission_score ?? 0}
              scoreBreakdown={data.score_breakdown ?? {}}
            />

            <MissionSection
              title="Platform Objectives"
              description="Current, weekly, and monthly objectives from Planning"
            >
              <MissionObjectives objectives={(data.objectives ?? []) as MissionObjectiveView[]} />
            </MissionSection>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <MissionSection
              title="Platform Threats"
              description="Ranked threats to platform stability"
            >
              <MissionThreats threats={(data.threats ?? []) as MissionThreat[]} />
            </MissionSection>

            <MissionSection
              title="Platform Accelerators"
              description="Signals that accelerate platform momentum"
            >
              <MissionAccelerators accelerators={(data.accelerators ?? []) as MissionAccelerator[]} />
            </MissionSection>
          </div>

          <MissionSection
            title="Platform Timeline"
            description="Recent platform history from Memory"
          >
            <MissionTimeline history={(data.recent_history ?? []) as MissionHistoryItem[]} />
          </MissionSection>
        </div>
      ) : null}
    </NexusSectionFrame>
  );
}

"use client";

import type {
  FounderPlanningBrief,
  PlanningObjective,
  PlanningOpportunity,
  PlanningPriority,
  PlanningRisk,
} from "@/lib/planning/types";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import { PlanningBriefCard } from "@/components/nexus/planning/PlanningBriefCard";
import { ObjectiveCard } from "@/components/nexus/planning/ObjectiveCard";
import { PriorityBoard } from "@/components/nexus/planning/PriorityBoard";
import { RiskOpportunityPanel } from "@/components/nexus/planning/RiskOpportunityPanel";
import { NexusSectionFrame } from "@/components/nexus/NexusShared";

type PlanningPayload = {
  ok?: boolean;
  generated_at?: string;
  brief?: FounderPlanningBrief;
  weekly_objectives?: PlanningObjective[];
  monthly_objectives?: PlanningObjective[];
  priorities?: PlanningPriority[];
  risks?: PlanningRisk[];
  opportunities?: PlanningOpportunity[];
};

export function NexusPlanningCenter() {
  const { data, error, loading, refresh } = useNexusFetch<PlanningPayload>("/api/nexus/planning");

  return (
    <NexusSectionFrame
      title="Planning"
      description="Strategic objectives, risks, and opportunities derived from Reports, Briefings, Intelligence, Memory, and Correlations. Mark I — read-only, no AI or execution."
      loading={loading}
      error={error}
      onRefresh={refresh}
    >
      {!loading && data?.brief ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#b4141e]/20 bg-[#b4141e]/5 p-4 text-sm text-zinc-300">
            Nexus Planning turns existing operational signals into weekly and monthly owner objectives,
            ranked priorities, risks, and opportunities. Scan this page in under 30 seconds to see where
            Crimson Society should focus next.
          </div>

          <PlanningBriefCard brief={data.brief} />

          <section className="space-y-3">
            <SectionHeading title="Weekly Objectives" description="Focus areas for the current week" />
            <ObjectiveGrid objectives={data.weekly_objectives ?? []} empty="No weekly objectives matched current data." />
          </section>

          <section className="space-y-3">
            <SectionHeading title="Monthly Objectives" description="Strategic focus for the current month" />
            <ObjectiveGrid objectives={data.monthly_objectives ?? []} empty="No monthly objectives matched current data." />
          </section>

          <section className="space-y-3">
            <SectionHeading title="Strategic Priorities" description="Ranked by urgency" />
            <PriorityBoard priorities={data.priorities ?? []} />
          </section>

          <RiskOpportunityPanel risks={data.risks ?? []} opportunities={data.opportunities ?? []} />
        </div>
      ) : null}
    </NexusSectionFrame>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">{title}</p>
      <p className="mt-1 text-xs text-zinc-500">{description}</p>
    </div>
  );
}

function ObjectiveGrid({
  objectives,
  empty,
}: {
  objectives: PlanningObjective[];
  empty: string;
}) {
  if (objectives.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-sm text-zinc-500">{empty}</div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {objectives.map((objective) => (
        <ObjectiveCard key={objective.id} objective={objective} />
      ))}
    </div>
  );
}

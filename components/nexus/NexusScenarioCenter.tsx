"use client";

import type { ReactNode } from "react";
import type { ScenariosSummary } from "@/lib/scenarios/types";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import { ScenarioCard } from "@/components/nexus/scenarios/ScenarioCard";
import { ScenarioComparison } from "@/components/nexus/scenarios/ScenarioComparison";
import { ScenarioRanking } from "@/components/nexus/scenarios/ScenarioRanking";
import { ScenarioSummary } from "@/components/nexus/scenarios/ScenarioSummary";
import { NexusSectionFrame } from "@/components/nexus/NexusShared";
import { useNexusScrollRestoration } from "@/hooks/nexus/useNexusPageState";

type ScenariosPayload = Partial<ScenariosSummary> & {
  ok?: boolean;
};

function ScenarioSection({
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

export function NexusScenarioCenter() {
  const scrollRef = useNexusScrollRestoration("nexus:scenarios");
  const { data, error, loading, refresh } = useNexusFetch<ScenariosPayload>("/api/nexus/scenarios");

  const ready = !loading && data?.brief;

  return (
    <div ref={scrollRef}>
      <NexusSectionFrame
        title="Scenarios"
        description="Compare strategic paths using Forecasting, Planning, Decision Engine, Mission Control, Correlations, Intelligence, Memory, Reports, Briefings, and Metrics. Deterministic analysis only — no AI, no execution."
        loading={loading}
        error={error}
        onRefresh={refresh}
      >
        {ready && data.brief ? (
          <div className="min-w-0 space-y-8 overflow-x-hidden">
          <ScenarioSummary brief={data.brief} available={data.available ?? false} />

          <ScenarioSection
            title="Scenario Comparison"
            description="Expected benefit, risk, confidence, and strategic impact across all paths"
          >
            <ScenarioComparison rows={data.comparison ?? []} />
          </ScenarioSection>

          <ScenarioSection
            title="Growth Scenario"
            description="What happens if founder prioritizes onboarding and acquisition"
          >
            {data.growth ? <ScenarioCard scenario={data.growth} /> : null}
          </ScenarioSection>

          <ScenarioSection
            title="Revenue Scenario"
            description="What happens if founder prioritizes Blackcard and monetization"
          >
            {data.revenue ? <ScenarioCard scenario={data.revenue} /> : null}
          </ScenarioSection>

          <ScenarioSection
            title="Engagement Scenario"
            description="What happens if founder prioritizes posts, meets, and messaging"
          >
            {data.engagement ? <ScenarioCard scenario={data.engagement} /> : null}
          </ScenarioSection>

          <ScenarioSection
            title="Operations Scenario"
            description="What happens if founder prioritizes workflow health and reliability"
          >
            {data.operations ? <ScenarioCard scenario={data.operations} /> : null}
          </ScenarioSection>

          <ScenarioSection
            title="Scenario Rankings"
            description="Best overall, growth, revenue, and lowest-risk paths"
          >
            <ScenarioRanking rankings={data.rankings ?? {
              best_overall: null,
              highest_growth: null,
              highest_revenue: null,
              lowest_risk: null,
              nexus_favored: null,
            }} ranked={data.ranked ?? []} />
          </ScenarioSection>
          </div>
        ) : null}
      </NexusSectionFrame>
    </div>
  );
}

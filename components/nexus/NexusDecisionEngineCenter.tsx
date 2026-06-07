"use client";

import type { ReactNode } from "react";
import type { DecisionEngineSummary } from "@/lib/decision-engine/types";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import { DecisionBriefPanel } from "@/components/nexus/decision-engine/DecisionBrief";
import { DecisionCardList } from "@/components/nexus/decision-engine/DecisionCard";
import { DecisionHero } from "@/components/nexus/decision-engine/DecisionHero";
import { DecisionRanking } from "@/components/nexus/decision-engine/DecisionRanking";
import { NexusSectionFrame } from "@/components/nexus/NexusShared";

type DecisionEnginePayload = Partial<DecisionEngineSummary> & {
  ok?: boolean;
};

function DecisionSection({
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

export function NexusDecisionEngineCenter() {
  const { data, error, loading, refresh } = useNexusFetch<DecisionEnginePayload>(
    "/api/nexus/decision-engine",
  );

  const ready = !loading && data?.brief;
  const topDecision = data?.top_recommended?.[0];

  return (
    <NexusSectionFrame
      title="Decision Engine"
      description="Deterministic strategic decision support from Mission Control, Planning, Forecasting, Copilot, Intelligence, Correlations, Memory, Reports, Commands, Alerts, and Incidents. Read-only — no AI, no execution."
      loading={loading}
      error={error}
      onRefresh={refresh}
    >
      {ready && data.brief ? (
        <div className="min-w-0 space-y-8 overflow-x-hidden">
          <DecisionHero
            bestDecision={data.brief.best_decision_now}
            priority={topDecision?.priority ?? "medium"}
            decisionScore={topDecision?.decision_score ?? 0}
            onRefresh={refresh}
            loading={loading}
          />

          <DecisionBriefPanel brief={data.brief} />

          <DecisionSection
            title="Top Recommended Decisions"
            description="Highest-priority strategic decisions ranked by decision score"
          >
            <DecisionCardList decisions={data.top_recommended ?? []} />
          </DecisionSection>

          <div className="grid gap-6 lg:grid-cols-2">
            <DecisionSection
              title="Highest ROI Opportunities"
              description="Decisions with the strongest expected impact relative to effort"
            >
              <DecisionCardList decisions={data.highest_roi ?? []} />
            </DecisionSection>

            <DecisionSection
              title="Highest Risk Decisions"
              description="Risk-category and high-urgency decisions requiring attention"
            >
              <DecisionCardList decisions={data.highest_risk ?? []} />
            </DecisionSection>
          </div>

          <DecisionSection
            title="Strategic Priorities"
            description="Decisions with elevated strategic importance to the mission"
          >
            <DecisionCardList decisions={data.strategic_priorities ?? []} />
          </DecisionSection>

          <DecisionSection
            title="Decision Rankings"
            description="Full ranked list with score and ROI comparison"
          >
            <DecisionRanking rankings={data.rankings ?? []} />
          </DecisionSection>
        </div>
      ) : null}
    </NexusSectionFrame>
  );
}

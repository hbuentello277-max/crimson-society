"use client";

import type { ReactNode } from "react";
import type {
  CopilotOpportunity,
  CopilotRisk,
  CopilotSignal,
  DailyFocusItem,
  FounderGuidanceBrief,
} from "@/lib/copilot/types";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import { DailyFocusCard } from "@/components/nexus/copilot/DailyFocusCard";
import { FounderGuidanceCard } from "@/components/nexus/copilot/FounderGuidanceCard";
import { OpportunityPanel } from "@/components/nexus/copilot/OpportunityPanel";
import { RiskPanel } from "@/components/nexus/copilot/RiskPanel";
import { NexusListEmpty, NexusSectionFrame } from "@/components/nexus/NexusShared";

type CopilotPayload = {
  ok?: boolean;
  generated_at?: string;
  guidance?: FounderGuidanceBrief;
  daily_focus?: DailyFocusItem[];
  top_opportunity?: CopilotOpportunity | null;
  top_risk?: CopilotRisk | null;
  improving_signals?: CopilotSignal[];
  declining_signals?: CopilotSignal[];
  recommended_next_steps?: string[];
};

function CopilotSection({
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

function SignalList({ items, tone }: { items: CopilotSignal[]; tone: "improving" | "declining" }) {
  if (items.length === 0) {
    return (
      <NexusListEmpty
        title={tone === "improving" ? "No improving signals" : "No declining signals"}
        description="Nexus will surface trend shifts as more operational history accumulates."
      />
    );
  }

  const border =
    tone === "improving" ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/20 bg-amber-500/5";

  return (
    <div className="space-y-2">
      {items.map((signal) => (
        <div key={signal.id} className={`rounded-xl border p-3 ${border}`}>
          <p className="break-words text-sm font-medium text-white">{signal.label}</p>
          <p className="mt-1 break-words text-sm leading-6 text-zinc-400">{signal.summary}</p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-zinc-600">
            Source {signal.source}
          </p>
        </div>
      ))}
    </div>
  );
}

export function NexusCopilotCenter() {
  const { data, error, loading, refresh } = useNexusFetch<CopilotPayload>("/api/nexus/copilot");

  return (
    <NexusSectionFrame
      title="Copilot"
      description="Daily founder guidance from Reports, Briefings, Intelligence, Memory, Correlations, Planning, and Forecasting. Read-only — no AI, no execution."
      loading={loading}
      error={error}
      onRefresh={refresh}
    >
      {!loading && data?.guidance ? (
        <div className="min-w-0 space-y-8 overflow-x-hidden">
          <div className="rounded-2xl border border-[#b4141e]/20 bg-[#b4141e]/5 p-4 text-sm text-zinc-300">
            What deserves attention today? What should you focus on first? What is improving, what is
            getting worse, and where are the biggest opportunity and risk?
          </div>

          <FounderGuidanceCard guidance={data.guidance} />

          <CopilotSection
            title="Daily Focus"
            description="Highest-urgency items for today"
          >
            <DailyFocusCard items={data.daily_focus ?? []} />
          </CopilotSection>

          <CopilotSection
            title="Biggest Opportunity"
            description="Most valuable supported opportunity right now"
          >
            <OpportunityPanel opportunity={data.top_opportunity ?? null} />
          </CopilotSection>

          <CopilotSection
            title="Biggest Risk"
            description="Most dangerous active risk pattern"
          >
            <RiskPanel risk={data.top_risk ?? null} />
          </CopilotSection>

          <CopilotSection
            title="Improving Signals"
            description="Trends moving in a positive direction"
          >
            <SignalList items={data.improving_signals ?? []} tone="improving" />
          </CopilotSection>

          <CopilotSection
            title="Declining Signals"
            description="Trends that need attention"
          >
            <SignalList items={data.declining_signals ?? []} tone="declining" />
          </CopilotSection>

          <CopilotSection
            title="Recommended Next Steps"
            description="Rule-based actions to consider today"
          >
            {(data.recommended_next_steps ?? []).length === 0 ? (
              <NexusListEmpty
                title="No next steps"
                description="Run Sync on the Founder Dashboard to refresh guidance inputs."
              />
            ) : (
              <ol className="space-y-2">
                {(data.recommended_next_steps ?? []).map((step, index) => (
                  <li
                    key={`${index}-${step.slice(0, 24)}`}
                    className="flex gap-3 rounded-xl border border-white/10 bg-black/30 p-3"
                  >
                    <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                      {index + 1}
                    </span>
                    <span className="break-words text-sm leading-6 text-zinc-300">{step}</span>
                  </li>
                ))}
              </ol>
            )}
          </CopilotSection>
        </div>
      ) : null}
    </NexusSectionFrame>
  );
}

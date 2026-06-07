"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type {
  InfluenceRankingItem,
  OperationalDragItem,
  OperationalDriver,
  OperationalIntelligenceItem,
  OperationalIntelligenceOverview,
  RepeatingPattern,
  RelationshipLink,
} from "@/lib/operational-intelligence/types";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import { InfluenceRanking } from "@/components/nexus/intelligence/InfluenceRanking";
import { OperationalDrivers } from "@/components/nexus/intelligence/OperationalDrivers";
import { PatternCard } from "@/components/nexus/intelligence/PatternCard";
import { RelationshipMap } from "@/components/nexus/intelligence/RelationshipMap";
import { NexusListEmpty, NexusPanel, NexusSectionFrame } from "@/components/nexus/NexusShared";

type OperationalIntelligencePayload = {
  ok?: boolean;
  generated_at?: string;
  overview?: OperationalIntelligenceOverview;
  relationships?: RelationshipLink[];
  patterns?: RepeatingPattern[];
  influence_rankings?: InfluenceRankingItem[];
  drivers?: OperationalDriver[];
  drag?: OperationalDragItem[];
  recommendations?: OperationalIntelligenceItem[];
};

function Section({
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

export function NexusOperationalIntelligenceCenter() {
  const { data, error, loading, refresh } = useNexusFetch<OperationalIntelligencePayload>(
    "/api/nexus/operational-intelligence",
  );

  return (
    <NexusSectionFrame
      title="Operational Intelligence"
      description="Unified operational awareness from Reports, Briefings, Intelligence, Memory, Correlations, Planning, Forecasting, and Copilot. Read-only — no AI, no execution."
      loading={loading}
      error={error}
      onRefresh={refresh}
    >
      {!loading ? (
        <div className="min-w-0 space-y-8 overflow-x-hidden">
          <div className="rounded-2xl border border-[#b4141e]/20 bg-[#b4141e]/5 p-4 text-sm text-zinc-300">
            What is actually driving Crimson Society right now? Which systems influence each other,
            which patterns repeat, and where are the biggest drivers and drag signals?
          </div>

          {data?.overview ? (
            <Section title="Operational Overview" description="Current cross-signal summary">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5">
                <p className="break-words text-sm leading-7 text-zinc-200">{data.overview.headline}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="Relationships" value={`${data.overview.relationship_count}`} />
                  <Stat label="Patterns" value={`${data.overview.pattern_count}`} />
                  <Stat label="Drivers" value={`${data.overview.driver_count}`} />
                  <Stat label="Drag Signals" value={`${data.overview.drag_count}`} />
                </div>
              </div>
            </Section>
          ) : null}

          <Section title="Relationship Map" description="How operational signals influence each other">
            <RelationshipMap relationships={data?.relationships ?? []} />
          </Section>

          <Section title="Repeating Patterns" description="Patterns that recur across Nexus history">
            {(data?.patterns ?? []).length === 0 ? (
              <NexusListEmpty
                title="No repeating patterns"
                description="Patterns appear when correlations and memory support recurring relationships."
              />
            ) : (
              <div className="space-y-3">
                {(data?.patterns ?? []).map((pattern) => (
                  <PatternCard key={pattern.id} pattern={pattern} />
                ))}
              </div>
            )}
          </Section>

          <Section title="Influence Rankings" description="Strongest influences on core outcomes">
            <InfluenceRanking items={data?.influence_rankings ?? []} />
          </Section>

          <Section title="Operational Drivers & Drag" description="What helps vs what hurts">
            <OperationalDrivers drivers={data?.drivers ?? []} drag={data?.drag ?? []} />
          </Section>

          <Section title="Recommendations" description="Rule-based next areas to review">
            {(data?.recommendations ?? []).length === 0 ? (
              <NexusListEmpty
                title="No recommendations"
                description="Run Sync and refresh operational data to populate intelligence recommendations."
              />
            ) : (
              <div className="space-y-3">
                {(data?.recommendations ?? []).map((item) => (
                  <RecommendationCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </Section>
        </div>
      ) : null}
    </NexusSectionFrame>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function RecommendationCard({ item }: { item: OperationalIntelligenceItem }) {
  return (
    <NexusPanel>
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{item.category}</span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
            Influence {item.influence_score}
          </span>
        </div>
        <p className="break-words text-base font-medium text-white">{item.title}</p>
        <p className="break-words text-sm leading-6 text-zinc-400">{item.summary}</p>
        <p className="break-words text-sm text-zinc-300">{item.recommendation}</p>
        {item.related_routes[0] ? (
          <Link
            href={item.related_routes[0]}
            className="inline-flex text-[10px] uppercase tracking-[0.16em] text-[#f1c3c7]"
          >
            Open related route
          </Link>
        ) : null}
      </div>
    </NexusPanel>
  );
}

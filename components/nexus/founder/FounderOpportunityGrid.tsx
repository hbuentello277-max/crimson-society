"use client";

import type { IntelligenceItem } from "@/lib/intelligence/types";

export function FounderOpportunityGrid({ opportunities }: { opportunities: IntelligenceItem[] }) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Growth Opportunities</p>
        <p className="mt-1 text-xs text-zinc-500">Deterministic intelligence signals</p>
      </div>

      {opportunities.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-sm text-zinc-500">
          No supported opportunity patterns detected from current data.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {opportunities.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-[#b4141e]/20 bg-[#0a0608]/80 p-4 backdrop-blur-sm"
            >
              <p className="text-base font-semibold text-white">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">{item.summary}</p>
              <div className="mt-4 rounded-xl border border-[#b4141e]/15 bg-black/30 p-3">
                <p className="text-[9px] uppercase tracking-[0.16em] text-[#e87a82]">Recommended Action</p>
                <p className="mt-2 text-sm text-zinc-200">{item.recommendation}</p>
              </div>
              <div className="mt-3 flex gap-4 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                <span>Impact {item.impact_score}</span>
                <span>Confidence {item.confidence_score}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

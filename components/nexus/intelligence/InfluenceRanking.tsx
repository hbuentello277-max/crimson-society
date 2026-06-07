"use client";

import type { InfluenceRankingItem } from "@/lib/operational-intelligence/types";
import { NexusPanel } from "@/components/nexus/NexusShared";

export function InfluenceRanking({ items }: { items: InfluenceRankingItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-500">
        Influence rankings will appear as more cross-domain signals accumulate.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <NexusPanel key={item.id}>
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-zinc-600">
              #{index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="break-words text-sm font-medium text-white">{item.signal}</p>
                <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                  {item.domain.replaceAll("_", " ")}
                </span>
                <span
                  className={`text-[10px] uppercase tracking-[0.14em] ${
                    item.direction === "positive"
                      ? "text-emerald-400"
                      : item.direction === "negative"
                        ? "text-amber-400"
                        : "text-zinc-500"
                  }`}
                >
                  {item.direction}
                </span>
              </div>
              <p className="mt-1 break-words text-sm text-zinc-400">{item.summary}</p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                Influence {item.influence_score} · Confidence {item.confidence_score}
              </p>
            </div>
          </div>
        </NexusPanel>
      ))}
    </div>
  );
}

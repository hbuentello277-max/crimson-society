"use client";

import Link from "next/link";
import type { FounderPriority } from "@/lib/nexus/founder-derive";

const URGENCY_LABELS: Record<FounderPriority["urgency"], string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const URGENCY_CLASS: Record<FounderPriority["urgency"], string> = {
  critical: "border-red-500/40 bg-red-500/10 text-red-100",
  high: "border-amber-500/35 bg-amber-500/10 text-amber-100",
  medium: "border-[#b4141e]/30 bg-[#b4141e]/8 text-[#f1c3c7]",
  low: "border-white/10 bg-black/30 text-zinc-300",
};

export function FounderPriorityList({ priorities }: { priorities: FounderPriority[] }) {
  const grouped = {
    critical: priorities.filter((item) => item.urgency === "critical"),
    high: priorities.filter((item) => item.urgency === "high"),
    medium: priorities.filter((item) => item.urgency === "medium"),
    low: priorities.filter((item) => item.urgency === "low"),
  };

  return (
    <section className="space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Today&apos;s Priorities</p>
        <p className="mt-1 text-xs text-zinc-500">Ranked by urgency</p>
      </div>

      {priorities.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-sm text-zinc-500">
          No urgent priorities detected. Continue monitoring platform signals.
        </div>
      ) : (
        <div className="space-y-4">
          {(["critical", "high", "medium", "low"] as const).map((urgency) => {
            const items = grouped[urgency];
            if (items.length === 0) return null;

            return (
              <div key={urgency} className="space-y-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  {URGENCY_LABELS[urgency]}
                </p>
                {items.map((item) => (
                  <article
                    key={item.id}
                    className={`rounded-xl border p-4 ${URGENCY_CLASS[item.urgency]}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="mt-2 text-sm leading-6 opacity-90">{item.reason}</p>
                        <p className="mt-2 text-[10px] uppercase tracking-[0.16em] opacity-70">
                          Source: {item.source}
                        </p>
                      </div>
                      <Link
                        href={item.href}
                        scroll={false}
                        className="shrink-0 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white transition hover:border-[#b4141e]/50"
                      >
                        Open
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

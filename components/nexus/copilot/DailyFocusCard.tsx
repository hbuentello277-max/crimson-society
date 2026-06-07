"use client";

import Link from "next/link";
import type { DailyFocusItem } from "@/lib/copilot/types";
import { NexusPanel } from "@/components/nexus/NexusShared";
import { NexusStatusBadge } from "@/components/nexus/NexusStatusBadge";

export function DailyFocusCard({ items }: { items: DailyFocusItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-500">
        No urgent focus items detected from current Nexus signals.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <NexusPanel key={item.id}>
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                  #{index + 1}
                </span>
                <NexusStatusBadge label={item.urgency} />
              </div>
              <p className="mt-2 break-words text-base font-medium text-white">{item.title}</p>
              <p className="mt-2 break-words text-sm leading-6 text-zinc-400">{item.reason}</p>
            </div>
            <Link
              href={item.related_route}
              className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-[#b4141e]/50 bg-[#b4141e]/15 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-[#f1c3c7]"
            >
              Open
            </Link>
          </div>
        </NexusPanel>
      ))}
    </div>
  );
}

"use client";

import Link from "next/link";
import type { MissionAccelerator } from "@/lib/mission-control/types";
import { NexusListEmpty } from "@/components/nexus/NexusShared";

export function MissionAccelerators({ accelerators }: { accelerators: MissionAccelerator[] }) {
  if (accelerators.length === 0) {
    return (
      <NexusListEmpty
        title="No accelerators"
        description="Growth drivers, improving signals, and planning opportunities surface here."
      />
    );
  }

  return (
    <div className="space-y-2">
      {accelerators.map((accelerator) => (
        <article
          key={accelerator.id}
          className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 sm:p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="break-words text-sm font-medium text-white">{accelerator.label}</p>
            <span className="tabular-nums text-[10px] uppercase tracking-[0.14em] text-emerald-300">
              Influence {accelerator.influence_score}
            </span>
          </div>
          <p className="mt-2 break-words text-sm leading-6 text-zinc-400">{accelerator.summary}</p>
          {accelerator.related_routes.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {accelerator.related_routes.map((route) => (
                <Link
                  key={route}
                  href={route}
                  className="rounded-lg border border-emerald-500/20 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-emerald-200 transition hover:bg-emerald-500/10"
                >
                  {route.replace("/admin/nexus/", "")}
                </Link>
              ))}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

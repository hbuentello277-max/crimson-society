"use client";

import Link from "next/link";
import type { OperationalDragItem, OperationalDriver } from "@/lib/operational-intelligence/types";
import { NexusPanel } from "@/components/nexus/NexusShared";

export function OperationalDrivers({
  drivers,
  drag,
}: {
  drivers: OperationalDriver[];
  drag: OperationalDragItem[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="min-w-0 space-y-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-400">Operational Drivers</p>
        {drivers.length === 0 ? (
          <EmptyState message="No strong positive drivers detected in current trends." />
        ) : (
          <div className="space-y-2">
            {drivers.map((driver, index) => (
              <NexusPanel key={driver.id}>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">#{index + 1}</p>
                  <p className="mt-1 break-words text-sm font-medium text-white">{driver.label}</p>
                  <p className="mt-1 break-words text-sm text-zinc-400">{driver.summary}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                    Influence {driver.influence_score}
                  </p>
                  {driver.related_routes[0] ? (
                    <Link
                      href={driver.related_routes[0]}
                      className="mt-2 inline-flex text-[10px] uppercase tracking-[0.14em] text-[#f1c3c7]"
                    >
                      View metrics
                    </Link>
                  ) : null}
                </div>
              </NexusPanel>
            ))}
          </div>
        )}
      </section>

      <section className="min-w-0 space-y-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-amber-400">Operational Drag</p>
        {drag.length === 0 ? (
          <EmptyState message="No recurring negative drag signals detected right now." />
        ) : (
          <div className="space-y-2">
            {drag.map((item, index) => (
              <NexusPanel key={item.id}>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">#{index + 1}</p>
                  <p className="mt-1 break-words text-sm font-medium text-white">{item.label}</p>
                  <p className="mt-1 break-words text-sm text-zinc-400">{item.summary}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                    Severity {item.severity_score}
                  </p>
                  {item.related_routes[0] ? (
                    <Link
                      href={item.related_routes[0]}
                      className="mt-2 inline-flex text-[10px] uppercase tracking-[0.14em] text-[#f1c3c7]"
                    >
                      Investigate
                    </Link>
                  ) : null}
                </div>
              </NexusPanel>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-500">
      {message}
    </div>
  );
}

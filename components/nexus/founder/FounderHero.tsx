"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { PlatformRingStatus } from "@/lib/nexus/founder-derive";
import { formatDateTime, formatNumber, formatRelativeTime } from "@/lib/nexus/format";
import { NexusRefreshButton } from "@/components/nexus/NexusShared";

const NexusTelemetryCore = dynamic(
  () =>
    import("@/components/nexus/founder/NexusTelemetryCore").then((mod) => ({
      default: mod.NexusTelemetryCore,
    })),
  {
    loading: () => (
      <div
        className="mx-auto aspect-square w-full max-w-[min(76vw,15.5rem)] rounded-full border border-[#b4141e]/25 bg-[#0a0608]/80 sm:max-w-[16.5rem]"
        aria-hidden
      />
    ),
  },
);

type OrbitMetric = {
  label: string;
  value: string;
  href?: string;
};

export function FounderHero({
  platformStatus,
  orbitMetrics,
  onRefresh,
  partialTelemetry = false,
  syncing = false,
  lastSyncedAt = null,
}: {
  platformStatus: PlatformRingStatus;
  systemStatus: string;
  lastHealthCheck: string | null;
  platformState: string;
  orbitMetrics: OrbitMetric[];
  onRefresh: () => void;
  partialTelemetry?: boolean;
  syncing?: boolean;
  lastSyncedAt?: string | null;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#b4141e]/30 bg-[#030303]/90 p-4 shadow-[0_0_40px_rgba(180,20,30,0.12)] sm:p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(180,20,30,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(180,20,30,0.08) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(180,20,30,0.14),transparent_62%)]"
      />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.32em] text-[#e87a82]">Nexus Command Center</p>
          <p className="mt-1 text-sm leading-snug text-white">Crimson Society Operating System</p>
          {partialTelemetry ? (
            <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-amber-400">Partial telemetry</p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
          <div className="flex items-center justify-end gap-2">
            <NexusRefreshButton
              compact
              onClick={onRefresh}
              loading={syncing}
              disabled={syncing}
              loadingLabel="Syncing..."
            />
            <Link
              href="/admin/nexus/overview"
              scroll={false}
              className="inline-flex min-h-10 items-center rounded-lg border border-[#b4141e]/40 bg-[#b4141e]/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[#f1c3c7] transition hover:bg-[#b4141e]/20"
            >
              Overview
            </Link>
          </div>
          {lastSyncedAt ? (
            <p className="text-right text-[9px] uppercase tracking-[0.12em] text-zinc-500">
              Synced {formatRelativeTime(lastSyncedAt) || "just now"} · {formatDateTime(lastSyncedAt)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="relative mt-3 min-w-0 sm:mt-4">
        <div className="flex min-w-0 justify-center py-0.5 sm:py-1">
          <NexusTelemetryCore status={platformStatus} />
        </div>

        <div className="mt-2.5 grid min-w-0 grid-cols-2 gap-2 sm:mt-3 sm:grid-cols-3 lg:grid-cols-5">
          {orbitMetrics.map((metric) => (
            <OrbitMetricCard key={metric.label} metric={metric} />
          ))}
        </div>
      </div>
    </section>
  );
}

function OrbitMetricCard({ metric }: { metric: OrbitMetric }) {
  const inner = (
    <>
      <p className="truncate text-[9px] uppercase tracking-[0.16em] text-zinc-500">{metric.label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-white">{metric.value}</p>
    </>
  );

  const className =
    "flex min-h-[3.25rem] min-w-0 flex-col justify-center rounded-xl border border-[#b4141e]/20 bg-black/45 px-3 py-2 backdrop-blur-sm";

  if (metric.href) {
    return (
      <Link
        href={metric.href}
        scroll={false}
        className={`${className} transition hover:border-[#b4141e]/45`}
      >
        {inner}
      </Link>
    );
  }

  return <div className={className}>{inner}</div>;
}

export function buildOrbitMetrics(input: {
  members: number | null;
  blackcard: number | null;
  mrr: number | null;
  arr: number | null;
  alerts: number | null;
  incidents: number | null;
  commands: number | null;
  health: string;
  workflows: string;
  insights: number | null;
}): OrbitMetric[] {
  return [
    { label: "Members", value: formatNumber(input.members), href: "/admin/nexus/metrics" },
    { label: "Blackcard", value: formatNumber(input.blackcard), href: "/admin/nexus/metrics" },
    { label: "MRR", value: input.mrr != null ? `$${input.mrr.toLocaleString()}` : "—", href: "/admin/nexus/metrics" },
    { label: "ARR", value: input.arr != null ? `$${input.arr.toLocaleString()}` : "—", href: "/admin/nexus/metrics" },
    { label: "Alerts", value: formatNumber(input.alerts), href: "/admin/nexus/alerts" },
    { label: "Incidents", value: formatNumber(input.incidents), href: "/admin/nexus/incidents" },
    { label: "Commands", value: formatNumber(input.commands), href: "/admin/nexus/commands" },
    { label: "Health", value: input.health, href: "/admin/nexus/system-health" },
    { label: "Workflows", value: input.workflows, href: "/admin/nexus/mission-health" },
    { label: "Insights", value: formatNumber(input.insights), href: "/admin/nexus/observations" },
  ];
}

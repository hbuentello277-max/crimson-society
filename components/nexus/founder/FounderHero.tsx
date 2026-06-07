"use client";

import Link from "next/link";
import type { PlatformRingStatus } from "@/lib/nexus/founder-derive";
import { formatDateTime, formatNumber, formatRelativeTime } from "@/lib/nexus/format";
import { NexusRing } from "@/components/nexus/founder/NexusRing";
import { NexusRefreshButton } from "@/components/nexus/NexusShared";

type OrbitMetric = {
  label: string;
  value: string;
  href?: string;
};

export function FounderHero({
  platformStatus,
  systemStatus,
  lastHealthCheck,
  platformState,
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
    <section className="relative overflow-hidden rounded-2xl border border-[#b4141e]/30 bg-[#030303]/90 p-4 shadow-[0_0_40px_rgba(180,20,30,0.12)] sm:p-6">
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
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(180,20,30,0.16),transparent_62%)]"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.32em] text-[#e87a82]">Nexus Command Center</p>
          <p className="mt-1 text-sm leading-snug text-white">Crimson Society Operating System</p>
          {partialTelemetry ? (
            <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-amber-400">Partial telemetry</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex items-center gap-2">
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
              className="rounded-lg border border-[#b4141e]/40 bg-[#b4141e]/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[#f1c3c7] transition hover:bg-[#b4141e]/20"
            >
              Overview
            </Link>
          </div>
          {lastSyncedAt ? (
            <p className="text-[9px] uppercase tracking-[0.12em] text-zinc-500">
              Synced {formatRelativeTime(lastSyncedAt) || "just now"} · {formatDateTime(lastSyncedAt)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="relative mt-6 grid min-w-0 gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <OrbitColumn metrics={orbitMetrics.slice(0, 5)} align="left" />
        <div className="flex min-w-0 flex-col items-center justify-center py-2">
          <NexusRing status={platformStatus} size={260} />
          <div className="mt-4 grid w-full max-w-sm grid-cols-2 gap-2 text-center sm:grid-cols-3">
            <TelemetryChip label="System Status" value={systemStatus} />
            <TelemetryChip
              label="Last Health Check"
              value={lastHealthCheck ? formatDateTime(lastHealthCheck) : "—"}
            />
            <TelemetryChip label="Platform State" value={platformState} className="col-span-2 sm:col-span-1" />
          </div>
        </div>
        <OrbitColumn metrics={orbitMetrics.slice(5)} align="right" />
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:hidden">
        {orbitMetrics.map((metric) => (
          <OrbitMetricCard key={metric.label} metric={metric} />
        ))}
      </div>
    </section>
  );
}

function OrbitColumn({
  metrics,
  align,
}: {
  metrics: OrbitMetric[];
  align: "left" | "right";
}) {
  return (
    <div className={`hidden min-w-0 space-y-2 lg:block ${align === "right" ? "text-right" : ""}`}>
      {metrics.map((metric) => (
        <OrbitMetricCard key={metric.label} metric={metric} align={align} />
      ))}
    </div>
  );
}

function OrbitMetricCard({
  metric,
  align = "left",
}: {
  metric: OrbitMetric;
  align?: "left" | "right";
}) {
  const inner = (
    <>
      <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">{metric.label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{metric.value}</p>
    </>
  );

  const className = `rounded-xl border border-[#b4141e]/20 bg-black/40 px-3 py-2 backdrop-blur-sm ${
    align === "right" ? "text-right" : ""
  }`;

  if (metric.href) {
    return (
      <Link
        href={metric.href}
        scroll={false}
        className={`${className} block transition hover:border-[#b4141e]/45`}
      >
        {inner}
      </Link>
    );
  }

  return <div className={className}>{inner}</div>;
}

function TelemetryChip({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-white/10 bg-black/35 px-2 py-2 ${className}`}
    >
      <p className="text-[8px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-[11px] font-medium capitalize text-zinc-200">{value}</p>
    </div>
  );
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

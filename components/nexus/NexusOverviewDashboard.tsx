"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { NexusEmptyState } from "@/components/nexus/NexusEmptyState";
import { NexusStatusBadge } from "@/components/nexus/NexusStatusBadge";
import { useNexusOverview } from "@/hooks/nexus/useNexusOverview";

function formatNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return value.toLocaleString();
}

function formatCurrency(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function OverviewCard({
  eyebrow,
  title,
  href,
  children,
}: {
  eyebrow: string;
  title: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-[#b4141e]/40 hover:bg-[#b4141e]/5"
    >
      <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">{eyebrow}</p>
      <h2 className="mt-2 text-lg font-semibold text-white group-hover:text-[#f1c3c7]">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </Link>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.02] p-5"
        >
          <div className="h-3 w-20 rounded-full bg-white/10" />
          <div className="mt-3 h-5 w-32 rounded-full bg-white/10" />
          <div className="mt-6 h-8 w-24 rounded-full bg-white/10" />
        </div>
      ))}
    </div>
  );
}

export function NexusOverviewDashboard() {
  const { data, errors, loading, refresh } = useNexusOverview();

  const systemStatus =
    ((data.health?.system as Record<string, unknown> | undefined)?.status as string | undefined) ??
    "unknown";
  const missionScore = data.missionHealth?.score;
  const missionStatus = (data.missionHealth?.status as string | undefined) ?? "unknown";
  const alertCounts = data.alerts?.counts as Record<string, number> | undefined;
  const incidentOpen = data.incidents?.open as Array<Record<string, unknown>> | undefined;
  const observationCounts = data.observations?.counts as Record<string, number> | undefined;
  const integrations =
    (data.health?.integrations as Array<Record<string, unknown>> | undefined) ?? [];
  const growth = data.metrics?.growth as Record<string, unknown> | undefined;
  const revenue = data.metrics?.revenue as Record<string, unknown> | undefined;

  const degradedIntegrations = integrations.filter((item) =>
    ["down", "degraded"].includes(String(item.status)),
  ).length;

  if (loading) {
    return <LoadingGrid />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Operational overview</p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-zinc-300 transition hover:border-[#b4141e]/50 hover:text-[#f1c3c7]"
        >
          Refresh
        </button>
      </div>

      {errors.length > 0 ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-200">
            Some intelligence feeds are unavailable. Partial data is shown below.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OverviewCard eyebrow="Infrastructure" title="System Status" href="/admin/nexus/system-health">
          <NexusStatusBadge label={systemStatus} />
          <p className="text-3xl font-semibold capitalize text-white">{systemStatus}</p>
          <p className="text-xs text-zinc-500">
            {integrations.length} integrations monitored
          </p>
        </OverviewCard>

        <OverviewCard eyebrow="Member Workflows" title="Mission Score" href="/admin/nexus/mission-health">
          <NexusStatusBadge label={missionStatus} />
          <p className="text-3xl font-semibold text-white">{formatNumber(missionScore)}</p>
          <p className="text-xs text-zinc-500">Mission health composite</p>
        </OverviewCard>

        <OverviewCard eyebrow="Triage" title="Active Alerts" href="/admin/nexus/alerts">
          <p className="text-3xl font-semibold text-white">{formatNumber(alertCounts?.active)}</p>
          <div className="flex flex-wrap gap-2">
            <NexusStatusBadge label={`${alertCounts?.critical ?? 0} critical`} tone="critical" />
            <NexusStatusBadge label={`${alertCounts?.warning ?? 0} warning`} tone="warning" />
          </div>
        </OverviewCard>

        <OverviewCard eyebrow="Operations" title="Open Incidents" href="/admin/nexus/incidents">
          <p className="text-3xl font-semibold text-white">{formatNumber(incidentOpen?.length)}</p>
          <p className="text-xs text-zinc-500">
            {(incidentOpen ?? []).filter((item) => item.severity === "critical").length} critical
            open
          </p>
        </OverviewCard>

        <OverviewCard eyebrow="Intelligence" title="Active Observations" href="/admin/nexus/observations">
          <p className="text-3xl font-semibold text-white">
            {formatNumber(observationCounts?.active)}
          </p>
          <div className="flex flex-wrap gap-2">
            <NexusStatusBadge label={`${observationCounts?.warning ?? 0} warning`} tone="warning" />
            <NexusStatusBadge label={`${observationCounts?.critical ?? 0} critical`} tone="critical" />
          </div>
        </OverviewCard>

        <OverviewCard eyebrow="Integrations" title="Platform Health" href="/admin/nexus/system-health">
          <p className="text-3xl font-semibold text-white">{formatNumber(integrations.length)}</p>
          <p className="text-xs text-zinc-500">
            {degradedIntegrations} integration{degradedIntegrations === 1 ? "" : "s"} need attention
          </p>
        </OverviewCard>

        <OverviewCard eyebrow="Community" title="Growth Metrics" href="/admin/nexus/metrics">
          <p className="text-3xl font-semibold text-white">
            {formatNumber(growth?.total_users)}
          </p>
          <p className="text-xs text-zinc-500">
            {formatNumber(growth?.new_users_this_week)} signups this week
          </p>
        </OverviewCard>

        <OverviewCard eyebrow="Business" title="Revenue Metrics" href="/admin/nexus/metrics">
          <p className="text-3xl font-semibold text-white">
            {formatCurrency(revenue?.estimated_mrr)}
          </p>
          <p className="text-xs text-zinc-500">
            {formatNumber(revenue?.active_subscriptions)} active subscriptions
          </p>
        </OverviewCard>
      </div>

      {!data.health &&
      !data.missionHealth &&
      !data.metrics &&
      !data.alerts &&
      !data.incidents &&
      !data.observations ? (
        <NexusEmptyState
          title="No Nexus intelligence available"
          description="Verify owner access and ensure Nexus collectors have run in production."
        />
      ) : null}
    </div>
  );
}

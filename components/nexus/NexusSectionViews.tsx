"use client";

import dynamic from "next/dynamic";
import { useMemo, type ComponentType } from "react";
import type { NexusHealthIntegrationSummary } from "@/lib/monitoring/health-summary";
import {
  formatDateTime,
  formatNumber,
  integrationDisplayName,
} from "@/lib/nexus/format";
import { NEXUS_INTEGRATION_SLUGS } from "@/lib/nexus/constants";
import { NexusEmptyState } from "@/components/nexus/NexusEmptyState";
import { NexusStatusBadge } from "@/components/nexus/NexusStatusBadge";
import {
  NexusLoadingPanel,
  NexusMetricCard,
  NexusSectionFrame,
} from "@/components/nexus/NexusShared";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import { NEXUS_LABELS } from "@/lib/nexus/terminology";

function lazyNexusCenter<T extends Record<string, ComponentType<unknown>>>(
  loader: () => Promise<T>,
  exportName: keyof T,
) {
  return dynamic(
    () => loader().then((mod) => ({ default: mod[exportName] as ComponentType<unknown> })),
    { loading: () => <NexusLoadingPanel rows={2} /> },
  );
}

const NexusAlertsCenter = lazyNexusCenter(
  () => import("@/components/nexus/NexusAlertsCenter"),
  "NexusAlertsCenter",
);
const NexusIncidentsCenter = lazyNexusCenter(
  () => import("@/components/nexus/NexusIncidentsCenter"),
  "NexusIncidentsCenter",
);
const NexusObservationsCenter = lazyNexusCenter(
  () => import("@/components/nexus/NexusObservationsCenter"),
  "NexusObservationsCenter",
);
const NexusCommandsCenter = lazyNexusCenter(
  () => import("@/components/nexus/NexusCommandsCenter"),
  "NexusCommandsCenter",
);
const NexusReportsCenter = lazyNexusCenter(
  () => import("@/components/nexus/NexusReportsCenter"),
  "NexusReportsCenter",
);
const NexusBriefingsCenter = lazyNexusCenter(
  () => import("@/components/nexus/NexusBriefingsCenter"),
  "NexusBriefingsCenter",
);
const NexusIntelligenceCenter = lazyNexusCenter(
  () => import("@/components/nexus/NexusIntelligenceCenter"),
  "NexusIntelligenceCenter",
);
const NexusMemoryCenter = lazyNexusCenter(
  () => import("@/components/nexus/NexusMemoryCenter"),
  "NexusMemoryCenter",
);
const NexusCorrelationsCenter = lazyNexusCenter(
  () => import("@/components/nexus/NexusCorrelationsCenter"),
  "NexusCorrelationsCenter",
);
const NexusPlanningCenter = lazyNexusCenter(
  () => import("@/components/nexus/NexusPlanningCenter"),
  "NexusPlanningCenter",
);
const NexusAutomationCenter = lazyNexusCenter(
  () => import("@/components/nexus/NexusAutomationCenter"),
  "NexusAutomationCenter",
);
const NexusOperatorCenter = lazyNexusCenter(
  () => import("@/components/nexus/NexusOperatorCenter"),
  "NexusOperatorCenter",
);
const NexusForecastingCenter = lazyNexusCenter(
  () => import("@/components/nexus/NexusForecastingCenter"),
  "NexusForecastingCenter",
);
const NexusCopilotCenter = lazyNexusCenter(
  () => import("@/components/nexus/NexusCopilotCenter"),
  "NexusCopilotCenter",
);
const NexusOperationalIntelligenceCenter = lazyNexusCenter(
  () => import("@/components/nexus/NexusOperationalIntelligenceCenter"),
  "NexusOperationalIntelligenceCenter",
);
const NexusRunbooksCenter = lazyNexusCenter(
  () => import("@/components/nexus/NexusRunbooksCenter"),
  "NexusRunbooksCenter",
);
const NexusWarRoomsCenter = lazyNexusCenter(
  () => import("@/components/nexus/NexusWarRoomsCenter"),
  "NexusWarRoomsCenter",
);

type HealthPayload = {
  system?: { status?: string; checked_at?: string | null };
  integrations?: NexusHealthIntegrationSummary[];
};

type MissionPayload = {
  score?: number;
  status?: string;
  mission_critical?: boolean;
  checked_at?: string | null;
  workflows?: Array<{
    slug: string;
    display_name: string;
    category: string;
    workflow_status: string;
    workflow_score: number | null;
    success_rate_1h: number | null;
    failure_count_1h: number | null;
    success_count_1h: number | null;
  }>;
};

type MetricsPayload = Record<string, Record<string, unknown> | undefined>;

function integrationRows(integrations: NexusHealthIntegrationSummary[]) {
  const bySlug = new Map(integrations.map((item) => [item.slug, item]));

  return NEXUS_INTEGRATION_SLUGS.map((slug) => {
    const row = bySlug.get(slug);
    return (
      row ?? {
        id: slug,
        slug,
        display_name: integrationDisplayName(slug),
        status: "unknown",
        last_check_at: null,
        last_healthy_at: null,
        latency_ms: null,
        error_message: null,
        metadata: {},
      }
    );
  });
}

export function NexusSystemHealthView() {
  const { data, error, loading, refresh } = useNexusFetch<HealthPayload>("/api/nexus/health");
  const integrations = useMemo(
    () => integrationRows(data?.integrations ?? []),
    [data?.integrations],
  );
  const system = data?.system;

  return (
    <NexusSectionFrame
      title={NEXUS_LABELS.infrastructure}
      description="Platform systems, integrations, uptime probes, and service latency."
      loading={loading}
      error={error}
      onRefresh={refresh}
    >
      <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <NexusStatusBadge label={system?.status ?? "unknown"} />
          <p className="text-3xl font-semibold capitalize text-white">
            {system?.status ?? "unknown"}
          </p>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Last system check {formatDateTime(system?.checked_at)}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {integrations.map((integration) => (
          <div
            key={integration.slug}
            className="rounded-2xl border border-white/10 bg-black/25 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-white">
                {integrationDisplayName(integration.slug)}
              </p>
              <NexusStatusBadge label={integration.status} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <MetricLine
                label="Latency"
                value={
                  integration.latency_ms != null ? `${integration.latency_ms}ms` : "—"
                }
              />
              <MetricLine label="Last check" value={formatDateTime(integration.last_check_at)} />
              <MetricLine
                label="Last healthy"
                value={formatDateTime(integration.last_healthy_at)}
              />
              <MetricLine label="Slug" value={integration.slug} />
            </div>
            {integration.error_message ? (
              <p className="mt-3 text-sm text-red-300">{integration.error_message}</p>
            ) : null}
          </div>
        ))}
      </div>
    </NexusSectionFrame>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-1 text-sm text-zinc-300">{value}</p>
    </div>
  );
}

export function NexusMissionHealthView() {
  const { data, error, loading, refresh } = useNexusFetch<MissionPayload>(
    "/api/nexus/mission-health",
  );
  const workflows = data?.workflows ?? [];

  return (
    <NexusSectionFrame
      title={NEXUS_LABELS.platformHealth}
      description="Signup, login, posting, meets, messaging, and Blackcard purchase reliability. Quiet activity is tracked as opportunity, not failure."
      loading={loading}
      error={error}
      onRefresh={refresh}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <NexusMetricCard
          label={NEXUS_LABELS.workflowHealthScore}
          value={formatNumber(data?.score)}
        />
        <NexusMetricCard
          label={NEXUS_LABELS.workflowStatus}
          value={<NexusStatusBadge label={data?.status ?? "unknown"} />}
        />
        <NexusMetricCard
          label="Critical Platform Workflows"
          value={data?.mission_critical ? "Yes" : "No"}
          hint={`Checked ${formatDateTime(data?.checked_at)}`}
        />
      </div>

      {workflows.length === 0 ? (
        <NexusEmptyState title="No user workflow data" />
      ) : (
        <div className="grid gap-3">
          {workflows.map((workflow) => (
            <div
              key={workflow.slug}
              className="rounded-2xl border border-white/10 bg-black/25 p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-white">{workflow.display_name}</p>
                  <p className="text-xs text-zinc-500">
                    {workflow.slug} · {workflow.category}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <NexusStatusBadge label={workflow.workflow_status} />
                  <span className="text-xs text-zinc-400">
                    Platform score {workflow.workflow_score ?? "—"}
                  </span>
                  <span className="text-xs text-zinc-500">
                    1h success {workflow.success_rate_1h ?? "—"}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </NexusSectionFrame>
  );
}

export function NexusMetricsView() {
  const { data, error, loading, refresh } = useNexusFetch<MetricsPayload>("/api/nexus/metrics");

  const sections = [
    { key: "revenue", label: "Revenue" },
    { key: "growth", label: "Growth" },
    { key: "blackcard", label: "Blackcard" },
    { key: "activity", label: "Activity" },
  ] as const;

  return (
    <NexusSectionFrame
      title="Metrics"
      description="Revenue, growth, Blackcard membership, and platform activity snapshots."
      loading={loading}
      error={error}
      onRefresh={refresh}
    >
      {!data ? (
        <NexusEmptyState title="No metrics available" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {sections.map((section) => {
            const metrics = data[section.key];
            const entries = metrics
              ? Object.entries(metrics).filter(
                  ([key, value]) => key !== "warnings" && typeof value !== "object",
                )
              : [];

            return (
              <div
                key={section.key}
                className="rounded-2xl border border-white/10 bg-black/25 p-5"
              >
                <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">
                  {section.label}
                </p>
                {entries.length === 0 ? (
                  <NexusEmptyState title={`No ${section.label.toLowerCase()} metrics`} />
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {entries.map(([key, value]) => (
                      <div key={key} className="rounded-xl border border-white/10 bg-black/30 p-3">
                        <p className="text-lg font-semibold text-white">
                          {typeof value === "number" ? value.toLocaleString() : String(value)}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                          {key.replaceAll("_", " ")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </NexusSectionFrame>
  );
}

export function NexusAlertsView() {
  return <NexusAlertsCenter />;
}

export function NexusIncidentsView() {
  return <NexusIncidentsCenter />;
}

export function NexusObservationsView() {
  return <NexusObservationsCenter />;
}

export function NexusWarRoomsView() {
  return <NexusWarRoomsCenter />;
}

export function NexusRunbooksView() {
  return <NexusRunbooksCenter />;
}

export function NexusCommandsView() {
  return <NexusCommandsCenter />;
}

export function NexusReportsView() {
  return <NexusReportsCenter />;
}

export function NexusBriefingsView() {
  return <NexusBriefingsCenter />;
}

export function NexusIntelligenceView() {
  return <NexusIntelligenceCenter />;
}

export function NexusMemoryView() {
  return <NexusMemoryCenter />;
}

export function NexusCorrelationsView() {
  return <NexusCorrelationsCenter />;
}

export function NexusPlanningView() {
  return <NexusPlanningCenter />;
}

export function NexusAutomationView() {
  return <NexusAutomationCenter />;
}

export function NexusOperatorView() {
  return <NexusOperatorCenter />;
}

export function NexusForecastingView() {
  return <NexusForecastingCenter />;
}

export function NexusCopilotView() {
  return <NexusCopilotCenter />;
}

export function NexusOperationalIntelligenceView() {
  return <NexusOperationalIntelligenceCenter />;
}

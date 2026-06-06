"use client";

import type { ReactNode } from "react";
import { NexusEmptyState } from "@/components/nexus/NexusEmptyState";
import { NexusStatusBadge } from "@/components/nexus/NexusStatusBadge";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";

function SectionFrame({
  title,
  description,
  loading,
  error,
  onRefresh,
  children,
}: {
  title: string;
  description: string;
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => void onRefresh()}
          className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-zinc-300 transition hover:border-[#b4141e]/50 hover:text-[#f1c3c7]"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="h-4 w-40 rounded-full bg-white/10" />
          <div className="mt-4 h-20 rounded-2xl bg-white/10" />
        </div>
      ) : (
        children
      )}
    </section>
  );
}

export function NexusSystemHealthView() {
  const { data, error, loading, refresh } = useNexusFetch<Record<string, unknown>>(
    "/api/nexus/health",
  );
  const integrations = (data?.integrations as Array<Record<string, unknown>> | undefined) ?? [];
  const system = data?.system as Record<string, unknown> | undefined;

  return (
    <SectionFrame
      title="System Health"
      description="Integration probes, infrastructure status, and latest health checks."
      loading={loading}
      error={error}
      onRefresh={refresh}
    >
      {integrations.length === 0 ? (
        <NexusEmptyState title="No integration health data" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {integrations.map((integration) => (
            <div
              key={String(integration.id)}
              className="rounded-2xl border border-white/10 bg-black/25 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-white">{String(integration.display_name)}</p>
                <NexusStatusBadge label={String(integration.status)} />
              </div>
              <p className="mt-2 text-xs text-zinc-500">{String(integration.slug)}</p>
              {integration.error_message ? (
                <p className="mt-3 text-sm text-red-300">{String(integration.error_message)}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
      {system?.checked_at ? (
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
          Last checked {String(system.checked_at)}
        </p>
      ) : null}
    </SectionFrame>
  );
}

export function NexusMissionHealthView() {
  const { data, error, loading, refresh } = useNexusFetch<Record<string, unknown>>(
    "/api/nexus/mission-health",
  );
  const workflows = (data?.workflows as Array<Record<string, unknown>> | undefined) ?? [];

  return (
    <SectionFrame
      title="Mission Health"
      description="Member workflow reliability, success rates, and mission-critical status."
      loading={loading}
      error={error}
      onRefresh={refresh}
    >
      <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <NexusStatusBadge label={String(data?.status ?? "unknown")} />
          <p className="text-3xl font-semibold text-white">{String(data?.score ?? "—")}</p>
          <p className="text-sm text-zinc-500">Mission score</p>
        </div>
      </div>

      {workflows.length === 0 ? (
        <NexusEmptyState title="No mission workflow data" />
      ) : (
        <div className="grid gap-3">
          {workflows.map((workflow) => (
            <div
              key={String(workflow.slug)}
              className="rounded-2xl border border-white/10 bg-black/25 p-4"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-white">{String(workflow.display_name)}</p>
                  <p className="text-xs text-zinc-500">{String(workflow.slug)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <NexusStatusBadge label={String(workflow.workflow_status)} />
                  <span className="text-xs text-zinc-400">
                    Score {String(workflow.workflow_score ?? "—")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionFrame>
  );
}

export function NexusMetricsView() {
  const { data, error, loading, refresh } = useNexusFetch<Record<string, unknown>>(
    "/api/nexus/metrics",
  );

  const sections = [
    { key: "revenue", label: "Revenue" },
    { key: "growth", label: "Growth" },
    { key: "blackcard", label: "Blackcard" },
    { key: "activity", label: "Activity" },
  ] as const;

  return (
    <SectionFrame
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
            const metrics = data[section.key] as Record<string, unknown> | undefined;
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
    </SectionFrame>
  );
}

export function NexusAlertsView() {
  const { data, error, loading, refresh } = useNexusFetch<Record<string, unknown>>(
    "/api/nexus/alerts",
  );
  const active = (data?.active as Array<Record<string, unknown>> | undefined) ?? [];

  return (
    <SectionFrame
      title="Alerts"
      description="Active owner triage alerts ranked by impact and severity."
      loading={loading}
      error={error}
      onRefresh={refresh}
    >
      {active.length === 0 ? (
        <NexusEmptyState title="No active alerts" description="The alert queue is clear." />
      ) : (
        <div className="space-y-3">
          {active.map((alert) => (
            <div
              key={String(alert.id)}
              className="rounded-2xl border border-white/10 bg-black/25 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <NexusStatusBadge label={String(alert.severity)} />
                <NexusStatusBadge label={String(alert.status)} tone="neutral" />
                <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  {String(alert.category)}
                </span>
              </div>
              <p className="mt-3 font-medium text-white">{String(alert.title)}</p>
              <p className="mt-2 text-sm text-zinc-400">{String(alert.message)}</p>
            </div>
          ))}
        </div>
      )}
    </SectionFrame>
  );
}

export function NexusIncidentsView() {
  const { data, error, loading, refresh } = useNexusFetch<Record<string, unknown>>(
    "/api/nexus/incidents",
  );
  const open = (data?.open as Array<Record<string, unknown>> | undefined) ?? [];

  return (
    <SectionFrame
      title="Incidents"
      description="Open operational incidents and linked alert context."
      loading={loading}
      error={error}
      onRefresh={refresh}
    >
      {open.length === 0 ? (
        <NexusEmptyState title="No open incidents" description="Operations are stable." />
      ) : (
        <div className="space-y-3">
          {open.map((incident) => (
            <div
              key={String(incident.id)}
              className="rounded-2xl border border-white/10 bg-black/25 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <NexusStatusBadge label={String(incident.severity)} />
                <NexusStatusBadge label={String(incident.status)} />
              </div>
              <p className="mt-3 font-medium text-white">{String(incident.title)}</p>
              <p className="mt-2 text-sm text-zinc-400">
                Impact score {String(incident.impact_score ?? "—")} ·{" "}
                {String(incident.linked_alert_count ?? 0)} linked alerts
              </p>
            </div>
          ))}
        </div>
      )}
    </SectionFrame>
  );
}

export function NexusObservationsView() {
  const { data, error, loading, refresh } = useNexusFetch<Record<string, unknown>>(
    "/api/nexus/observations?view=active",
  );
  const active = (data?.active as Array<Record<string, unknown>> | undefined) ?? [];

  return (
    <SectionFrame
      title="Observations"
      description="Rule-engine interpretations of platform signals with confidence scoring."
      loading={loading}
      error={error}
      onRefresh={refresh}
    >
      {active.length === 0 ? (
        <NexusEmptyState
          title="No active observations"
          description="No significant patterns detected right now."
        />
      ) : (
        <div className="space-y-3">
          {active.map((observation) => (
            <div
              key={String(observation.id)}
              className="rounded-2xl border border-white/10 bg-black/25 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <NexusStatusBadge label={String(observation.severity)} />
                <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  {String(observation.observation_type)} · {String(observation.category)}
                </span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  {Math.round(Number(observation.confidence ?? 0) * 100)}% confidence
                </span>
              </div>
              <p className="mt-3 font-medium text-white">{String(observation.title)}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{String(observation.summary)}</p>
            </div>
          ))}
        </div>
      )}
    </SectionFrame>
  );
}

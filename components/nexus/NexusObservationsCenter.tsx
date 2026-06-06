"use client";

import { useMemo, useState } from "react";
import type {
  NexusObservationDetail,
  NexusObservationSummaryRow,
  NexusObservationsSummary,
} from "@/lib/observations/types";
import {
  evidenceCount,
  formatDateTime,
  formatRelativeTime,
} from "@/lib/nexus/format";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import { useNexusMutation } from "@/hooks/nexus/useNexusMutation";
import {
  NexusActionButton,
  NexusConfidenceIndicator,
  NexusListEmpty,
  NexusPanel,
  NexusPriorityBadge,
  NexusSectionFrame,
} from "@/components/nexus/NexusShared";
import { NexusStatusBadge } from "@/components/nexus/NexusStatusBadge";
import { NexusRecommendedCommands } from "@/components/nexus/commands/NexusRecommendedCommands";
import { NexusRecommendedRunbooks } from "@/components/nexus/runbooks/NexusRecommendedRunbooks";
import { NEXUS_LABELS, formatNexusDisplayText } from "@/lib/nexus/terminology";

export function NexusObservationsCenter() {
  const { data, error, loading, refresh } = useNexusFetch<NexusObservationsSummary>(
    "/api/nexus/observations?view=active",
  );
  const { mutate, isPending } = useNexusMutation();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const observations = useMemo(() => {
    const rows = data?.active ?? [];
    return [...rows].sort(
      (a, b) =>
        b.priority_score - a.priority_score ||
        b.occurred_at.localeCompare(a.occurred_at),
    );
  }, [data?.active]);

  async function runStatusAction(
    observationId: string,
    status: "confirmed" | "dismissed",
  ) {
    const result = await mutate(
      `/api/nexus/observations/${observationId}`,
      { status },
      `observation-${observationId}-${status}`,
    );

    if (result.ok) {
      if (selectedId === observationId) {
        setSelectedId(null);
      }
      await refresh();
    }
  }

  return (
    <NexusSectionFrame
      title={NEXUS_LABELS.insightsCenter}
      description="Conclusions, patterns, and intelligence generated from platform data."
      loading={loading}
      error={error}
      onRefresh={refresh}
    >
      {!loading ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Active", value: data?.counts.active ?? 0 },
              { label: "Critical", value: data?.counts.critical ?? 0 },
              { label: "Warning", value: data?.counts.warning ?? 0 },
              { label: "Info", value: data?.counts.info ?? 0 },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-black/30 p-4"
              >
                <p className="text-2xl font-semibold text-white">{item.value}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  {item.label}
                </p>
              </div>
            ))}
          </div>

          {observations.length === 0 ? (
            <NexusListEmpty
              title="No active insights"
              description="No significant patterns detected right now."
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
              <div className="space-y-3">
                {observations.map((observation) => (
                  <ObservationRow
                    key={observation.id}
                    observation={observation}
                    selected={selectedId === observation.id}
                    isPending={isPending}
                    onSelect={() =>
                      setSelectedId((current) =>
                        current === observation.id ? null : observation.id,
                      )
                    }
                    onConfirm={() => void runStatusAction(observation.id, "confirmed")}
                    onDismiss={() => void runStatusAction(observation.id, "dismissed")}
                  />
                ))}
              </div>

              <div className="xl:sticky xl:top-6 xl:self-start">
                {selectedId ? (
                  <ObservationDetailPanel
                    observationId={selectedId}
                    onClose={() => setSelectedId(null)}
                  />
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-5 py-10 text-center">
                    <p className="text-sm text-zinc-400">
                      Select an insight to view evidence and linked signals.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : null}
    </NexusSectionFrame>
  );
}

function ObservationRow({
  observation,
  selected,
  isPending,
  onSelect,
  onConfirm,
  onDismiss,
}: {
  observation: NexusObservationSummaryRow;
  selected: boolean;
  isPending: (key: string) => boolean;
  onSelect: () => void;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const evidenceTotal = evidenceCount(
    observation.evidence,
    observation.linked_alerts_count + observation.linked_metrics_count,
  );
  const confirmKey = `observation-${observation.id}-confirmed`;
  const dismissKey = `observation-${observation.id}-dismissed`;

  return (
    <NexusPanel>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <NexusStatusBadge label={observation.severity} />
              <NexusPriorityBadge tier={observation.priority_tier} />
              <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Score {observation.priority_score}
              </span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                {evidenceTotal} evidence
              </span>
            </div>
            <p className="mt-3 text-lg font-medium text-white">
              {formatNexusDisplayText(observation.title)}
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {formatNexusDisplayText(observation.summary)}
            </p>
            <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-zinc-600">
              {observation.observation_type} · {observation.category} ·{" "}
              {formatRelativeTime(observation.occurred_at)}
            </p>
          </div>

          <NexusConfidenceIndicator value={observation.confidence} />
        </div>

        <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
          <NexusActionButton
            label="View Details"
            variant={selected ? "primary" : "default"}
            onClick={onSelect}
          />
          <NexusActionButton
            label={isPending(confirmKey) ? "Saving" : "Confirm"}
            disabled={isPending(confirmKey)}
            variant="primary"
            onClick={onConfirm}
          />
          <NexusActionButton
            label={isPending(dismissKey) ? "Saving" : "Dismiss"}
            disabled={isPending(dismissKey)}
            variant="danger"
            onClick={onDismiss}
          />
        </div>
      </div>
    </NexusPanel>
  );
}

function ObservationDetailPanel({
  observationId,
  onClose,
}: {
  observationId: string;
  onClose: () => void;
}) {
  const { data, error, loading } = useNexusFetch<{ observation: NexusObservationDetail }>(
    `/api/nexus/observations/${observationId}`,
  );

  const observation = data?.observation;

  return (
    <div className="rounded-2xl border border-[#b4141e]/30 bg-black/40 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-serif text-xl text-white">Insight Details</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 transition hover:text-zinc-300"
        >
          Close
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading details…</p>
      ) : error ? (
        <p className="text-sm text-red-300">{error}</p>
      ) : !observation ? (
        <p className="text-sm text-zinc-500">Insight not found.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <NexusStatusBadge label={observation.severity} />
            <NexusPriorityBadge tier={observation.priority_tier} />
            <NexusStatusBadge label={observation.status} tone="neutral" />
          </div>

          <div>
            <p className="text-lg font-medium text-white">
              {formatNexusDisplayText(observation.title)}
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {formatNexusDisplayText(observation.summary)}
            </p>
          </div>

          <NexusConfidenceIndicator value={observation.confidence} />

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailStat label="Priority score" value={String(observation.priority_score)} />
            <DetailStat
              label="Occurred"
              value={formatDateTime(observation.occurred_at)}
            />
            <DetailStat
              label="Linked alerts"
              value={String(observation.linked_alerts_count)}
            />
            <DetailStat
              label="Linked metrics"
              value={String(observation.linked_metrics_count)}
            />
          </div>

          {observation.evidence_links ? (
            <div className="space-y-3">
              <EvidenceGroup
                title="Events"
                items={observation.evidence_links.events.map(
                  (item) => `${item.event_type} (${item.relevance})`,
                )}
              />
              <EvidenceGroup
                title="Alerts"
                items={observation.evidence_links.alerts.map(
                  (item) => `${formatNexusDisplayText(item.title)} · ${item.severity}`,
                )}
              />
              <EvidenceGroup
                title="Metrics"
                items={observation.evidence_links.metrics.map(
                  (item) => `${item.metric_key} (${item.role})`,
                )}
              />
            </div>
          ) : null}

          {Object.keys(observation.evidence ?? {}).length > 0 ? (
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Evidence payload
              </p>
              <pre className="mt-2 max-h-48 overflow-auto rounded-xl border border-white/10 bg-black/50 p-3 text-xs text-zinc-400">
                {JSON.stringify(observation.evidence, null, 2)}
              </pre>
            </div>
          ) : null}

          <NexusRecommendedCommands filters={{ observation_id: observation.id }} />
          <NexusRecommendedRunbooks
            context={{
              source: "observation",
              category: observation.category,
              severity: observation.severity,
              rule_id: observation.rule_id,
              title: observation.title,
            }}
          />
        </div>
      )}
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function EvidenceGroup({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-300"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

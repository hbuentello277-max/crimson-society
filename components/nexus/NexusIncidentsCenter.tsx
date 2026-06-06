"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { NexusIncidentSummaryRow, NexusIncidentsSummary } from "@/lib/incidents/types";
import type { NexusIncidentStatus } from "@/lib/nexus/constants";
import type { NexusWarRoomsSummary } from "@/lib/war-room/types";
import { shouldSuggestWarRoomForIncident } from "@/lib/war-room/suggestion";
import { formatDateTime, formatRelativeTime } from "@/lib/nexus/format";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import { useNexusMutation } from "@/hooks/nexus/useNexusMutation";
import { useNexusPost } from "@/hooks/nexus/useNexusPost";
import {
  NexusActionButton,
  NexusListEmpty,
  NexusPanel,
  NexusSectionFrame,
  NexusTabFilter,
} from "@/components/nexus/NexusShared";
import { NexusStatusBadge } from "@/components/nexus/NexusStatusBadge";
import { NexusRecommendedRunbooks } from "@/components/nexus/runbooks/NexusRecommendedRunbooks";
import { NEXUS_LABELS, formatNexusDisplayText } from "@/lib/nexus/terminology";

type IncidentTab = "open" | "investigating" | "mitigated" | "resolved";

const NEXT_STATUS: Partial<Record<NexusIncidentStatus, NexusIncidentStatus>> = {
  open: "investigating",
  investigating: "mitigated",
  mitigated: "resolved",
};

export function NexusIncidentsCenter() {
  const router = useRouter();
  const { data, error, loading, refresh } = useNexusFetch<NexusIncidentsSummary>(
    "/api/nexus/incidents",
  );
  const {
    data: warRoomsData,
    loading: warRoomsLoading,
    refresh: refreshWarRooms,
  } = useNexusFetch<NexusWarRoomsSummary>("/api/nexus/war-rooms");
  const { mutate, isPending } = useNexusMutation();
  const { post, isPending: isPostPending } = useNexusPost();
  const [tab, setTab] = useState<IncidentTab>("open");

  const warRoomByIncident = useMemo(() => {
    const map = new Map<string, string>();
    for (const room of [...(warRoomsData?.open ?? []), ...(warRoomsData?.recent_history ?? [])]) {
      map.set(room.incident_id, room.id);
    }
    return map;
  }, [warRoomsData]);

  const open = data?.open ?? [];
  const history = data?.recent_history ?? [];

  const filtered = useMemo(() => {
    if (tab === "resolved") {
      return history;
    }

    return open.filter((incident) => incident.status === tab);
  }, [history, open, tab]);

  async function updateStatus(incidentId: string, status: NexusIncidentStatus) {
    const result = await mutate(
      `/api/nexus/incidents/${incidentId}`,
      { status },
      `incident-${incidentId}-${status}`,
    );

    if (result.ok) {
      await refresh();
    }
  }

  async function createWarRoom(incident: NexusIncidentSummaryRow) {
    const result = await post<{ war_room?: { id: string } }>(
      "/api/nexus/war-rooms",
      { incident_id: incident.id },
      `war-room-create-${incident.id}`,
    );

    if (result.ok && result.data?.war_room?.id) {
      await Promise.all([refresh(), refreshWarRooms()]);
      router.push(`/admin/nexus/war-rooms/${result.data.war_room.id}`);
    }
  }

  const tabs = [
    { id: "open" as const, label: "Open", count: data?.counts.open ?? 0 },
    {
      id: "investigating" as const,
      label: "Investigating",
      count: data?.counts.investigating ?? 0,
    },
    { id: "mitigated" as const, label: "Mitigated", count: data?.counts.mitigated ?? 0 },
    {
      id: "resolved" as const,
      label: "Resolved",
      count: (data?.counts.resolved ?? 0) + (data?.counts.postmortem ?? 0),
    },
  ];

  return (
    <NexusSectionFrame
      title={NEXUS_LABELS.incidentsCenter}
      description="Operational incident triage with impact scoring, root-cause context, and linked alert visibility."
      loading={loading || warRoomsLoading}
      error={error}
      onRefresh={async () => {
        await Promise.all([refresh(), refreshWarRooms()]);
      }}
    >
      {!loading && !warRoomsLoading ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {tabs.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-white/10 bg-black/30 p-4"
              >
                <p className="text-2xl font-semibold text-white">{item.count}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  {item.label}
                </p>
              </div>
            ))}
          </div>

          <NexusTabFilter tabs={tabs} value={tab} onChange={setTab} />

          {filtered.length === 0 ? (
            <NexusListEmpty
              title={`No ${tab} incidents`}
              description="No incidents match this triage state."
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  warRoomId={warRoomByIncident.get(incident.id)}
                  suggestWarRoom={shouldSuggestWarRoomForIncident(incident)}
                  isPending={isPending}
                  isPostPending={isPostPending}
                  onAdvance={(status) => void updateStatus(incident.id, status)}
                  onCreateWarRoom={() => void createWarRoom(incident)}
                  showActions={tab !== "resolved"}
                />
              ))}
            </div>
          )}
        </>
      ) : null}
    </NexusSectionFrame>
  );
}

function IncidentCard({
  incident,
  warRoomId,
  suggestWarRoom,
  isPending,
  isPostPending,
  onAdvance,
  onCreateWarRoom,
  showActions,
}: {
  incident: NexusIncidentSummaryRow;
  warRoomId?: string;
  suggestWarRoom: boolean;
  isPending: (key: string) => boolean;
  isPostPending: (key: string) => boolean;
  onAdvance: (status: NexusIncidentStatus) => void;
  onCreateWarRoom: () => void;
  showActions: boolean;
}) {
  const nextStatus = NEXT_STATUS[incident.status];
  const actionKey = `incident-${incident.id}-${nextStatus ?? "none"}`;
  const createKey = `war-room-create-${incident.id}`;

  return (
    <div className="space-y-3">
    <NexusPanel>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <NexusStatusBadge label={incident.severity} />
            <NexusStatusBadge label={incident.status} />
            {suggestWarRoom && !warRoomId ? (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-amber-200">
                War room suggested
              </span>
            ) : null}
            <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Impact {incident.impact_score}
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              {incident.linked_alert_count} linked alerts
            </span>
          </div>
          <p className="mt-3 text-lg font-medium text-white">
            {formatNexusDisplayText(incident.title)}
          </p>
          {incident.impact_summary ? (
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {formatNexusDisplayText(incident.impact_summary)}
            </p>
          ) : null}
          {incident.root_cause ? (
            <p className="mt-3 text-sm text-zinc-300">
              <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Root cause ·{" "}
              </span>
              {formatNexusDisplayText(incident.root_cause)}
            </p>
          ) : null}
          <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            Started {formatRelativeTime(incident.started_at)} · Updated{" "}
            {formatDateTime(incident.updated_at)}
            {incident.resolved_at
              ? ` · Resolved ${formatRelativeTime(incident.resolved_at)}`
              : ""}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {warRoomId ? (
            <Link
              href={`/admin/nexus/war-rooms/${warRoomId}`}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#b4141e]/50 bg-[#b4141e]/15 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-[#f1c3c7] transition hover:bg-[#b4141e]/25"
            >
              Enter War Room
            </Link>
          ) : showActions ? (
            <NexusActionButton
              label={isPostPending(createKey) ? "Opening" : "Open War Room"}
              disabled={isPostPending(createKey)}
              variant="primary"
              onClick={onCreateWarRoom}
            />
          ) : null}

          {showActions && nextStatus ? (
            <NexusActionButton
              label={isPending(actionKey) ? "Saving" : `Mark ${nextStatus}`}
              disabled={isPending(actionKey)}
              onClick={() => onAdvance(nextStatus)}
            />
          ) : null}
        </div>
      </div>
    </NexusPanel>
    {showActions ? (
      <NexusRecommendedRunbooks
        context={{
          source: "incident",
          category: incident.severity === "critical" ? "infra" : "mission",
          severity: incident.severity,
          title: incident.title,
        }}
      />
    ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { NexusWarRoomSummaryRow, NexusWarRoomsSummary } from "@/lib/war-room/types";
import type { NexusWarRoomStatus } from "@/lib/nexus/constants";
import { formatDateTime, formatRelativeTime } from "@/lib/nexus/format";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import {
  NexusListEmpty,
  NexusPanel,
  NexusSectionFrame,
  NexusTabFilter,
} from "@/components/nexus/NexusShared";
import { NexusStatusBadge } from "@/components/nexus/NexusStatusBadge";
import { formatNexusDisplayText } from "@/lib/nexus/terminology";

type WarRoomTab = "open" | "active" | "resolved" | "archived";

export function NexusWarRoomsCenter() {
  const { data, error, loading, refresh } = useNexusFetch<NexusWarRoomsSummary>(
    "/api/nexus/war-rooms",
  );
  const [tab, setTab] = useState<WarRoomTab>("open");

  const open = data?.open ?? [];
  const history = data?.recent_history ?? [];

  const filtered = useMemo(() => {
    if (tab === "resolved" || tab === "archived") {
      return history.filter((room) => room.status === tab);
    }

    return open.filter((room) => room.status === tab);
  }, [history, open, tab]);

  const tabs = [
    { id: "open" as const, label: "Open", count: data?.counts.open ?? 0 },
    { id: "active" as const, label: "Active", count: data?.counts.active ?? 0 },
    {
      id: "resolved" as const,
      label: "Resolved",
      count: data?.counts.resolved ?? 0,
    },
    {
      id: "archived" as const,
      label: "Archived",
      count: data?.counts.archived ?? 0,
    },
  ];

  return (
    <NexusSectionFrame
      title="War Rooms"
      description="Focused incident command spaces for serious operational events. Owner-only."
      loading={loading}
      error={error}
      onRefresh={refresh}
    >
      {!loading ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              title={`No ${tab} war rooms`}
              description="Open a war room from a serious incident when command coordination is needed."
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((room) => (
                <WarRoomCard key={room.id} room={room} />
              ))}
            </div>
          )}
        </>
      ) : null}
    </NexusSectionFrame>
  );
}

function WarRoomCard({ room }: { room: NexusWarRoomSummaryRow }) {
  return (
    <NexusPanel>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <NexusStatusBadge label={room.severity} />
            <NexusStatusBadge label={room.status} />
            {room.incident_status ? (
              <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Incident {room.incident_status}
              </span>
            ) : null}
            <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              {room.linked_alert_count} alerts · {room.linked_observation_count} insights
            </span>
          </div>
          <p className="mt-3 text-lg font-medium text-white">
            {formatNexusDisplayText(room.title)}
          </p>
          {room.incident_title ? (
            <p className="mt-2 text-sm text-zinc-400">
              Linked incident: {formatNexusDisplayText(room.incident_title)}
            </p>
          ) : null}
          {room.impact_summary ? (
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {formatNexusDisplayText(room.impact_summary)}
            </p>
          ) : null}
          <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            Activated {formatRelativeTime(room.activated_at)} · Updated{" "}
            {formatDateTime(room.updated_at)}
            {room.resolved_at ? ` · Resolved ${formatRelativeTime(room.resolved_at)}` : ""}
          </p>
        </div>

        <Link
          href={`/admin/nexus/war-rooms/${room.id}`}
          className="inline-flex min-h-10 items-center rounded-full border border-[#b4141e]/50 bg-[#b4141e]/15 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-[#f1c3c7] transition hover:bg-[#b4141e]/25"
        >
          Enter War Room
        </Link>
      </div>
    </NexusPanel>
  );
}

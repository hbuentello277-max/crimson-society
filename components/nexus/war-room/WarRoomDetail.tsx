"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { NexusWarRoomDetail } from "@/lib/war-room/types";
import type { NexusWarRoomStatus } from "@/lib/nexus/constants";
import { formatDateTime, formatRelativeTime } from "@/lib/nexus/format";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import { useNexusMutation } from "@/hooks/nexus/useNexusMutation";
import {
  NexusActionButton,
  NexusListEmpty,
  NexusPanel,
  NexusSectionFrame,
} from "@/components/nexus/NexusShared";
import { NexusStatusBadge } from "@/components/nexus/NexusStatusBadge";
import { NexusRecommendedRunbooks } from "@/components/nexus/runbooks/NexusRecommendedRunbooks";
import { formatNexusDisplayText } from "@/lib/nexus/terminology";

const STATUS_ACTIONS: Partial<Record<NexusWarRoomStatus, NexusWarRoomStatus>> = {
  open: "active",
  active: "resolved",
  resolved: "archived",
};

export function WarRoomDetail({ warRoomId }: { warRoomId: string }) {
  const { data, error, loading, refresh } = useNexusFetch<NexusWarRoomDetail>(
    `/api/nexus/war-rooms/${warRoomId}`,
  );
  const { mutate, isPending } = useNexusMutation();
  const [notesDraft, setNotesDraft] = useState("");
  const [resolutionDraft, setResolutionDraft] = useState("");

  const warRoom = data?.war_room;
  const nextStatus = warRoom ? STATUS_ACTIONS[warRoom.status] : undefined;

  useEffect(() => {
    if (warRoom) {
      setNotesDraft(warRoom.owner_notes ?? "");
      setResolutionDraft(warRoom.resolution_summary ?? "");
    }
  }, [warRoom?.id, warRoom?.owner_notes, warRoom?.resolution_summary]);

  async function saveField(body: Record<string, unknown>, key: string) {
    const result = await mutate(`/api/nexus/war-rooms/${warRoomId}`, body, key);
    if (result.ok) {
      await refresh();
    }
  }

  async function advanceStatus(status: NexusWarRoomStatus) {
    await saveField({ status }, `war-room-${warRoomId}-${status}`);
  }

  return (
    <NexusSectionFrame
      title={warRoom ? formatNexusDisplayText(warRoom.title) : "War Room"}
      description="Incident command workspace with linked signals, snapshots, and owner controls."
      loading={loading}
      error={error}
      onRefresh={refresh}
      action={
        warRoom ? (
          <div className="flex flex-wrap items-center gap-2">
            <NexusStatusBadge label={warRoom.severity} />
            <NexusStatusBadge label={warRoom.status} />
            {nextStatus ? (
              <NexusActionButton
                label={isPending(`war-room-${warRoomId}-${nextStatus}`) ? "Saving" : `Mark ${nextStatus}`}
                disabled={isPending(`war-room-${warRoomId}-${nextStatus}`)}
                variant="primary"
                onClick={() => void advanceStatus(nextStatus)}
              />
            ) : null}
          </div>
        ) : null
      }
    >
      {!loading && data ? (
        <div className="space-y-4">
          <NexusRecommendedRunbooks
            context={{
              source: "war_room",
              category: "infra",
              severity: data.war_room.severity,
              title: data.war_room.title,
            }}
          />

          <NexusPanel title="Incident Summary">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <NexusStatusBadge label={data.incident.severity} />
                <NexusStatusBadge label={data.incident.status} />
                <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Started {formatRelativeTime(data.incident.started_at)}
                </span>
              </div>
              <p className="text-lg font-medium text-white">
                {formatNexusDisplayText(data.incident.title)}
              </p>
              {data.incident.impact_summary ? (
                <p className="text-sm leading-6 text-zinc-400">
                  {formatNexusDisplayText(data.incident.impact_summary)}
                </p>
              ) : null}
              {data.war_room.root_cause || data.incident.root_cause ? (
                <p className="text-sm text-zinc-300">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                    Root cause ·{" "}
                  </span>
                  {formatNexusDisplayText(data.war_room.root_cause ?? data.incident.root_cause ?? "")}
                </p>
              ) : null}
              <Link
                href={`/admin/nexus/incidents`}
                className="inline-flex text-[10px] uppercase tracking-[0.16em] text-[#e87a82] hover:text-[#f1c3c7]"
              >
                View incidents center →
              </Link>
            </div>
          </NexusPanel>

          <div className="grid gap-4 xl:grid-cols-2">
            <NexusPanel title="Linked Alerts">
              {data.linked_alerts.length === 0 ? (
                <NexusListEmpty title="No linked alerts" />
              ) : (
                <div className="space-y-2">
                  {data.linked_alerts.map((alert) => (
                    <div key={alert.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <NexusStatusBadge label={alert.severity} variant="subtle" />
                        <NexusStatusBadge label={alert.status} variant="subtle" />
                      </div>
                      <p className="mt-2 text-sm text-white">{formatNexusDisplayText(alert.title)}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                        {alert.category} · {formatRelativeTime(alert.updated_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </NexusPanel>

            <NexusPanel title="Linked Insights">
              {data.linked_observations.length === 0 ? (
                <NexusListEmpty title="No linked insights" />
              ) : (
                <div className="space-y-2">
                  {data.linked_observations.map((observation) => (
                    <div
                      key={observation.id}
                      className="rounded-xl border border-white/10 bg-black/30 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <NexusStatusBadge label={observation.severity} variant="subtle" />
                        <span className="text-[10px] text-zinc-500">
                          {Math.round(observation.confidence * 100)}% confidence
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-white">
                        {formatNexusDisplayText(observation.title)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {formatNexusDisplayText(observation.summary)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </NexusPanel>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <SnapshotPanel
              title="Infrastructure at Incident Open"
              snapshot={data.infrastructure_snapshot}
            />
            <SnapshotPanel title="Current Infrastructure" snapshot={data.current_infrastructure} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <WorkflowPanel title="Workflows at Incident Open" snapshot={data.workflow_snapshot} />
            <WorkflowPanel title="Current User Workflows" snapshot={data.current_workflows} />
          </div>

          <NexusPanel title="Timeline">
            {data.timeline.length === 0 ? (
              <NexusListEmpty title="No timeline entries" />
            ) : (
              <div className="space-y-2">
                {data.timeline.slice(0, 30).map((entry, index) => (
                  <div
                    key={`${String(entry.at ?? entry.occurred_at)}-${index}`}
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                  >
                    <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                      {formatDateTime(String(entry.at ?? entry.occurred_at ?? ""))}
                    </p>
                    <p className="mt-1 text-sm text-zinc-200">
                      {formatNexusDisplayText(
                        String(entry.message ?? entry.type ?? entry.event_type ?? "Event"),
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </NexusPanel>

          <div className="grid gap-4 xl:grid-cols-2">
            <NexusPanel title="Owner Notes">
              <textarea
                value={notesDraft}
                onChange={(event) => setNotesDraft(event.target.value)}
                rows={6}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#b4141e]/50"
                placeholder="Command notes, decisions, and coordination context..."
              />
              <div className="mt-3">
                <NexusActionButton
                  label={isPending(`war-room-notes-${warRoomId}`) ? "Saving" : "Save Notes"}
                  disabled={isPending(`war-room-notes-${warRoomId}`)}
                  variant="primary"
                  onClick={() =>
                    void saveField({ owner_notes: notesDraft }, `war-room-notes-${warRoomId}`)
                  }
                />
              </div>
            </NexusPanel>

            <NexusPanel title="Resolution Summary">
              <textarea
                value={resolutionDraft}
                onChange={(event) => setResolutionDraft(event.target.value)}
                rows={6}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#b4141e]/50"
                placeholder="What fixed it, what remains, and follow-up actions..."
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <NexusActionButton
                  label={
                    isPending(`war-room-resolution-${warRoomId}`) ? "Saving" : "Save Resolution"
                  }
                  disabled={isPending(`war-room-resolution-${warRoomId}`)}
                  variant="primary"
                  onClick={() =>
                    void saveField(
                      { resolution_summary: resolutionDraft },
                      `war-room-resolution-${warRoomId}`,
                    )
                  }
                />
              </div>
              {data.war_room.resolved_at ? (
                <p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                  Resolved {formatDateTime(data.war_room.resolved_at)}
                </p>
              ) : null}
            </NexusPanel>
          </div>
        </div>
      ) : null}
    </NexusSectionFrame>
  );
}

function SnapshotPanel({
  title,
  snapshot,
}: {
  title: string;
  snapshot: NexusWarRoomDetail["infrastructure_snapshot"];
}) {
  if (!snapshot) {
    return (
      <NexusPanel title={title}>
        <NexusListEmpty title="No snapshot captured" />
      </NexusPanel>
    );
  }

  return (
    <NexusPanel title={title}>
      <p className="mb-3 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
        System {snapshot.system_status} · {formatDateTime(snapshot.captured_at)}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {snapshot.integrations.map((item) => (
          <div key={item.slug} className="rounded-lg border border-white/10 bg-black/30 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-white">{item.display_name}</p>
              <NexusStatusBadge label={item.status} variant="subtle" />
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {item.latency_ms != null ? `${item.latency_ms}ms` : "—"}
            </p>
          </div>
        ))}
      </div>
    </NexusPanel>
  );
}

function WorkflowPanel({
  title,
  snapshot,
}: {
  title: string;
  snapshot: NexusWarRoomDetail["workflow_snapshot"];
}) {
  if (!snapshot) {
    return (
      <NexusPanel title={title}>
        <NexusListEmpty title="No workflow snapshot" />
      </NexusPanel>
    );
  }

  return (
    <NexusPanel title={title}>
      <p className="mb-3 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
        Score {snapshot.score ?? "—"} · {snapshot.status} · {formatDateTime(snapshot.captured_at)}
      </p>
      <div className="space-y-2">
        {snapshot.workflows.slice(0, 8).map((workflow) => (
          <div
            key={workflow.slug}
            className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2"
          >
            <p className="text-sm text-white">{workflow.display_name}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">{workflow.workflow_score ?? "—"}</span>
              <NexusStatusBadge label={workflow.workflow_status} variant="subtle" />
            </div>
          </div>
        ))}
      </div>
    </NexusPanel>
  );
}

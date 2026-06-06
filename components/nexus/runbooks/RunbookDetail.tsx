"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import type { NexusRunbookDetail } from "@/lib/runbooks/types";
import { formatDateTime, formatRelativeTime } from "@/lib/nexus/format";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import { useNexusMutation } from "@/hooks/nexus/useNexusMutation";
import { RunbookChecklist } from "@/components/nexus/runbooks/RunbookChecklist";
import {
  NexusActionButton,
  NexusListEmpty,
  NexusPanel,
  NexusSectionFrame,
} from "@/components/nexus/NexusShared";
import { NexusStatusBadge } from "@/components/nexus/NexusStatusBadge";
import { NexusRecommendedCommands } from "@/components/nexus/commands/NexusRecommendedCommands";
import { formatNexusDisplayText } from "@/lib/nexus/terminology";

function categoryLabel(category: string) {
  return category.replaceAll("_", " ");
}

export function RunbookDetail({ runbookId }: { runbookId: string }) {
  const { data, error, loading, refresh } = useNexusFetch<NexusRunbookDetail>(
    `/api/nexus/runbooks/${runbookId}`,
  );
  const { mutate, isPending } = useNexusMutation();
  const [notesDraft, setNotesDraft] = useState("");
  const [checklist, setChecklist] = useState(data?.runbook.checklist ?? []);
  const [resolutionSteps, setResolutionSteps] = useState(data?.runbook.resolution_steps ?? []);
  const [verificationSteps, setVerificationSteps] = useState(data?.runbook.verification_steps ?? []);

  const runbook = data?.runbook;

  useEffect(() => {
    if (runbook) {
      setNotesDraft(runbook.owner_notes ?? "");
      setChecklist(runbook.checklist);
      setResolutionSteps(runbook.resolution_steps);
      setVerificationSteps(runbook.verification_steps);
    }
  }, [runbook?.id, runbook?.owner_notes, runbook?.checklist, runbook?.resolution_steps, runbook?.verification_steps]);

  async function savePatch(body: Record<string, unknown>, key: string) {
    const result = await mutate(`/api/nexus/runbooks/${runbookId}`, body, key);
    if (result.ok) {
      await refresh();
    }
  }

  return (
    <NexusSectionFrame
      title={runbook ? formatNexusDisplayText(runbook.title) : "Runbook"}
      description={runbook ? formatNexusDisplayText(runbook.description) : undefined}
      loading={loading}
      error={error}
      onRefresh={refresh}
      action={
        runbook ? (
          <div className="flex flex-wrap items-center gap-2">
            <NexusStatusBadge label={runbook.severity} />
            <NexusStatusBadge label={runbook.status} />
            <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              {categoryLabel(runbook.category)}
            </span>
          </div>
        ) : null
      }
    >
      {!loading && data ? (
        <div className="space-y-4">
          <NexusRecommendedCommands filters={{ runbook_id: runbookId }} />

          <NexusPanel title="Overview">
            <p className="text-sm leading-7 text-zinc-300">
              {formatNexusDisplayText(data.runbook.description)}
            </p>
            <p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-zinc-600">
              Updated {formatRelativeTime(data.runbook.updated_at)} ·{" "}
              {formatDateTime(data.runbook.updated_at)}
            </p>
          </NexusPanel>

          <NexusPanel title="Trigger Conditions">
            {data.runbook.trigger_types.length === 0 ? (
              <NexusListEmpty title="No triggers defined" />
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.runbook.trigger_types.map((trigger) => (
                  <span
                    key={trigger}
                    className="rounded-full border border-[#b4141e]/25 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-zinc-300"
                  >
                    {trigger}
                  </span>
                ))}
              </div>
            )}
          </NexusPanel>

          <RunbookChecklist
            title="Checklist"
            steps={checklist}
            editable
            onChange={setChecklist}
          />

          <RunbookChecklist
            title="Resolution Steps"
            steps={resolutionSteps}
            editable
            onChange={setResolutionSteps}
          />

          <RunbookChecklist
            title="Verification Steps"
            steps={verificationSteps}
            editable
            onChange={setVerificationSteps}
          />

          <div className="flex flex-wrap gap-2">
            <NexusActionButton
              label={isPending(`runbook-steps-${runbookId}`) ? "Saving" : "Save Progress"}
              disabled={isPending(`runbook-steps-${runbookId}`)}
              variant="primary"
              onClick={() =>
                void savePatch(
                  {
                    checklist,
                    resolution_steps: resolutionSteps,
                    verification_steps: verificationSteps,
                  },
                  `runbook-steps-${runbookId}`,
                )
              }
            />
            {data.runbook.status === "active" ? (
              <NexusActionButton
                label={isPending(`runbook-archive-${runbookId}`) ? "Saving" : "Archive"}
                disabled={isPending(`runbook-archive-${runbookId}`)}
                onClick={() => void savePatch({ status: "archived" }, `runbook-archive-${runbookId}`)}
              />
            ) : (
              <NexusActionButton
                label={isPending(`runbook-restore-${runbookId}`) ? "Saving" : "Restore"}
                disabled={isPending(`runbook-restore-${runbookId}`)}
                onClick={() => void savePatch({ status: "active" }, `runbook-restore-${runbookId}`)}
              />
            )}
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <RelatedPanel
              title="Related Alerts"
              emptyTitle="No related alerts"
              items={data.related_alerts.map((alert) => (
                <RelatedRow
                  key={alert.id}
                  title={alert.title}
                  meta={`${alert.category} · ${alert.status}`}
                  badge={alert.severity}
                />
              ))}
            />
            <RelatedPanel
              title="Related Incidents"
              emptyTitle="No related incidents"
              items={data.related_incidents.map((incident) => (
                <RelatedRow
                  key={incident.id}
                  title={incident.title}
                  meta={incident.status}
                  badge={incident.severity}
                  href="/admin/nexus/incidents"
                />
              ))}
            />
            <RelatedPanel
              title="Related War Rooms"
              emptyTitle="No related war rooms"
              items={data.related_war_rooms.map((room) => (
                <RelatedRow
                  key={room.id}
                  title={room.title}
                  meta={room.status}
                  href={`/admin/nexus/war-rooms/${room.id}`}
                />
              ))}
            />
          </div>

          <NexusPanel title="Owner Notes">
            <textarea
              value={notesDraft}
              onChange={(event) => setNotesDraft(event.target.value)}
              rows={6}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#b4141e]/50"
              placeholder="Runbook-specific notes, adaptations, and lessons learned..."
            />
            <div className="mt-3">
              <NexusActionButton
                label={isPending(`runbook-notes-${runbookId}`) ? "Saving" : "Save Notes"}
                disabled={isPending(`runbook-notes-${runbookId}`)}
                variant="primary"
                onClick={() => void savePatch({ owner_notes: notesDraft }, `runbook-notes-${runbookId}`)}
              />
            </div>
          </NexusPanel>
        </div>
      ) : null}
    </NexusSectionFrame>
  );
}

function RelatedPanel({
  title,
  emptyTitle,
  items,
}: {
  title: string;
  emptyTitle: string;
  items: ReactNode[];
}) {
  return (
    <NexusPanel title={title}>
      {items.length === 0 ? (
        <NexusListEmpty title={emptyTitle} />
      ) : (
        <div className="space-y-2">{items}</div>
      )}
    </NexusPanel>
  );
}

function RelatedRow({
  title,
  meta,
  badge,
  href,
}: {
  title: string;
  meta: string;
  badge?: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
      <div className="flex items-center gap-2">
        {badge ? <NexusStatusBadge label={badge} variant="subtle" /> : null}
        <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">{meta}</span>
      </div>
      <p className="mt-1 text-sm text-white">{formatNexusDisplayText(title)}</p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}

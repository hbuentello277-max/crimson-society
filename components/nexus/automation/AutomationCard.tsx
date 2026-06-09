"use client";

import type { AutomationActionSummaryRow } from "@/lib/automation/types";
import { formatDateTime, formatRelativeTime } from "@/lib/nexus/format";
import { NexusActionButton, NexusPanel } from "@/components/nexus/NexusShared";
import { NexusStatusBadge } from "@/components/nexus/NexusStatusBadge";
import { formatNexusDisplayText } from "@/lib/nexus/terminology";

export function AutomationCard({
  action,
  onApprove,
  onReject,
  onArchive,
  pendingKey,
}: {
  action: AutomationActionSummaryRow;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onArchive: (id: string) => void;
  pendingKey: string | null;
}) {
  const canApprove = action.status === "proposed";
  const canReject = action.status === "proposed" || action.status === "approved";
  const canArchive =
    action.status === "proposed" ||
    action.status === "approved" ||
    action.status === "rejected";

  return (
    <NexusPanel>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <NexusStatusBadge label={action.status} />
          <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            {action.action_type.replaceAll("_", " ")}
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            Source {action.source}
          </span>
        </div>

        <div>
          <p className="text-lg font-medium text-white">
            {formatNexusDisplayText(action.title)}
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            {formatNexusDisplayText(action.summary)}
          </p>
          <p className="mt-3 text-sm text-zinc-300">
            <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              Recommendation ·{" "}
            </span>
            {formatNexusDisplayText(action.recommendation)}
          </p>
          <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            Created {formatRelativeTime(action.created_at)} ·{" "}
            {formatDateTime(action.created_at)}
          </p>
        </div>

        {action.status === "approved" ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-100/90">
            Approved for Operator. Open Operator and explicitly execute safe allowlisted tasks when
            ready.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {canApprove ? (
            <NexusActionButton
              label={pendingKey === `${action.id}-approve` ? "Saving" : "Approve"}
              disabled={pendingKey === `${action.id}-approve`}
              variant="primary"
              onClick={() => onApprove(action.id)}
            />
          ) : null}
          {canReject ? (
            <NexusActionButton
              label={pendingKey === `${action.id}-reject` ? "Saving" : "Reject"}
              disabled={pendingKey === `${action.id}-reject`}
              onClick={() => onReject(action.id)}
            />
          ) : null}
          {canArchive ? (
            <NexusActionButton
              label={pendingKey === `${action.id}-archive` ? "Saving" : "Archive"}
              disabled={pendingKey === `${action.id}-archive`}
              variant="danger"
              onClick={() => onArchive(action.id)}
            />
          ) : null}
        </div>
      </div>
    </NexusPanel>
  );
}

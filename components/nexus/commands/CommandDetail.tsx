"use client";

import type { CommandDbRow } from "@/lib/commands/types";
import { formatDateTime, formatRelativeTime } from "@/lib/nexus/format";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import { useNexusMutation } from "@/hooks/nexus/useNexusMutation";
import {
  NexusActionButton,
  NexusPanel,
  NexusSectionFrame,
} from "@/components/nexus/NexusShared";
import { NexusStatusBadge } from "@/components/nexus/NexusStatusBadge";
import { formatNexusDisplayText } from "@/lib/nexus/terminology";
import { COMMAND_EXECUTION_DISABLED_MESSAGE } from "@/lib/commands/executor";

export function CommandDetail({ commandId }: { commandId: string }) {
  const { data, error, loading, refresh } = useNexusFetch<{ command: CommandDbRow }>(
    `/api/nexus/commands/${commandId}`,
  );
  const { mutate, isPending } = useNexusMutation();
  const command = data?.command;

  async function runAction(action: "approve" | "reject" | "dismiss" | "complete") {
    const result = await mutate(
      `/api/nexus/commands/${commandId}`,
      { action },
      `command-${commandId}-${action}`,
    );
    if (result.ok) {
      await refresh();
    }
  }

  const canApprove =
    command && ["suggested", "pending_approval"].includes(command.status);
  const canReject =
    command && ["suggested", "pending_approval", "approved"].includes(command.status);
  const canDismiss =
    command && ["suggested", "pending_approval"].includes(command.status);
  const canComplete = command?.status === "approved";

  return (
    <NexusSectionFrame
      title={command ? formatNexusDisplayText(command.title) : "Command"}
      description="Owner recommendation record. No automated execution in Mark I."
      loading={loading}
      error={error}
      onRefresh={refresh}
      action={
        command ? (
          <div className="flex flex-wrap items-center gap-2">
            <NexusStatusBadge label={command.risk_level} />
            <NexusStatusBadge label={command.status} />
          </div>
        ) : null
      }
    >
      {!loading && command ? (
        <div className="space-y-4">
          {command.status === "approved" ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-100/90">
              Approved for manual action. {COMMAND_EXECUTION_DISABLED_MESSAGE}
            </div>
          ) : null}

          <NexusPanel title="Overview">
            <p className="text-sm leading-7 text-zinc-300">
              {formatNexusDisplayText(command.summary)}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <DetailLine label="Command type" value={command.command_type.replaceAll("_", " ")} />
              <DetailLine label="Source" value={command.source} />
              <DetailLine label="Risk level" value={command.risk_level} />
              <DetailLine
                label="Expires"
                value={
                  command.expires_at
                    ? formatDateTime(command.expires_at)
                    : "No expiry"
                }
              />
            </div>
          </NexusPanel>

          <NexusPanel title="Recommended Action">
            <p className="text-sm leading-7 text-zinc-200">
              {formatNexusDisplayText(command.recommended_action)}
            </p>
          </NexusPanel>

          {Object.keys(command.evidence).length > 0 ? (
            <NexusPanel title="Evidence">
              <pre className="overflow-auto rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-zinc-400">
                {JSON.stringify(command.evidence, null, 2)}
              </pre>
            </NexusPanel>
          ) : null}

          <NexusPanel title="Related Signals">
            <div className="grid gap-2 sm:grid-cols-2">
              <DetailLine label="Alert" value={command.related_alert_id ?? "—"} />
              <DetailLine label="Incident" value={command.related_incident_id ?? "—"} />
              <DetailLine label="Insight" value={command.related_observation_id ?? "—"} />
              <DetailLine label="War Room" value={command.related_war_room_id ?? "—"} />
              <DetailLine label="Runbook" value={command.related_runbook_id ?? "—"} />
            </div>
          </NexusPanel>

          <div className="flex flex-wrap gap-2">
            {canApprove ? (
              <NexusActionButton
                label={isPending(`command-${commandId}-approve`) ? "Saving" : "Approve"}
                disabled={isPending(`command-${commandId}-approve`)}
                variant="primary"
                onClick={() => void runAction("approve")}
              />
            ) : null}
            {canComplete ? (
              <NexusActionButton
                label={isPending(`command-${commandId}-complete`) ? "Saving" : "Mark Completed"}
                disabled={isPending(`command-${commandId}-complete`)}
                variant="primary"
                onClick={() => void runAction("complete")}
              />
            ) : null}
            {canReject ? (
              <NexusActionButton
                label={isPending(`command-${commandId}-reject`) ? "Saving" : "Reject"}
                disabled={isPending(`command-${commandId}-reject`)}
                onClick={() => void runAction("reject")}
              />
            ) : null}
            {canDismiss ? (
              <NexusActionButton
                label={isPending(`command-${commandId}-dismiss`) ? "Saving" : "Dismiss"}
                disabled={isPending(`command-${commandId}-dismiss`)}
                variant="danger"
                onClick={() => void runAction("dismiss")}
              />
            ) : null}
          </div>

          <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
            Created {formatRelativeTime(command.created_at)} · Updated{" "}
            {formatDateTime(command.updated_at)}
          </p>
        </div>
      ) : null}
    </NexusSectionFrame>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="mt-1 break-all text-sm text-zinc-200">{value}</p>
    </div>
  );
}

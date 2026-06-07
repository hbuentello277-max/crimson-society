"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { NexusCommandsSummary, NexusCommandSummaryRow } from "@/lib/commands/types";
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
import {
  useNexusScrollRestoration,
  useNexusStoredState,
} from "@/hooks/nexus/useNexusPageState";

type CommandTab =
  | "suggested"
  | "pending_approval"
  | "approved"
  | "completed"
  | "closed";

const TAB_LABELS: Record<CommandTab, string> = {
  suggested: "Suggested",
  pending_approval: "Pending Approval",
  approved: "Approved",
  completed: "Completed",
  closed: "Rejected / Dismissed / Expired",
};

function relatedSignal(command: NexusCommandSummaryRow) {
  if (command.related_alert_id) return "Alert";
  if (command.related_incident_id) return "Incident";
  if (command.related_observation_id) return "Insight";
  if (command.related_war_room_id) return "War Room";
  if (command.related_runbook_id) return "Runbook";
  return "System";
}

export function NexusCommandsCenter() {
  const { ref: scrollRef } = useNexusScrollRestoration("nexus:commands");
  const [tab, setTab] = useNexusStoredState<CommandTab>("nexus:commands:tab", "suggested");
  const { data, error, loading, refresh } = useNexusFetch<NexusCommandsSummary>(
    "/api/nexus/commands",
  );

  const allCommands = data?.commands ?? [];

  const commands = useMemo(() => {
    if (tab === "closed") {
      return allCommands.filter((command) =>
        ["rejected", "dismissed", "expired"].includes(command.status),
      );
    }
    return allCommands.filter((command) => command.status === tab);
  }, [allCommands, tab]);

  const tabs = useMemo(
    () =>
      (Object.keys(TAB_LABELS) as CommandTab[]).map((id) => ({
        id,
        label: TAB_LABELS[id],
        count:
          id === "closed"
            ? allCommands.filter((command) =>
                ["rejected", "dismissed", "expired"].includes(command.status),
              ).length
            : allCommands.filter((command) => command.status === id).length,
      })),
    [allCommands],
  );

  return (
    <div ref={scrollRef}>
      <NexusSectionFrame
        title="Commands"
        description="Owner-only operational recommendations. Mark I is suggestion and history mode — no execution."
        loading={loading}
        error={error}
        onRefresh={refresh}
      >
        {!loading ? (
          <>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100/90">
              Commands are recommendations only. Approving a command means you intend to take manual
              action outside Nexus. Execution is disabled in Mark I.
            </div>

            <NexusTabFilter tabs={tabs} value={tab} onChange={setTab} />

            {commands.length === 0 ? (
              <NexusListEmpty
                title={`No ${TAB_LABELS[tab].toLowerCase()} commands`}
                description="Run the command suggestions cron to populate recommendations from current Nexus signals."
              />
            ) : (
              <div className="space-y-3">
                {commands.map((command) => (
                  <CommandCard key={command.id} command={command} />
                ))}
              </div>
            )}
          </>
        ) : null}
      </NexusSectionFrame>
    </div>
  );
}

function CommandCard({ command }: { command: NexusCommandSummaryRow }) {
  return (
    <NexusPanel>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <NexusStatusBadge label={command.risk_level} />
            <NexusStatusBadge label={command.status} />
            <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              {command.command_type.replaceAll("_", " ")}
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              {relatedSignal(command)}
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
              Source {command.source}
            </span>
          </div>
          <p className="mt-3 text-lg font-medium text-white">
            {formatNexusDisplayText(command.title)}
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            {formatNexusDisplayText(command.summary)}
          </p>
          <p className="mt-3 text-sm text-zinc-300">
            <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              Recommended action ·{" "}
            </span>
            {formatNexusDisplayText(command.recommended_action)}
          </p>
          <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            Created {formatRelativeTime(command.created_at)} · Updated{" "}
            {formatDateTime(command.updated_at)}
            {command.expires_at ? ` · Expires ${formatRelativeTime(command.expires_at)}` : ""}
          </p>
        </div>

        <Link
          href={`/admin/nexus/commands/${command.id}`}
          className="inline-flex min-h-10 items-center rounded-full border border-[#b4141e]/50 bg-[#b4141e]/15 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-[#f1c3c7] transition hover:bg-[#b4141e]/25"
        >
          Open Command
        </Link>
      </div>
    </NexusPanel>
  );
}

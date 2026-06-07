"use client";

import type { OperatorReadyAction } from "@/lib/operator/types";
import { formatDateTime, formatRelativeTime } from "@/lib/nexus/format";
import { NexusActionButton, NexusPanel } from "@/components/nexus/NexusShared";
import { NexusStatusBadge } from "@/components/nexus/NexusStatusBadge";
import { formatNexusDisplayText } from "@/lib/nexus/terminology";

export function OperatorActionCard({
  item,
  pendingKey,
  onExecute,
}: {
  item: OperatorReadyAction;
  pendingKey: string | null;
  onExecute: (automationActionId: string) => void;
}) {
  const executeKey = `${item.automation_action.id}-execute`;

  return (
    <NexusPanel>
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <NexusStatusBadge label="approved" />
          <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            {item.profile.label}
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            Source {item.automation_action.source}
          </span>
        </div>

        <div className="min-w-0">
          <p className="break-words text-lg font-medium text-white">
            {formatNexusDisplayText(item.automation_action.title)}
          </p>
          <p className="mt-2 break-words text-sm leading-6 text-zinc-400">
            {formatNexusDisplayText(item.automation_action.summary)}
          </p>
          <p className="mt-3 break-words text-sm text-zinc-300">
            <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              Recommendation ·{" "}
            </span>
            {formatNexusDisplayText(item.automation_action.recommendation)}
          </p>
          <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            Approved {formatRelativeTime(item.automation_action.approved_at ?? item.automation_action.created_at)}
          </p>
        </div>

        <SafetyPanel profile={item.profile} />

        <NexusActionButton
          label={pendingKey === executeKey ? "Executing" : "Execute"}
          disabled={pendingKey === executeKey}
          variant="primary"
          onClick={() => onExecute(item.automation_action.id)}
        />
      </div>
    </NexusPanel>
  );
}

export function SafetyPanel({
  profile,
}: {
  profile: OperatorReadyAction["profile"];
}) {
  return (
    <div className="space-y-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3">
      <p className="text-xs font-medium text-emerald-100/90">Why this is safe</p>
      <p className="break-words text-sm leading-6 text-zinc-300">{profile.safe_because}</p>

      <div>
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">What it will do</p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-zinc-300">
          {profile.will_do.map((line) => (
            <li key={line} className="break-words">
              {line}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">What it will NOT do</p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-zinc-400">
          {profile.will_not_do.map((line) => (
            <li key={line} className="break-words">
              {line}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ExecutionRecordCard({
  title,
  executionTypeLabel,
  status,
  startedAt,
  completedAt,
  automationTitle,
  errorMessage,
  profile,
}: {
  title: string;
  executionTypeLabel: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  automationTitle?: string | null;
  errorMessage?: string | null;
  profile?: OperatorReadyAction["profile"];
}) {
  return (
    <NexusPanel>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <NexusStatusBadge label={status} />
          <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            {executionTypeLabel}
          </span>
        </div>
        <p className="break-words text-base font-medium text-white">{formatNexusDisplayText(title)}</p>
        {automationTitle ? (
          <p className="break-words text-sm text-zinc-400">
            Automation · {formatNexusDisplayText(automationTitle)}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="break-words text-sm text-red-300/90">{errorMessage}</p>
        ) : null}
        <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
          {startedAt ? `Started ${formatDateTime(startedAt)}` : "Not started"}
          {completedAt ? ` · Completed ${formatRelativeTime(completedAt)}` : ""}
        </p>
        {profile ? <SafetyPanel profile={profile} /> : null}
      </div>
    </NexusPanel>
  );
}

"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { NexusCommandSummaryRow } from "@/lib/commands/types";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import { NexusPanel } from "@/components/nexus/NexusShared";
import { NexusStatusBadge } from "@/components/nexus/NexusStatusBadge";
import { formatNexusDisplayText } from "@/lib/nexus/terminology";
import { formatRelativeTime } from "@/lib/nexus/format";

export function NexusRecommendedCommands({
  filters,
  title = "Recommended Commands",
}: {
  filters: {
    alert_id?: string;
    incident_id?: string;
    observation_id?: string;
    war_room_id?: string;
    runbook_id?: string;
  };
  title?: string;
}) {
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.alert_id) params.set("alert_id", filters.alert_id);
    if (filters.incident_id) params.set("incident_id", filters.incident_id);
    if (filters.observation_id) params.set("observation_id", filters.observation_id);
    if (filters.war_room_id) params.set("war_room_id", filters.war_room_id);
    if (filters.runbook_id) params.set("runbook_id", filters.runbook_id);
    return `/api/nexus/commands?${params.toString()}`;
  }, [filters]);

  const { data, loading, error } = useNexusFetch<{
    commands: NexusCommandSummaryRow[];
  }>(query);

  const commands = (data?.commands ?? []).filter((command) =>
    ["suggested", "pending_approval", "approved"].includes(command.status),
  );

  if (loading || error || commands.length === 0) {
    return null;
  }

  return (
    <NexusPanel title={title}>
      <div className="space-y-2">
        {commands.slice(0, 4).map((command) => (
          <Link
            key={command.id}
            href={`/admin/nexus/commands/${command.id}`}
            className="block rounded-xl border border-[#b4141e]/20 bg-[#0a0608]/80 p-3 transition hover:border-[#b4141e]/40 hover:bg-[#b4141e]/5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <NexusStatusBadge label={command.risk_level} variant="subtle" />
              <NexusStatusBadge label={command.status} variant="subtle" />
              <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                {command.command_type.replaceAll("_", " ")}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-white">
              {formatNexusDisplayText(command.title)}
            </p>
            <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
              {formatNexusDisplayText(command.summary)}
            </p>
            {command.expires_at ? (
              <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                Expires {formatRelativeTime(command.expires_at)}
              </p>
            ) : null}
          </Link>
        ))}
      </div>
    </NexusPanel>
  );
}

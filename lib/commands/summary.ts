import type { SupabaseClient } from "@supabase/supabase-js";
import { mapCommandRow } from "@/lib/commands/mapper";
import type { NexusCommandsSummary, NexusCommandSummaryRow } from "@/lib/commands/types";
import type { NexusCommandStatus } from "@/lib/nexus/constants";

function toSummaryRow(row: Record<string, unknown>): NexusCommandSummaryRow {
  const command = mapCommandRow(row);
  return {
    id: command.id,
    command_type: command.command_type,
    title: command.title,
    summary: command.summary,
    status: command.status,
    risk_level: command.risk_level,
    source: command.source,
    recommended_action: command.recommended_action,
    related_alert_id: command.related_alert_id,
    related_incident_id: command.related_incident_id,
    related_observation_id: command.related_observation_id,
    related_war_room_id: command.related_war_room_id,
    related_runbook_id: command.related_runbook_id,
    expires_at: command.expires_at,
    created_at: command.created_at,
    updated_at: command.updated_at,
  };
}

export type CommandListFilters = {
  status?: NexusCommandStatus | "closed";
  alert_id?: string;
  incident_id?: string;
  observation_id?: string;
  war_room_id?: string;
  runbook_id?: string;
};

const CLOSED_STATUSES: NexusCommandStatus[] = ["rejected", "dismissed", "expired"];

export async function getNexusCommandsSummary(
  supabase: SupabaseClient,
  filters: CommandListFilters = {},
): Promise<NexusCommandsSummary> {
  let query = supabase
    .from("nexus_commands")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (filters.alert_id) query = query.eq("alert_id", filters.alert_id);
  if (filters.incident_id) query = query.eq("incident_id", filters.incident_id);
  if (filters.observation_id) query = query.eq("observation_id", filters.observation_id);
  if (filters.war_room_id) query = query.eq("war_room_id", filters.war_room_id);
  if (filters.runbook_id) query = query.eq("runbook_id", filters.runbook_id);

  if (filters.status === "closed") {
    query = query.in("status", CLOSED_STATUSES);
  } else if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const commands = (data ?? []).map((row) => toSummaryRow(row as Record<string, unknown>));

  return {
    collected_at: new Date().toISOString(),
    counts: {
      suggested: commands.filter((row) => row.status === "suggested").length,
      pending_approval: commands.filter((row) => row.status === "pending_approval").length,
      approved: commands.filter((row) => row.status === "approved").length,
      completed: commands.filter((row) => row.status === "completed").length,
      closed: commands.filter((row) => CLOSED_STATUSES.includes(row.status)).length,
    },
    commands,
  };
}

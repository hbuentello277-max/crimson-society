import type { SupabaseClient } from "@supabase/supabase-js";
import type { NexusWarRoomSummaryRow, NexusWarRoomsSummary } from "@/lib/war-room/types";
import type { NexusIncidentStatus, NexusWarRoomStatus } from "@/lib/nexus/constants";

const HISTORY_WINDOW_MS = 14 * 24 * 60 * 60_000;

function mapWarRoomSummaryRow(
  row: Record<string, unknown>,
  incident: Record<string, unknown> | undefined,
  linkedAlertCount: number,
  linkedObservationCount: number,
): NexusWarRoomSummaryRow {
  return {
    id: row.id as string,
    incident_id: row.incident_id as string,
    title: row.title as string,
    status: row.status as NexusWarRoomStatus,
    severity: row.severity as NexusWarRoomSummaryRow["severity"],
    impact_summary: (row.impact_summary as string | null) ?? null,
    activated_at: row.activated_at as string,
    resolved_at: (row.resolved_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    incident_status: (incident?.status as NexusIncidentStatus | undefined) ?? null,
    incident_title: (incident?.title as string | undefined) ?? null,
    linked_alert_count: linkedAlertCount,
    linked_observation_count: linkedObservationCount,
    suggest_followup: false,
  };
}

async function countByIncident(
  supabase: SupabaseClient,
  table: "nexus_alerts" | "nexus_observations",
  incidentIds: string[],
): Promise<Record<string, number>> {
  if (incidentIds.length === 0) {
    return {};
  }

  const column = table === "nexus_alerts" ? "incident_id" : "incident_id";
  const { data, error } = await supabase.from(table).select(column).in(column, incidentIds);

  if (error) {
    throw new Error(error.message);
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = row[column] as string;
    if (id) {
      counts[id] = (counts[id] ?? 0) + 1;
    }
  }

  return counts;
}

export async function getNexusWarRoomsSummary(
  supabase: SupabaseClient,
): Promise<NexusWarRoomsSummary> {
  const historySince = new Date(Date.now() - HISTORY_WINDOW_MS).toISOString();

  const [{ data: openRows, error: openError }, { data: historyRows, error: historyError }] =
    await Promise.all([
      supabase
        .from("nexus_war_rooms")
        .select(
          "id, incident_id, title, status, severity, impact_summary, activated_at, resolved_at, created_at, updated_at",
        )
        .in("status", ["open", "active"])
        .order("activated_at", { ascending: false })
        .limit(100),
      supabase
        .from("nexus_war_rooms")
        .select(
          "id, incident_id, title, status, severity, impact_summary, activated_at, resolved_at, created_at, updated_at",
        )
        .in("status", ["resolved", "archived"])
        .gte("updated_at", historySince)
        .order("updated_at", { ascending: false })
        .limit(100),
    ]);

  if (openError) {
    throw new Error(openError.message);
  }

  if (historyError) {
    throw new Error(historyError.message);
  }

  const allRows = [...(openRows ?? []), ...(historyRows ?? [])];
  const incidentIds = [...new Set(allRows.map((row) => row.incident_id as string))];

  const [{ data: incidents, error: incidentsError }, alertCounts, observationCounts] =
    await Promise.all([
      incidentIds.length > 0
        ? supabase.from("nexus_incidents").select("id, title, status").in("id", incidentIds)
        : Promise.resolve({ data: [], error: null }),
      countByIncident(supabase, "nexus_alerts", incidentIds),
      countByIncident(supabase, "nexus_observations", incidentIds),
    ]);

  if (incidentsError) {
    throw new Error(incidentsError.message);
  }

  const incidentsById = new Map(
    (incidents ?? []).map((row) => [row.id as string, row as Record<string, unknown>]),
  );

  const mapRow = (row: Record<string, unknown>) => {
    const incidentId = row.incident_id as string;
    return mapWarRoomSummaryRow(
      row,
      incidentsById.get(incidentId),
      alertCounts[incidentId] ?? 0,
      observationCounts[incidentId] ?? 0,
    );
  };

  const open = (openRows ?? []).map((row) => mapRow(row as Record<string, unknown>));
  const recent_history = (historyRows ?? []).map((row) => mapRow(row as Record<string, unknown>));

  return {
    collected_at: new Date().toISOString(),
    counts: {
      open: open.filter((row) => row.status === "open").length,
      active: open.filter((row) => row.status === "active").length,
      resolved: recent_history.filter((row) => row.status === "resolved").length,
      archived: recent_history.filter((row) => row.status === "archived").length,
    },
    open,
    recent_history,
  };
}

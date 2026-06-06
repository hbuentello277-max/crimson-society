import type { SupabaseClient } from "@supabase/supabase-js";
import { parseOwnerNotes } from "@/lib/alerts/notes";
import type { NexusIncidentsSummary, NexusIncidentSummaryRow } from "@/lib/incidents/types";
import type { NexusIncidentStatus, NexusSeverity } from "@/lib/nexus/constants";

const HISTORY_WINDOW_MS = 7 * 24 * 60 * 60_000;

function mapIncidentRow(
  row: Record<string, unknown>,
  linkedAlertCount: number,
): NexusIncidentSummaryRow {
  const metadata = (row.metadata as Record<string, unknown>) ?? {};
  const impactScore =
    typeof metadata.impact_score === "number" ? metadata.impact_score : 0;

  return {
    id: row.id as string,
    title: row.title as string,
    status: row.status as NexusIncidentStatus,
    severity: row.severity as NexusSeverity,
    impact_score: impactScore,
    integration_id: (row.integration_id as string | null) ?? null,
    linked_alert_count: linkedAlertCount,
    started_at: row.started_at as string,
    resolved_at: (row.resolved_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    root_cause: (row.root_cause as string | null) ?? null,
    impact_summary: (row.impact_summary as string | null) ?? null,
    owner_notes_count: parseOwnerNotes(metadata).length,
    metadata: {
      escalation_reason:
        typeof metadata.escalation_reason === "string" ? metadata.escalation_reason : null,
      suggest_resolve: metadata.suggest_resolve === true,
      correlation_id:
        typeof metadata.correlation_id === "string" ? metadata.correlation_id : null,
    },
  };
}

async function countLinkedAlerts(
  supabase: SupabaseClient,
  incidentIds: string[],
): Promise<Record<string, number>> {
  if (incidentIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from("nexus_alerts")
    .select("incident_id")
    .in("incident_id", incidentIds);

  if (error) {
    throw new Error(error.message);
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = row.incident_id as string;
    counts[id] = (counts[id] ?? 0) + 1;
  }

  return counts;
}

export async function getNexusIncidentsSummary(
  supabase: SupabaseClient,
): Promise<NexusIncidentsSummary> {
  const historySince = new Date(Date.now() - HISTORY_WINDOW_MS).toISOString();

  const [{ data: openRows, error: openError }, { data: historyRows, error: historyError }] =
    await Promise.all([
      supabase
        .from("nexus_incidents")
        .select(
          "id, title, status, severity, integration_id, started_at, resolved_at, root_cause, impact_summary, metadata, created_at, updated_at",
        )
        .in("status", ["open", "investigating", "mitigated"])
        .order("updated_at", { ascending: false })
        .limit(100),
      supabase
        .from("nexus_incidents")
        .select(
          "id, title, status, severity, integration_id, started_at, resolved_at, root_cause, impact_summary, metadata, created_at, updated_at",
        )
        .in("status", ["resolved", "postmortem"])
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

  const allIds = [
    ...(openRows ?? []).map((row) => row.id as string),
    ...(historyRows ?? []).map((row) => row.id as string),
  ];
  const linkedCounts = await countLinkedAlerts(supabase, allIds);

  const open = (openRows ?? [])
    .map((row) =>
      mapIncidentRow(row as Record<string, unknown>, linkedCounts[row.id as string] ?? 0),
    )
    .sort((a, b) => b.impact_score - a.impact_score || b.updated_at.localeCompare(a.updated_at));

  const recent_history = (historyRows ?? []).map((row) =>
    mapIncidentRow(row as Record<string, unknown>, linkedCounts[row.id as string] ?? 0),
  );

  const counts = {
    open: open.filter((row) => row.status === "open").length,
    investigating: open.filter((row) => row.status === "investigating").length,
    mitigated: open.filter((row) => row.status === "mitigated").length,
    resolved: recent_history.filter((row) => row.status === "resolved").length,
    postmortem: recent_history.filter((row) => row.status === "postmortem").length,
  };

  return {
    collected_at: new Date().toISOString(),
    counts,
    open,
    recent_history,
  };
}

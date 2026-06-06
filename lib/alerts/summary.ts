import type { SupabaseClient } from "@supabase/supabase-js";
import { parseOwnerNotes } from "@/lib/alerts/notes";
import type { AlertDbStatus, NexusAlertSummaryRow, NexusAlertsSummary } from "@/lib/alerts/types";
import type { NexusSeverity } from "@/lib/nexus/constants";

const HISTORY_WINDOW_MS = 7 * 24 * 60 * 60_000;

function mapAlertRow(row: Record<string, unknown>): NexusAlertSummaryRow {
  const metadata = (row.metadata as Record<string, unknown>) ?? {};
  const impactScore =
    typeof metadata.impact_score === "number" ? metadata.impact_score : 0;

  return {
    id: row.id as string,
    rule_id: (row.rule_id as string | null) ?? null,
    category: row.category as string,
    severity: row.severity as NexusSeverity,
    status: row.status as AlertDbStatus,
    title: row.title as string,
    message: row.message as string,
    dedupe_key: (row.dedupe_key as string | null) ?? null,
    impact_score: impactScore,
    incident_id: (row.incident_id as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    acknowledged_at: (row.acknowledged_at as string | null) ?? null,
    resolved_at: (row.resolved_at as string | null) ?? null,
    owner_notes_count: parseOwnerNotes(metadata).length,
    metadata: {
      investigating: metadata.investigating === true,
      last_seen_at: metadata.last_seen_at ?? null,
      first_seen_at: metadata.first_seen_at ?? null,
      evidence: metadata.evidence ?? {},
      recovery_of_alert_id: metadata.recovery_of_alert_id ?? null,
    },
  };
}

export async function getNexusAlertsSummary(
  supabase: SupabaseClient,
): Promise<NexusAlertsSummary> {
  const historySince = new Date(Date.now() - HISTORY_WINDOW_MS).toISOString();

  const [{ data: activeRows, error: activeError }, { data: historyRows, error: historyError }] =
    await Promise.all([
      supabase
        .from("nexus_alerts")
        .select(
          "id, rule_id, category, severity, status, title, message, dedupe_key, incident_id, created_at, updated_at, acknowledged_at, resolved_at, metadata",
        )
        .in("status", ["active", "acknowledged"])
        .order("updated_at", { ascending: false })
        .limit(100),
      supabase
        .from("nexus_alerts")
        .select(
          "id, rule_id, category, severity, status, title, message, dedupe_key, incident_id, created_at, updated_at, acknowledged_at, resolved_at, metadata",
        )
        .in("status", ["resolved", "suppressed"])
        .gte("updated_at", historySince)
        .order("updated_at", { ascending: false })
        .limit(100),
    ]);

  if (activeError) {
    throw new Error(activeError.message);
  }

  if (historyError) {
    throw new Error(historyError.message);
  }

  const active = (activeRows ?? []).map((row) => mapAlertRow(row as Record<string, unknown>));
  active.sort((a, b) => b.impact_score - a.impact_score || b.updated_at.localeCompare(a.updated_at));

  const recent_history = (historyRows ?? []).map((row) =>
    mapAlertRow(row as Record<string, unknown>),
  );

  const counts = {
    critical: active.filter((row) => row.severity === "critical").length,
    warning: active.filter((row) => row.severity === "warning").length,
    info: active.filter((row) => row.severity === "info").length,
    recovery: active.filter((row) => row.category === "recovery").length,
    active: active.length,
  };

  return {
    collected_at: new Date().toISOString(),
    counts,
    active,
    recent_history,
  };
}

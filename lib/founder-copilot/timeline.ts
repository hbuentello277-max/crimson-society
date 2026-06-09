import type { SupabaseClient } from "@supabase/supabase-js";
import { getNexusCopilot } from "@/lib/copilot/engine";
import type { FounderTimeline, FounderTimelineEntry } from "@/lib/founder-copilot/types";
import { getNexusMemorySummary } from "@/lib/memory/summary";
import { loadReportContext } from "@/lib/reports/context";

const ACCOMPLISHMENT_TYPES = new Set(["milestone", "growth", "revenue", "deployment"]);
const DECISION_TYPES = new Set(["command", "briefing", "report", "owner_note", "intelligence"]);
const BLOCKER_TYPES = new Set(["incident", "alert"]);

function mapEntry(entry: {
  id: string;
  entry_type: string;
  title: string;
  summary: string;
  occurred_at: string;
  source: string;
}): FounderTimelineEntry {
  return {
    id: entry.id,
    entryType: entry.entry_type,
    title: entry.title,
    summary: entry.summary,
    occurredAt: entry.occurred_at,
    source: entry.source,
  };
}

function isToday(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate()
  );
}

export async function getFounderTimeline(admin: SupabaseClient): Promise<FounderTimeline> {
  const [memory, copilot, report] = await Promise.all([
    getNexusMemorySummary(admin, { limit: 50 }),
    getNexusCopilot(admin),
    loadReportContext(admin),
  ]);

  const todayEntries = memory.entries.filter((entry) => isToday(entry.occurred_at));
  const recentEntries = todayEntries.length > 0 ? todayEntries : memory.entries.slice(0, 12);

  const recentAccomplishments = recentEntries
    .filter((entry) => ACCOMPLISHMENT_TYPES.has(entry.entry_type))
    .slice(0, 5)
    .map(mapEntry);

  const recentDecisions = recentEntries
    .filter((entry) => DECISION_TYPES.has(entry.entry_type))
    .slice(0, 5)
    .map(mapEntry);

  const memoryBlockers = recentEntries
    .filter((entry) => BLOCKER_TYPES.has(entry.entry_type))
    .slice(0, 4)
    .map(mapEntry);

  const currentBlockers: FounderTimelineEntry[] = [...memoryBlockers];

  for (const alert of (report.alerts.active ?? []).slice(0, 2)) {
    currentBlockers.push({
      id: `alert:${alert.id}`,
      entryType: "alert",
      title: alert.title,
      summary: alert.message,
      occurredAt: alert.created_at ?? new Date().toISOString(),
      source: "Alerts",
    });
  }

  for (const incident of report.incidents.open.slice(0, 2)) {
    currentBlockers.push({
      id: `incident:${incident.id}`,
      entryType: "incident",
      title: incident.title,
      summary: incident.impact_summary || `Open ${incident.severity} incident`,
      occurredAt: incident.created_at ?? new Date().toISOString(),
      source: "Incidents",
    });
  }

  const nextActions = copilot.recommended_next_steps.slice(0, 5);

  return {
    generatedAt: new Date().toISOString(),
    recentAccomplishments,
    recentDecisions,
    currentBlockers: currentBlockers.slice(0, 6),
    nextActions,
  };
}

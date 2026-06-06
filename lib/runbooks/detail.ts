import type { SupabaseClient } from "@supabase/supabase-js";
import { mapRunbookRow } from "@/lib/runbooks/manager";
import type { NexusRunbookDetail } from "@/lib/runbooks/types";

function categoryTokens(category: string, triggerTypes: string[]) {
  const tokens = new Set<string>(triggerTypes);
  tokens.add(`category:${category}`);
  if (category === "infrastructure") {
    tokens.add("category:infra");
    tokens.add("category:health");
  }
  if (category === "user_workflows") {
    tokens.add("category:mission");
  }
  if (category === "revenue") {
    tokens.add("category:commerce");
  }
  return tokens;
}

export async function getNexusRunbookDetail(
  supabase: SupabaseClient,
  runbookId: string,
): Promise<NexusRunbookDetail | null> {
  const { data: row, error } = await supabase
    .from("nexus_runbooks")
    .select(
      "id, slug, title, category, severity, description, trigger_types, checklist, resolution_steps, verification_steps, owner_notes, status, metadata, created_at, updated_at",
    )
    .eq("id", runbookId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!row) {
    return null;
  }

  const runbook = mapRunbookRow(row as Record<string, unknown>);
  const tokens = categoryTokens(runbook.category, runbook.trigger_types);
  const tokenList = [...tokens];

  const [{ data: alerts }, { data: incidents }, { data: warRooms }] = await Promise.all([
    supabase
      .from("nexus_alerts")
      .select("id, title, severity, status, category, updated_at, rule_id")
      .in("status", ["active", "acknowledged"])
      .order("updated_at", { ascending: false })
      .limit(30),
    supabase
      .from("nexus_incidents")
      .select("id, title, severity, status, updated_at")
      .in("status", ["open", "investigating", "mitigated"])
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("nexus_war_rooms")
      .select("id, title, status, incident_id, updated_at")
      .in("status", ["open", "active"])
      .order("updated_at", { ascending: false })
      .limit(20),
  ]);

  const matchesToken = (haystack: string) => tokenList.some((token) => haystack.includes(token.replace("category:", "")));

  return {
    collected_at: new Date().toISOString(),
    runbook,
    related_alerts: (alerts ?? [])
      .filter((alert) => {
        const category = alert.category as string;
        const ruleId = (alert.rule_id as string | null) ?? "";
        return (
          tokens.has(`category:${category}`) ||
          tokens.has(`rule:${ruleId}`) ||
          matchesToken(`${category} ${ruleId} ${alert.title as string}`.toLowerCase())
        );
      })
      .slice(0, 8)
      .map((alert) => ({
        id: alert.id as string,
        title: alert.title as string,
        severity: alert.severity as string,
        status: alert.status as string,
        category: alert.category as string,
        updated_at: alert.updated_at as string,
      })),
    related_incidents: (incidents ?? [])
      .filter((incident) => tokens.has("context:incident") || matchesToken((incident.title as string).toLowerCase()))
      .slice(0, 6)
      .map((incident) => ({
        id: incident.id as string,
        title: incident.title as string,
        severity: incident.severity as string,
        status: incident.status as string,
        updated_at: incident.updated_at as string,
      })),
    related_war_rooms: (warRooms ?? [])
      .filter((room) => tokens.has("context:war_room"))
      .slice(0, 6)
      .map((room) => ({
        id: room.id as string,
        title: room.title as string,
        status: room.status as string,
        incident_id: room.incident_id as string,
        updated_at: room.updated_at as string,
      })),
  };
}

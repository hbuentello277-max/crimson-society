import type { CrossSystemContext } from "@/lib/cross-system-intelligence/context";
import type {
  CrossSystemTimelineEvent,
  CrossSystemTimelineWindow,
} from "@/lib/cross-system-intelligence/types";

function windowToMs(window: CrossSystemTimelineWindow): number {
  if (window === "24h") return 24 * 60 * 60_000;
  if (window === "7d") return 7 * 24 * 60 * 60_000;
  return 30 * 24 * 60 * 60_000;
}

function withinWindow(iso: string, windowStartMs: number): boolean {
  return new Date(iso).getTime() >= windowStartMs;
}

export function buildCrossSystemTimeline(
  context: CrossSystemContext,
  window: CrossSystemTimelineWindow = "7d",
): CrossSystemTimelineEvent[] {
  const windowStartMs = Date.now() - windowToMs(window);
  const events: CrossSystemTimelineEvent[] = [];

  for (const deployment of context.correlations.deployments) {
    if (!withinWindow(deployment.started_at, windowStartMs)) continue;
    events.push({
      id: `deployment:${deployment.id}`,
      category: "deployment",
      title: "Production deployment",
      summary: deployment.commit_message?.slice(0, 140) ?? `Deployment ${deployment.status}`,
      occurred_at: deployment.started_at,
      source: "Vercel / GitHub",
      severity: deployment.status === "failed" ? "critical" : "info",
      related_routes: ["/admin/nexus/system-health"],
    });
  }

  for (const entry of context.correlations.memory_entries) {
    if (!withinWindow(entry.occurred_at, windowStartMs)) continue;
    const category =
      entry.entry_type === "incident"
        ? "incident"
        : entry.entry_type === "command" || entry.entry_type === "owner_note"
          ? "founder_decision"
          : entry.entry_type === "revenue" || entry.entry_type === "growth"
            ? "revenue"
            : "platform";

    events.push({
      id: `memory:${entry.id}`,
      category,
      title: entry.title,
      summary: entry.summary,
      occurred_at: entry.occurred_at,
      source: "Founder memory",
      related_routes: ["/admin/nexus/memory"],
    });
  }

  for (const alert of context.proactive.alerts) {
    if (!withinWindow(alert.detectedAt, windowStartMs)) continue;
    events.push({
      id: `alert:${alert.id}`,
      category: "alert",
      title: alert.title,
      summary: alert.summary,
      occurred_at: alert.detectedAt,
      source: "Proactive intelligence",
      severity: alert.severity === "critical" ? "critical" : alert.severity === "warning" ? "warning" : "info",
      related_routes: [alert.relatedRoute ?? "/admin/nexus/alerts"],
    });
  }

  for (const incident of context.intelligence.incidents.open ?? []) {
    const occurredAt = incident.started_at ?? context.generated_at;
    if (!withinWindow(occurredAt, windowStartMs)) continue;
    events.push({
      id: `incident:${incident.id}`,
      category: "incident",
      title: incident.title,
      summary: incident.impact_summary ?? incident.title,
      occurred_at: occurredAt,
      source: "Nexus incidents",
      severity: incident.severity === "critical" ? "critical" : "warning",
      related_routes: [`/admin/nexus/incidents`],
    });
  }

  for (const accomplishment of context.founder_timeline.recentAccomplishments) {
    if (!withinWindow(accomplishment.occurredAt, windowStartMs)) continue;
    events.push({
      id: `accomplishment:${accomplishment.id}`,
      category: accomplishment.entryType.includes("revenue") ? "revenue" : "membership",
      title: accomplishment.title,
      summary: accomplishment.summary,
      occurred_at: accomplishment.occurredAt,
      source: accomplishment.source,
      related_routes: ["/admin/nexus/memory"],
    });
  }

  for (const decision of context.founder_timeline.recentDecisions) {
    if (!withinWindow(decision.occurredAt, windowStartMs)) continue;
    events.push({
      id: `decision:${decision.id}`,
      category: "founder_decision",
      title: decision.title,
      summary: decision.summary,
      occurred_at: decision.occurredAt,
      source: decision.source,
      related_routes: ["/admin/nexus/memory", "/admin/nexus/actions"],
    });
  }

  const metrics = context.intelligence.metrics;
  if (metrics.collected_at && withinWindow(metrics.collected_at, windowStartMs)) {
    if (metrics.growth.new_users_this_week != null) {
      events.push({
        id: "membership:weekly-signups",
        category: "membership",
        title: "Weekly membership snapshot",
        summary: `${metrics.growth.new_users_this_week.toLocaleString()} new members this week.`,
        occurred_at: metrics.collected_at,
        source: "Supabase metrics",
        related_routes: ["/admin/nexus/metrics"],
      });
    }
    if (metrics.blackcard.active_members != null) {
      events.push({
        id: "blackcard:active-snapshot",
        category: "blackcard",
        title: "Blackcard membership snapshot",
        summary: `${metrics.blackcard.active_members.toLocaleString()} active Blackcard members.`,
        occurred_at: metrics.collected_at,
        source: "Blackcard / Stripe",
        related_routes: ["/admin/nexus/metrics"],
      });
    }
  }

  return events
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
    .slice(0, 40);
}

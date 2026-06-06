import type { NexusAlertSummaryRow } from "@/lib/alerts/types";
import type { NexusCommandSummaryRow } from "@/lib/commands/types";
import type { NexusIncidentSummaryRow } from "@/lib/incidents/types";
import type { IntelligenceItem } from "@/lib/intelligence/types";
import type { NexusObservationSummaryRow } from "@/lib/observations/types";

export type PlatformRingStatus = "operational" | "warning" | "critical";

export type FounderBrief = {
  overall_state: string;
  top_focus: string;
  risk_level: "Low" | "Medium" | "High" | "Critical";
  recommended_next_step: string;
};

export type FounderPriority = {
  id: string;
  urgency: "critical" | "high" | "medium" | "low";
  title: string;
  reason: string;
  source: string;
  href: string;
};

export function derivePlatformStatus(input: {
  systemStatus: string;
  missionStatus: string;
  criticalAlerts: number;
  openIncidents: number;
  degradedWorkflows: number;
}): PlatformRingStatus {
  if (
    input.criticalAlerts > 0 ||
    (input.openIncidents > 0 && input.systemStatus === "critical")
  ) {
    return "critical";
  }

  if (
    input.openIncidents > 0 ||
    input.systemStatus !== "operational" ||
    ["degraded", "impaired", "critical", "failing"].includes(input.missionStatus.toLowerCase()) ||
    input.degradedWorkflows > 0
  ) {
    return "warning";
  }

  if (input.systemStatus === "operational") {
    return "operational";
  }

  return "warning";
}

export function deriveFounderBrief(input: {
  platformStatus: PlatformRingStatus;
  criticalAlerts: number;
  openIncidents: number;
  pendingCommands: number;
  newUsersWeek: number | null;
  degradedWorkflows: number;
}): FounderBrief {
  let risk_level: FounderBrief["risk_level"] = "Low";
  if (input.platformStatus === "critical" || input.criticalAlerts > 0) {
    risk_level = "Critical";
  } else if (input.platformStatus === "warning" || input.openIncidents > 0) {
    risk_level = "High";
  } else if (input.degradedWorkflows > 0 || (input.pendingCommands ?? 0) > 0) {
    risk_level = "Medium";
  }

  let overall_state = "Platform operating within normal parameters.";
  if (input.platformStatus === "critical") {
    overall_state = "Platform requires immediate owner attention.";
  } else if (input.platformStatus === "warning") {
    overall_state = "Platform is active with operational friction detected.";
  } else if ((input.newUsersWeek ?? 0) > 0) {
    overall_state = "Community momentum is building while systems remain stable.";
  }

  let top_focus = "Review daily snapshot and intelligence signals.";
  if (input.criticalAlerts > 0) {
    top_focus = "Resolve critical alerts before other work.";
  } else if (input.openIncidents > 0) {
    top_focus = "Triage open incidents and confirm war room coverage.";
  } else if (input.pendingCommands > 0) {
    top_focus = "Review pending command recommendations.";
  } else if (input.degradedWorkflows > 0) {
    top_focus = "Inspect degraded user workflows.";
  }

  let recommended_next_step = "Open Intelligence for supported opportunities.";
  if (input.criticalAlerts > 0) {
    recommended_next_step = "Open Alerts and review critical items.";
  } else if (input.openIncidents > 0) {
    recommended_next_step = "Open Incidents and assign next actions.";
  } else if (input.pendingCommands > 0) {
    recommended_next_step = "Open Commands and approve or dismiss recommendations.";
  }

  return {
    overall_state,
    top_focus,
    risk_level,
    recommended_next_step,
  };
}

export function buildFounderPriorities(input: {
  alerts: NexusAlertSummaryRow[];
  incidents: NexusIncidentSummaryRow[];
  observations: NexusObservationSummaryRow[];
  commands: NexusCommandSummaryRow[];
}): FounderPriority[] {
  const items: FounderPriority[] = [];

  for (const alert of input.alerts) {
    items.push({
      id: `alert:${alert.id}`,
      urgency: alert.severity === "critical" ? "critical" : alert.severity === "warning" ? "high" : "medium",
      title: alert.title,
      reason: alert.message,
      source: "Alert",
      href: `/admin/nexus/alerts`,
    });
  }

  for (const incident of input.incidents) {
    items.push({
      id: `incident:${incident.id}`,
      urgency:
        incident.severity === "critical"
          ? "critical"
          : incident.impact_score >= 75
            ? "high"
            : "medium",
      title: incident.title,
      reason: incident.impact_summary || `Status: ${incident.status}`,
      source: "Incident",
      href: `/admin/nexus/incidents`,
    });
  }

  for (const observation of input.observations) {
    items.push({
      id: `observation:${observation.id}`,
      urgency:
        observation.severity === "critical"
          ? "critical"
          : observation.priority_tier === "high"
            ? "high"
            : "medium",
      title: observation.title,
      reason: observation.summary,
      source: "Insight",
      href: `/admin/nexus/observations`,
    });
  }

  for (const command of input.commands.filter((row) =>
    ["pending_approval", "suggested"].includes(row.status),
  )) {
    items.push({
      id: `command:${command.id}`,
      urgency: command.risk_level === "high" ? "high" : command.status === "pending_approval" ? "high" : "medium",
      title: command.title,
      reason: command.summary,
      source: "Command",
      href: `/admin/nexus/commands/${command.id}`,
    });
  }

  const rank = { critical: 0, high: 1, medium: 2, low: 3 };
  return items.sort((a, b) => rank[a.urgency] - rank[b.urgency]).slice(0, 12);
}

export function extractOpportunities(items: IntelligenceItem[]): IntelligenceItem[] {
  return items.filter((item) => item.category === "opportunity").slice(0, 6);
}

/** Presentation-layer labels for Project Nexus (APIs/routes unchanged). */

export const NEXUS_LABELS = {
  infrastructure: "Infrastructure",
  userWorkflows: "User Workflows",
  workflowHealthScore: "Workflow Health Score",
  workflowStatus: "Workflow Status",
  userWorkflowMonitor: "User Workflow Monitor",
  insights: "Insights",
  insightsCenter: "Insights Center",
  alertsCenter: "Alerts Center",
  incidentsCenter: "Incidents Center",
  operationsOverview: "Operations Overview",
} as const;

const DISPLAY_REPLACEMENTS: Array<[string, string]> = [
  ["Highest Priority Observations", "Top Insights"],
  ["Mission Workflow Reliability", "User Workflow Reliability"],
  ["Mission Health score", NEXUS_LABELS.workflowHealthScore],
  ["Mission Health regressed", "User Workflows regressed"],
  ["Mission Health is", "User Workflows are"],
  ["Mission Health", NEXUS_LABELS.userWorkflows],
  ["Mission Composite", NEXUS_LABELS.workflowHealthScore],
  ["Mission Monitor", NEXUS_LABELS.userWorkflowMonitor],
  ["Mission Control", NEXUS_LABELS.userWorkflowMonitor],
  ["Workflow Monitor", NEXUS_LABELS.userWorkflowMonitor],
  ["Mission Critical", "Critical Workflows"],
  ["Mission critical", "Critical Workflows"],
  ["mission-critical", "critical workflow"],
  ["Mission Score", NEXUS_LABELS.workflowHealthScore],
  ["Mission score", NEXUS_LABELS.workflowHealthScore],
  ["Workflow Score", NEXUS_LABELS.workflowHealthScore],
  ["Workflow score", NEXUS_LABELS.workflowHealthScore],
  ["Mission Status", NEXUS_LABELS.workflowStatus],
  ["Observation Engine", "Insights Engine"],
  ["Nexus observation evaluation", "Nexus insights evaluation"],
  ["Observation expired", "Insight expired"],
  ["Observation superseded", "Insight superseded"],
  ["Observation rule skipped", "Insight rule skipped"],
  ["No active observations", "No active insights"],
  ["Observation Center", NEXUS_LABELS.insightsCenter],
  ["Observation Details", "Insight Details"],
  ["Observation not found", "Insight not found"],
  ["Observations", NEXUS_LABELS.insights],
  ["Observation", "Insight"],
  ["Alert Center", "Alerts"],
  ["Incident Center", "Incidents"],
  ["System Overview", NEXUS_LABELS.operationsOverview],
  ["System Health", NEXUS_LABELS.infrastructure],
  ["System health", NEXUS_LABELS.infrastructure],
  ["Intelligence", NEXUS_LABELS.insights],
  ["Intel", NEXUS_LABELS.insights],
];

export function formatNexusDisplayText(text: string | null | undefined): string {
  if (!text) {
    return "";
  }

  let result = text;
  for (const [from, to] of DISPLAY_REPLACEMENTS) {
    result = result.split(from).join(to);
  }

  return result;
}

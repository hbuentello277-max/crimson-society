/** Presentation-layer labels for Project Nexus (APIs/routes unchanged). */

export const NEXUS_LABELS = {
  infrastructure: "Infrastructure",
  userWorkflows: "Platform Workflows",
  workflowHealthScore: "Platform Score",
  workflowStatus: "Platform Status",
  userWorkflowMonitor: "Platform Workflow Review",
  platformControl: "Platform Control",
  insights: "Insights",
  insightsCenter: "Insights Center",
  alertsCenter: "Alerts Center",
  incidentsCenter: "Incidents Center",
  operationsOverview: "Operations Overview",
} as const;

const DISPLAY_REPLACEMENTS: Array<[string, string]> = [
  ["Founder Mission Control", "Founder Platform Control"],
  ["Mission Workflow Recovery", "Platform Workflow Review"],
  ["User Workflow Recovery", "Activity Opportunity"],
  ["User Workflows are degraded", "Platform activity is quiet"],
  ["User workflows are degraded", "Platform activity is quiet"],
  ["User Workflows remain degraded or warning", "Platform activity remains quiet"],
  ["degraded user workflows", "quiet activity opportunities"],
  ["Degraded or warning workflows", "Quiet activity workflows"],
  ["degraded or warning workflows", "quiet activity workflows"],
  ["Mission health score", "Platform Score"],
  ["Mission Health score", "Platform Score"],
  ["Highest Priority Observations", "Top Insights"],
  ["Mission Workflow Reliability", "Platform Workflow Reliability"],
  ["Mission Health score", NEXUS_LABELS.workflowHealthScore],
  ["Mission Health regressed", "Platform Status changed"],
  ["Mission Health is", "Platform Status is"],
  ["Mission Health", "Platform Status"],
  ["Mission Composite", NEXUS_LABELS.workflowHealthScore],
  ["Mission Monitor", NEXUS_LABELS.userWorkflowMonitor],
  ["Mission Control", NEXUS_LABELS.platformControl],
  ["Workflow Monitor", NEXUS_LABELS.userWorkflowMonitor],
  ["Mission Critical", "Critical Platform Workflows"],
  ["Mission critical", "Critical Platform Workflows"],
  ["mission-critical", "critical platform workflow"],
  ["Mission Score", NEXUS_LABELS.workflowHealthScore],
  ["Mission score", NEXUS_LABELS.workflowHealthScore],
  ["Workflow Score", NEXUS_LABELS.workflowHealthScore],
  ["Workflow score", NEXUS_LABELS.workflowHealthScore],
  ["Mission Status", NEXUS_LABELS.workflowStatus],
  ["Mission status", NEXUS_LABELS.workflowStatus],
  ["mission status", "platform status"],
  ["mission score", "platform score"],
  ["mission health", "platform status"],
  ["mission workflow", "platform workflow"],
  ["Mission workflow", "Platform workflow"],
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

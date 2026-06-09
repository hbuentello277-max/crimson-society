/** Presentation-layer labels for Project Nexus (APIs/routes unchanged). */

export const NEXUS_LABELS = {
  infrastructure: "Infrastructure",
  userWorkflows: "Platform Workflows",
  workflowHealthScore: "Platform Score",
  workflowStatus: "Platform Status",
  userWorkflowMonitor: "Platform Workflow Review",
  platformStatus: "Platform Status",
  platformHealth: "Platform Health",
  platformWorkflow: "Platform Workflow",
  platformCheck: "Platform Check",
  platformTimeline: "Platform Timeline",
  platformJobs: "Platform Jobs",
  platformChecks: "Platform Checks",
  insights: "Insights",
  insightsCenter: "Insights Center",
  alertsCenter: "Alerts Center",
  incidentsCenter: "Incidents Center",
  operationsOverview: "Operations Overview",
} as const;

const DISPLAY_REPLACEMENTS: Array<[string, string]> = [
  ["Founder Mission Control", "Founder Platform Status"],
  ["Founder Platform Control", "Founder Platform Status"],
  ["Mission Workflow Recovery", "Platform Workflow Review"],
  ["User Workflow Recovery", "Activity Opportunity"],
  ["User Workflows are degraded", "Platform activity is quiet"],
  ["User workflows are degraded", "Platform activity is quiet"],
  ["User Workflows remain degraded or warning", "Platform activity remains quiet"],
  ["degraded user workflows", "quiet activity opportunities"],
  ["Degraded or warning workflows", "Quiet activity workflows"],
  ["degraded or warning workflows", "quiet activity workflows"],
  ["Mission health score", NEXUS_LABELS.workflowHealthScore],
  ["Mission Health score", NEXUS_LABELS.workflowHealthScore],
  ["Highest Priority Observations", "Top Insights"],
  ["Mission Workflow Reliability", "Platform Workflow Reliability"],
  ["Mission Health regressed", "Platform Health regressed"],
  ["Mission Health is", "Platform Health is"],
  ["Mission health is", "Platform health is"],
  ["Mission Health", NEXUS_LABELS.platformHealth],
  ["Mission health", NEXUS_LABELS.platformHealth],
  ["Mission Composite", NEXUS_LABELS.workflowHealthScore],
  ["Mission Monitor", NEXUS_LABELS.userWorkflowMonitor],
  ["Platform Control", NEXUS_LABELS.platformStatus],
  ["Mission Control", NEXUS_LABELS.platformStatus],
  ["Workflow Monitor", NEXUS_LABELS.userWorkflowMonitor],
  ["Mission Critical", "Critical Platform Workflows"],
  ["Mission critical", "Critical Platform Workflows"],
  ["mission-critical", "critical platform workflow"],
  ["Mission Timeline", NEXUS_LABELS.platformTimeline],
  ["Mission Check", NEXUS_LABELS.platformCheck],
  ["Mission Score", NEXUS_LABELS.workflowHealthScore],
  ["Mission score", NEXUS_LABELS.workflowHealthScore],
  ["Workflow Score", NEXUS_LABELS.workflowHealthScore],
  ["Workflow score", NEXUS_LABELS.workflowHealthScore],
  ["Mission Status", NEXUS_LABELS.workflowStatus],
  ["Mission status", NEXUS_LABELS.workflowStatus],
  ["Mission Workflow", NEXUS_LABELS.platformWorkflow],
  ["Mission workflow", NEXUS_LABELS.platformWorkflow],
  ["Mission is", "Platform is"],
  ["mission status", "platform status"],
  ["mission score", "platform score"],
  ["mission health", "platform health"],
  ["mission workflow", "platform workflow"],
  ["mission check", "platform check"],
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

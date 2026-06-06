const DISPLAY_REPLACEMENTS: Array<[string, string]> = [
  ["Highest Priority Observations", "Top Insights"],
  ["Mission Workflow Reliability", "User Workflow Reliability"],
  ["Mission Health score", "Workflow Score"],
  ["Mission Health regressed", "User Workflows regressed"],
  ["Mission Health is", "User Workflows are"],
  ["Mission Health", "User Workflows"],
  ["Mission Composite", "Workflow Score"],
  ["Mission Monitor", "Workflow Monitor"],
  ["Mission Control", "Workflow Monitor"],
  ["Mission Critical", "Critical Workflows"],
  ["Mission critical", "Critical Workflows"],
  ["mission-critical", "critical workflow"],
  ["Mission Score", "Workflow Score"],
  ["Mission score", "Workflow Score"],
  ["Mission Status", "Workflow Status"],
  ["Observation Engine", "Insights Engine"],
  ["Nexus observation evaluation", "Nexus insights evaluation"],
  ["Observation expired", "Insight expired"],
  ["Observation superseded", "Insight superseded"],
  ["Observation rule skipped", "Insight rule skipped"],
  ["No active observations", "No active insights"],
  ["Observation Center", "Insights"],
  ["Observation Details", "Insight Details"],
  ["Observation not found", "Insight not found"],
  ["Observations", "Insights"],
  ["Observation", "Insight"],
  ["Alert Center", "Alerts"],
  ["Incident Center", "Incidents"],
  ["System Overview", "Operations Overview"],
  ["System Health", "Infrastructure"],
  ["System health", "Infrastructure"],
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

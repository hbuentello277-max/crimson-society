export const STARTER_QUESTIONS = [
  "What deserves attention today?",
  "Biggest opportunity?",
  "Biggest risk?",
  "Mission summary",
  "Growth forecast",
  "Revenue forecast",
  "Recommended focus",
  "Open incidents",
] as const;

export type StarterQuestion = (typeof STARTER_QUESTIONS)[number];

export const CHAT_SOURCE_ROUTES: Record<string, string> = {
  "Founder Dashboard": "/admin/nexus",
  Reports: "/admin/nexus/reports",
  Briefings: "/admin/nexus/briefings",
  Intelligence: "/admin/nexus/intelligence",
  Memory: "/admin/nexus/memory",
  Correlations: "/admin/nexus/correlations",
  Planning: "/admin/nexus/planning",
  Forecasting: "/admin/nexus/forecasting",
  Copilot: "/admin/nexus/copilot",
  "Operational Intelligence": "/admin/nexus/operational-intelligence",
  "Mission Control": "/admin/nexus/mission-control",
  "Decision Engine": "/admin/nexus/decision-engine",
  Scenarios: "/admin/nexus/scenarios",
  Alerts: "/admin/nexus/alerts",
  Incidents: "/admin/nexus/incidents",
  Commands: "/admin/nexus/commands",
};

export function normalizeChatMessage(message: string): string {
  return message.trim().toLowerCase().replace(/\s+/g, " ");
}

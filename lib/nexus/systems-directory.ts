/**
 * Categorized NEXUS systems directory — all routes remain accessible via NEXUS Systems.
 */

export type NexusSystemsCategory = {
  id: string;
  label: string;
  items: Array<{ href: string; label: string }>;
};

export const NEXUS_PRIMARY_NAV = [
  { href: "/admin/nexus/overview", label: "Overview", aliases: ["/admin/nexus"] },
  { href: "/admin/nexus/copilot", label: "Copilot" },
  { href: "/admin/nexus/automation-studio", label: "Automation", aliases: ["/admin/nexus/automation"] },
  { href: "/admin/nexus/actions", label: "Action Center" },
  { href: "/admin/nexus/intelligence", label: "Intelligence" },
] as const;

export const NEXUS_SYSTEMS_DIRECTORY: NexusSystemsCategory[] = [
  {
    id: "infrastructure",
    label: "Infrastructure",
    items: [
      { href: "/admin/nexus/mission-health", label: "Platform Health" },
      { href: "/admin/nexus/metrics", label: "Metrics" },
      { href: "/admin/nexus/alerts", label: "Alerts" },
      { href: "/admin/nexus/incidents", label: "Incidents" },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      { href: "/admin/nexus/commands", label: "Commands" },
      { href: "/admin/nexus/actions", label: "Actions" },
      { href: "/admin/nexus/reports", label: "Reports" },
      { href: "/admin/nexus/runbooks", label: "Runbooks" },
      { href: "/admin/nexus/operator", label: "Operator" },
      { href: "/admin/nexus/briefings", label: "Briefings" },
      { href: "/admin/nexus/automation", label: "Automation Framework" },
      { href: "/admin/nexus/automation-studio", label: "Automation Studio" },
    ],
  },
  {
    id: "intelligence",
    label: "Intelligence",
    items: [
      { href: "/admin/nexus/intelligence", label: "Intelligence" },
      { href: "/admin/nexus/observations", label: "Insights" },
      { href: "/admin/nexus/correlations", label: "Correlations" },
      { href: "/admin/nexus/operational-intelligence", label: "Operational Intelligence" },
      { href: "/admin/nexus/ai-analysis", label: "AI Analysis" },
    ],
  },
  {
    id: "planning",
    label: "Planning",
    items: [
      { href: "/admin/nexus/planning", label: "Planning" },
      { href: "/admin/nexus/forecasting", label: "Forecasting" },
      { href: "/admin/nexus/decision-engine", label: "Decision Engine" },
      { href: "/admin/nexus/scenarios", label: "Scenarios" },
    ],
  },
  {
    id: "founder_tools",
    label: "Founder Tools",
    items: [
      { href: "/admin/nexus", label: "Founder" },
      { href: "/admin/nexus/copilot", label: "Copilot" },
      { href: "/admin/nexus/copilot", label: "Mobile Copilot" },
      { href: "/admin/nexus/memory", label: "Memory" },
      { href: "/admin/nexus/voice", label: "Voice" },
      { href: "/admin/nexus/chat", label: "Chat" },
    ],
  },
  {
    id: "platform",
    label: "Platform",
    items: [
      { href: "/admin/nexus/mission-control", label: "Platform Status" },
      { href: "/admin/nexus/system-health", label: "Infrastructure" },
      { href: "/admin/nexus/war-rooms", label: "War Rooms" },
    ],
  },
];

export function isPrimaryNavActive(
  pathname: string,
  item: (typeof NEXUS_PRIMARY_NAV)[number],
): boolean {
  const aliases = "aliases" in item && item.aliases ? [...item.aliases, item.href] : [item.href];
  return aliases.some(
    (href) => pathname === href || (href !== "/admin/nexus" && pathname.startsWith(`${href}/`)),
  );
}

export function allSystemsDirectoryHrefs(): string[] {
  const hrefs = new Set<string>();
  for (const category of NEXUS_SYSTEMS_DIRECTORY) {
    for (const item of category.items) {
      hrefs.add(item.href);
    }
  }
  hrefs.add("/admin/nexus/overview");
  return [...hrefs];
}

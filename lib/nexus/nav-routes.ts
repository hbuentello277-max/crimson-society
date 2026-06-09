/**
 * Mark I canonical Nexus navigation order.
 * Icons remain in components/nexus/NexusNavIcons.tsx and NexusShell.tsx.
 */
export const NEXUS_NAV_ROUTES = [
  "/admin/nexus",
  "/admin/nexus/chat",
  "/admin/nexus/voice",
  "/admin/nexus/ai-analysis",
  "/admin/nexus/overview",
  "/admin/nexus/system-health",
  "/admin/nexus/mission-health",
  "/admin/nexus/metrics",
  "/admin/nexus/alerts",
  "/admin/nexus/incidents",
  "/admin/nexus/observations",
  "/admin/nexus/war-rooms",
  "/admin/nexus/runbooks",
  "/admin/nexus/commands",
  "/admin/nexus/actions",
  "/admin/nexus/reports",
  "/admin/nexus/briefings",
  "/admin/nexus/intelligence",
  "/admin/nexus/memory",
  "/admin/nexus/correlations",
  "/admin/nexus/planning",
  "/admin/nexus/automation",
  "/admin/nexus/operator",
  "/admin/nexus/forecasting",
  "/admin/nexus/copilot",
  "/admin/nexus/operational-intelligence",
  "/admin/nexus/mission-control",
  "/admin/nexus/decision-engine",
  "/admin/nexus/scenarios",
] as const;

export const NEXUS_COMMAND_STACK_ROUTES = [
  "/admin/nexus/forecasting",
  "/admin/nexus/copilot",
  "/admin/nexus/operational-intelligence",
  "/admin/nexus/mission-control",
  "/admin/nexus/decision-engine",
  "/admin/nexus/scenarios",
] as const;

export type NexusNavRoute = (typeof NEXUS_NAV_ROUTES)[number];

export function assertNavOrder(items: readonly { href: string }[]): void {
  if (items.length !== NEXUS_NAV_ROUTES.length) {
    throw new Error(
      `Nexus nav item count (${items.length}) does not match canonical order (${NEXUS_NAV_ROUTES.length}).`,
    );
  }

  for (let index = 0; index < items.length; index += 1) {
    if (items[index]?.href !== NEXUS_NAV_ROUTES[index]) {
      throw new Error(
        `Nexus nav mismatch at index ${index}: expected ${NEXUS_NAV_ROUTES[index]}, got ${items[index]?.href}.`,
      );
    }
  }
}

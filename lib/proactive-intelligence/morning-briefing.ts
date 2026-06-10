import type { SupabaseClient } from "@supabase/supabase-js";
import { getOrdersNeedingPickup } from "@/lib/admin/nexus-voice/action-tools";
import { getFounderBriefing } from "@/lib/founder-copilot/briefing";
import { buildFounderPriorityEngine } from "@/lib/proactive-intelligence/priority-engine";
import { detectProactiveAlerts } from "@/lib/proactive-intelligence/proactive-alerts";
import type { MorningBriefing } from "@/lib/proactive-intelligence/types";

function sectionStatus(
  value: "healthy" | "warning" | "critical" | "neutral",
): MorningBriefing["sections"][number]["status"] {
  return value;
}

export async function generateMorningBriefing(admin: SupabaseClient): Promise<MorningBriefing> {
  const [founderBriefing, pickupOrders, proactive] = await Promise.all([
    getFounderBriefing(admin),
    getOrdersNeedingPickup(admin),
    detectProactiveAlerts(admin),
  ]);

  const priorityEngine = await buildFounderPriorityEngine(admin, proactive.alerts);

  const warnings = [
    ...(founderBriefing.warnings ?? []),
    ...(proactive.warnings ?? []),
    ...(pickupOrders.warnings ?? []),
  ];

  const sections = [
    {
      label: "Revenue",
      value: `MRR ${founderBriefing.revenueSummary.estimatedMrr ?? "n/a"} · Today ${founderBriefing.revenueSummary.revenueToday ?? "n/a"}`,
      status: proactive.alerts.some((alert) => alert.category === "revenue_drop")
        ? sectionStatus("warning")
        : sectionStatus("healthy"),
    },
    {
      label: "Blackcard Growth",
      value: `${founderBriefing.blackcardGrowth.activeMembers ?? "n/a"} active · ${founderBriefing.blackcardGrowth.conversionEstimate ?? "n/a"}% conversion`,
      status: sectionStatus("neutral"),
    },
    {
      label: "Active Users",
      value: `${founderBriefing.membershipGrowth.totalUsers ?? "n/a"} total · +${founderBriefing.membershipGrowth.newUsersToday ?? 0} today`,
      status: proactive.alerts.some((alert) => alert.category === "membership")
        ? sectionStatus("warning")
        : sectionStatus("healthy"),
    },
    {
      label: "Open Alerts",
      value: `${founderBriefing.openAlerts.active} active · ${founderBriefing.openAlerts.critical} critical`,
      status:
        founderBriefing.openAlerts.critical > 0
          ? sectionStatus("critical")
          : founderBriefing.openAlerts.active > 0
            ? sectionStatus("warning")
            : sectionStatus("healthy"),
    },
    {
      label: "Pending Reports",
      value: `${founderBriefing.pendingReports} awaiting moderation`,
      status:
        founderBriefing.pendingReports > 5
          ? sectionStatus("warning")
          : sectionStatus("healthy"),
    },
    {
      label: "Pickup Orders",
      value: `${pickupOrders.data.count ?? 0} awaiting pickup`,
      status:
        Number(pickupOrders.data.count ?? 0) > 0 ? sectionStatus("warning") : sectionStatus("healthy"),
    },
    {
      label: "Platform Health",
      value: `${founderBriefing.platformHealth.status} · Platform Score ${founderBriefing.platformHealth.missionScore ?? "n/a"}`,
      status:
        founderBriefing.platformHealth.status === "critical"
          ? sectionStatus("critical")
          : founderBriefing.platformHealth.status === "warning"
            ? sectionStatus("warning")
            : sectionStatus("healthy"),
    },
  ];

  const headline =
    proactive.alerts.length > 0
      ? `${proactive.alerts.length} proactive signal(s) need founder review.`
      : "Platform is stable — review opportunities and growth signals.";

  return {
    generatedAt: new Date().toISOString(),
    headline,
    sections,
    proactiveAlerts: proactive.alerts,
    priority: priorityEngine,
    launchReadiness: priorityEngine.estimatedLaunchReadiness,
    recommendedActions: founderBriefing.recommendedActions,
    readOnly: true,
    partial: founderBriefing.partial || proactive.partial || pickupOrders.partial,
    warnings: warnings.length > 0 ? [...new Set(warnings)] : undefined,
  };
}

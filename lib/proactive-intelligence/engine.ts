import type { SupabaseClient } from "@supabase/supabase-js";
import { generateMorningBriefing } from "@/lib/proactive-intelligence/morning-briefing";
import { buildFounderPriorityEngine } from "@/lib/proactive-intelligence/priority-engine";
import { detectProactiveAlerts } from "@/lib/proactive-intelligence/proactive-alerts";
import { computeLaunchReadiness } from "@/lib/proactive-intelligence/launch-readiness";
import { generateWelcomeBriefing } from "@/lib/proactive-intelligence/welcome-briefing";
import type { ProactiveIntelligenceSummary } from "@/lib/proactive-intelligence/types";

export async function getProactiveIntelligenceSummary(
  admin: SupabaseClient,
): Promise<ProactiveIntelligenceSummary> {
  const proactive = await detectProactiveAlerts(admin);

  const [morningBriefing, welcomeBriefing, priority, launchReadiness] = await Promise.all([
    generateMorningBriefing(admin),
    generateWelcomeBriefing(admin),
    buildFounderPriorityEngine(admin, proactive.alerts),
    computeLaunchReadiness(admin),
  ]);

  const warnings = [
    ...(morningBriefing.warnings ?? []),
    ...(proactive.warnings ?? []),
  ];

  return {
    generatedAt: new Date().toISOString(),
    morningBriefing,
    welcomeBriefing,
    proactiveAlerts: proactive.alerts,
    priority,
    launchReadiness,
    readOnly: true,
    partial: morningBriefing.partial || proactive.partial,
    warnings: warnings.length > 0 ? [...new Set(warnings)] : undefined,
  };
}

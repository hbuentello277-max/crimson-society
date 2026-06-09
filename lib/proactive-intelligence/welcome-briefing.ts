import type { SupabaseClient } from "@supabase/supabase-js";
import { getFounderTimeline } from "@/lib/founder-copilot/timeline";
import { buildFounderPriorityEngine } from "@/lib/proactive-intelligence/priority-engine";
import { detectProactiveAlerts } from "@/lib/proactive-intelligence/proactive-alerts";
import type { WelcomeBriefing } from "@/lib/proactive-intelligence/types";

function greetingForHour(date: Date): string {
  const hour = date.getUTCHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export async function generateWelcomeBriefing(admin: SupabaseClient): Promise<WelcomeBriefing> {
  const [timeline, proactive] = await Promise.all([
    getFounderTimeline(admin),
    detectProactiveAlerts(admin),
  ]);

  const priority = await buildFounderPriorityEngine(admin, proactive.alerts);

  const whatChanged = [
    ...timeline.recentAccomplishments.slice(0, 2).map((entry) => entry.title),
    ...timeline.recentDecisions.slice(0, 2).map((entry) => entry.title),
  ].slice(0, 4);

  if (whatChanged.length === 0) {
    whatChanged.push("No major platform memory events logged since your last visit.");
  }

  const needsAttention = [
    ...proactive.alerts.slice(0, 4).map((alert) => alert.title),
    ...timeline.currentBlockers.slice(0, 2).map((entry) => entry.title),
  ].slice(0, 5);

  if (needsAttention.length === 0) {
    needsAttention.push("No urgent blockers detected — maintain operational rhythm.");
  }

  const recommendedActions = [
    priority.recommendedNextAction?.title,
    priority.highestPriorityIssue?.title,
    priority.highestOpportunity?.title,
    ...timeline.nextActions.slice(0, 2),
  ].filter((value): value is string => Boolean(value));

  const uniqueActions = [...new Set(recommendedActions)].slice(0, 4);
  if (uniqueActions.length === 0) {
    uniqueActions.push("Review Platform Status and clear any open alerts.");
  }

  return {
    generatedAt: new Date().toISOString(),
    greeting: `${greetingForHour(new Date())}, founder.`,
    whatChanged,
    needsAttention,
    recommendedActions: uniqueActions,
    launchReadinessScore: priority.estimatedLaunchReadiness.score,
    readOnly: true,
  };
}

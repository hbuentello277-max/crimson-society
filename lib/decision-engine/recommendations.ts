import type { CopilotSummary } from "@/lib/copilot/types";
import type { CorrelationItem } from "@/lib/correlations/types";
import type { ForecastItem } from "@/lib/forecasting/types";
import type { IntelligenceItem } from "@/lib/intelligence/types";
import type { MissionControlSummary } from "@/lib/mission-control/types";
import type { PlanningSummary } from "@/lib/planning/types";
import {
  computeDecisionScore,
  deriveDecisionPriority,
} from "@/lib/decision-engine/scoring";
import type {
  DecisionCategory,
  DecisionRecommendation,
} from "@/lib/decision-engine/types";
import type { ReportContext } from "@/lib/reports/context";
import { filterDegradedWorkflows } from "@/lib/mission-health/degraded";

type DecisionDraft = Omit<DecisionRecommendation, "decision_score" | "priority" | "generated_at">;

const CATEGORY_ROUTES: Record<DecisionCategory, string[]> = {
  growth: ["/admin/nexus/forecasting", "/admin/nexus/planning"],
  revenue: ["/admin/nexus/reports", "/admin/nexus/forecasting"],
  engagement: ["/admin/nexus/metrics", "/admin/nexus/correlations"],
  community: ["/admin/nexus/intelligence", "/admin/nexus/memory"],
  operations: ["/admin/nexus/overview", "/admin/nexus/mission-health"],
  risk: ["/admin/nexus/alerts", "/admin/nexus/incidents"],
  blackcard: ["/admin/nexus/metrics", "/admin/nexus/planning"],
  platform_health: ["/admin/nexus/system-health", "/admin/nexus/mission-health"],
};

function mapPlanningCategory(category: string): DecisionCategory {
  if (category === "community") return "community";
  if (category === "operations") return "operations";
  if (category === "risk") return "risk";
  if (category === "revenue") return "revenue";
  if (category === "engagement") return "engagement";
  return "growth";
}

function mapIntelligenceCategory(category: string): DecisionCategory {
  if (category === "operations") return "operations";
  if (category === "risk") return "risk";
  if (category === "revenue") return "revenue";
  if (category === "engagement") return "engagement";
  if (category === "opportunity") return "growth";
  return "growth";
}

function mapForecastCategory(category: string): DecisionCategory {
  if (category === "blackcard") return "blackcard";
  if (category === "revenue") return "revenue";
  if (category === "engagement") return "engagement";
  if (category === "operational") return "operations";
  if (category === "risk") return "risk";
  return "growth";
}

function urgencyFromPlanning(urgency?: string): number {
  if (urgency === "critical") return 92;
  if (urgency === "high") return 78;
  if (urgency === "medium") return 55;
  return 35;
}

function strategicImportance(input: {
  missionScore: number;
  missionStatus: string;
  category: DecisionCategory;
  isPrimaryFocus?: boolean;
}): number {
  let score = 50;

  if (input.missionStatus === "critical") score += 30;
  else if (input.missionStatus === "at_risk") score += 20;
  else if (input.missionStatus === "dominating") score += 10;

  if (input.missionScore < 55) score += 15;
  else if (input.missionScore >= 80) score += 8;

  if (input.category === "risk" || input.category === "platform_health") score += 10;
  if (input.isPrimaryFocus) score += 15;

  return Math.min(100, score);
}

function finalizeDecision(draft: DecisionDraft, generatedAt: string): DecisionRecommendation {
  const decision_score = computeDecisionScore({
    expected_impact: draft.expected_impact,
    urgency_score: draft.urgency_score,
    confidence_score: draft.confidence_score,
    strategic_importance: draft.strategic_importance,
  });

  return {
    ...draft,
    decision_score,
    priority: deriveDecisionPriority({
      decision_score,
      urgency_score: draft.urgency_score,
      expected_impact: draft.expected_impact,
      category: draft.category,
    }),
    generated_at: generatedAt,
  };
}

function dedupeDecisions(decisions: DecisionRecommendation[]): DecisionRecommendation[] {
  const seen = new Set<string>();
  const result: DecisionRecommendation[] = [];

  for (const decision of decisions) {
    const key = `${decision.category}:${decision.title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(decision);
  }

  return result;
}

function buildMissionControlDecisions(
  mission: MissionControlSummary,
  generatedAt: string,
): DecisionRecommendation[] {
  const drafts: DecisionDraft[] = [];

  if (mission.mission_status === "critical" || mission.mission_status === "at_risk") {
    drafts.push({
      id: "decision:mission:stabilize",
      category: "risk",
      title: "Stabilize mission-critical signals",
      summary: `Mission status is ${mission.mission_status} with score ${mission.mission_score}.`,
      reasoning: `Mission Control reports ${mission.top_threat} as the primary threat.`,
      expected_impact: 90,
      confidence_score: 85,
      urgency_score: mission.mission_status === "critical" ? 95 : 80,
      effort_score: 65,
      recommendation: `Address ${mission.primary_focus} before expanding initiatives.`,
      related_routes: ["/admin/nexus/mission-control", "/admin/nexus/alerts"],
      strategic_importance: strategicImportance({
        missionScore: mission.mission_score,
        missionStatus: mission.mission_status,
        category: "risk",
        isPrimaryFocus: true,
      }),
    });
  }

  for (const threat of mission.threats.slice(0, 3)) {
    drafts.push({
      id: `decision:mission-threat:${threat.id}`,
      category: "risk",
      title: threat.title,
      summary: threat.summary,
      reasoning: `Ranked ${threat.severity} threat from Mission Control aggregation.`,
      expected_impact: threat.severity === "critical" ? 92 : threat.severity === "high" ? 80 : 65,
      confidence_score: 78,
      urgency_score:
        threat.severity === "critical" ? 95 : threat.severity === "high" ? 82 : 60,
      effort_score: 55,
      recommendation: threat.recommendation,
      related_routes: threat.related_routes.length > 0 ? threat.related_routes : CATEGORY_ROUTES.risk,
      strategic_importance: strategicImportance({
        missionScore: mission.mission_score,
        missionStatus: mission.mission_status,
        category: "risk",
      }),
    });
  }

  for (const accelerator of mission.accelerators.slice(0, 2)) {
    drafts.push({
      id: `decision:mission-accelerator:${accelerator.id}`,
      category: "growth",
      title: `Accelerate ${accelerator.label}`,
      summary: accelerator.summary,
      reasoning: "Mission Control identified this as a mission accelerator.",
      expected_impact: Math.min(95, accelerator.influence_score + 10),
      confidence_score: 72,
      urgency_score: 55,
      effort_score: 40,
      recommendation: `Double down on ${accelerator.label.toLowerCase()} while momentum is positive.`,
      related_routes:
        accelerator.related_routes.length > 0 ? accelerator.related_routes : CATEGORY_ROUTES.growth,
      strategic_importance: strategicImportance({
        missionScore: mission.mission_score,
        missionStatus: mission.mission_status,
        category: "growth",
      }),
    });
  }

  return drafts.map((draft) => finalizeDecision(draft, generatedAt));
}

function buildPlanningDecisions(planning: PlanningSummary, generatedAt: string): DecisionRecommendation[] {
  const drafts: DecisionDraft[] = [];

  for (const priority of planning.priorities.slice(0, 4)) {
    drafts.push({
      id: `decision:planning-priority:${priority.id}`,
      category: mapPlanningCategory(priority.category),
      title: priority.title,
      summary: priority.summary,
      reasoning: "Planning priority ranked for founder attention.",
      expected_impact: priority.impact_score,
      confidence_score: priority.confidence_score,
      urgency_score: urgencyFromPlanning(priority.urgency),
      effort_score: 50,
      recommendation: priority.recommendation,
      related_routes:
        priority.related_routes.length > 0
          ? priority.related_routes
          : CATEGORY_ROUTES[mapPlanningCategory(priority.category)],
      strategic_importance: strategicImportance({
        missionScore: 70,
        missionStatus: "stable",
        category: mapPlanningCategory(priority.category),
        isPrimaryFocus: true,
      }),
    });
  }

  for (const opportunity of planning.opportunities.slice(0, 3)) {
    drafts.push({
      id: `decision:planning-opportunity:${opportunity.id}`,
      category: mapPlanningCategory(opportunity.category),
      title: opportunity.title,
      summary: opportunity.summary,
      reasoning: "Planning opportunity with supported impact and confidence scores.",
      expected_impact: opportunity.impact_score,
      confidence_score: opportunity.confidence_score,
      urgency_score: 50,
      effort_score: 45,
      recommendation: opportunity.recommendation,
      related_routes:
        opportunity.related_routes.length > 0
          ? opportunity.related_routes
          : CATEGORY_ROUTES[mapPlanningCategory(opportunity.category)],
      strategic_importance: strategicImportance({
        missionScore: 70,
        missionStatus: "stable",
        category: mapPlanningCategory(opportunity.category),
      }),
    });
  }

  for (const risk of planning.risks.slice(0, 3)) {
    drafts.push({
      id: `decision:planning-risk:${risk.id}`,
      category: "risk",
      title: risk.title,
      summary: risk.summary,
      reasoning: "Planning risk requires founder mitigation decision.",
      expected_impact: risk.impact_score,
      confidence_score: risk.confidence_score,
      urgency_score: Math.min(95, risk.impact_score),
      effort_score: 60,
      recommendation: risk.recommendation,
      related_routes: risk.related_routes.length > 0 ? risk.related_routes : CATEGORY_ROUTES.risk,
      strategic_importance: strategicImportance({
        missionScore: 60,
        missionStatus: "at_risk",
        category: "risk",
      }),
    });
  }

  return drafts.map((draft) => finalizeDecision(draft, generatedAt));
}

function buildForecastDecisions(
  forecasts: ForecastItem[],
  generatedAt: string,
  input: { engagementStrong: boolean; growthSlowing: boolean },
): DecisionRecommendation[] {
  const drafts: DecisionDraft[] = [];

  for (const forecast of forecasts) {
    if (!forecast.available) continue;

    const category = mapForecastCategory(forecast.category);
    const isSlowing = forecast.risk_score >= 60;
    const isRisky = forecast.risk_score >= 75;

    if (category === "growth" && input.growthSlowing && input.engagementStrong) {
      drafts.push({
        id: "decision:forecast:growth-onboarding",
        category: "growth",
        title: "Increase rider onboarding",
        summary: "Growth forecast is slowing while engagement signals remain strong.",
        reasoning: "Growth forecast slowing while engagement remains strong.",
        expected_impact: 82,
        confidence_score: forecast.confidence_score ?? 65,
        urgency_score: 68,
        effort_score: 42,
        recommendation: "Focus on new member acquisition.",
        related_routes: ["/admin/nexus/forecasting", "/admin/nexus/planning"],
        strategic_importance: 72,
      });
    }

    if (category === "blackcard" && input.engagementStrong) {
      drafts.push({
        id: "decision:forecast:blackcard-conversion",
        category: "blackcard",
        title: "Promote Blackcard conversion",
        summary: "Engagement is increasing faster than membership conversion.",
        reasoning: "Engagement is increasing faster than membership conversion.",
        expected_impact: 78,
        confidence_score: forecast.confidence_score ?? 62,
        urgency_score: 58,
        effort_score: 38,
        recommendation: "Highlight Blackcard benefits.",
        related_routes: ["/admin/nexus/metrics", "/admin/nexus/planning"],
        strategic_importance: 68,
      });
    }

    if (isRisky) {
      drafts.push({
        id: `decision:forecast-risk:${forecast.id}`,
        category: category === "operations" ? "operations" : "risk",
        title: `Respond to ${forecast.title}`,
        summary: forecast.recommendation,
        reasoning: `Forecast risk score ${forecast.risk_score} for ${forecast.category}.`,
        expected_impact: Math.min(95, forecast.risk_score + 10),
        confidence_score: forecast.confidence_score ?? 60,
        urgency_score: Math.min(90, forecast.risk_score),
        effort_score: 55,
        recommendation: forecast.recommendation,
        related_routes: CATEGORY_ROUTES[category],
        strategic_importance: strategicImportance({
          missionScore: 55,
          missionStatus: "at_risk",
          category: category === "operations" ? "operations" : "risk",
        }),
      });
    } else if (isSlowing) {
      drafts.push({
        id: `decision:forecast:${forecast.id}`,
        category,
        title: forecast.title,
        summary: forecast.recommendation,
        reasoning: `Forecast indicates elevated risk (${forecast.risk_score}) in ${forecast.category}.`,
        expected_impact: 70,
        confidence_score: forecast.confidence_score ?? 58,
        urgency_score: 52,
        effort_score: 48,
        recommendation: forecast.recommendation,
        related_routes: CATEGORY_ROUTES[category],
        strategic_importance: strategicImportance({
          missionScore: 65,
          missionStatus: "stable",
          category,
        }),
      });
    }
  }

  return drafts.map((draft) => finalizeDecision(draft, generatedAt));
}

function buildCopilotDecisions(copilot: CopilotSummary, generatedAt: string): DecisionRecommendation[] {
  const drafts: DecisionDraft[] = [];

  if (copilot.top_risk) {
    drafts.push({
      id: "decision:copilot:top-risk",
      category: "risk",
      title: copilot.top_risk.title,
      summary: copilot.top_risk.summary,
      reasoning: "Copilot ranked this as the largest active risk.",
      expected_impact:
        copilot.top_risk.severity === "critical"
          ? 92
          : copilot.top_risk.severity === "high"
            ? 80
            : 65,
      confidence_score: 75,
      urgency_score:
        copilot.top_risk.severity === "critical"
          ? 94
          : copilot.top_risk.severity === "high"
            ? 80
            : 62,
      effort_score: 58,
      recommendation: copilot.top_risk.recommendation,
      related_routes: [copilot.top_risk.related_route, "/admin/nexus/copilot"],
      strategic_importance: 80,
    });
  }

  if (copilot.top_opportunity) {
    drafts.push({
      id: "decision:copilot:top-opportunity",
      category: "growth",
      title: copilot.top_opportunity.title,
      summary: copilot.top_opportunity.summary,
      reasoning: "Copilot ranked this as the largest supported opportunity.",
      expected_impact: copilot.top_opportunity.impact_score,
      confidence_score: copilot.top_opportunity.confidence_score,
      urgency_score: 55,
      effort_score: 40,
      recommendation: copilot.top_opportunity.recommendation,
      related_routes: [copilot.top_opportunity.related_route, "/admin/nexus/copilot"],
      strategic_importance: 70,
    });
  }

  for (const focus of copilot.daily_focus.slice(0, 2)) {
    drafts.push({
      id: `decision:copilot-focus:${focus.id}`,
      category: focus.urgency === "critical" || focus.urgency === "high" ? "risk" : "operations",
      title: focus.title,
      summary: focus.reason,
      reasoning: "Copilot daily focus item for founder attention.",
      expected_impact: focus.urgency === "critical" ? 88 : focus.urgency === "high" ? 75 : 60,
      confidence_score: 70,
      urgency_score: urgencyFromPlanning(focus.urgency),
      effort_score: 45,
      recommendation: `Review ${focus.related_route.replace("/admin/nexus/", "")} and act on: ${focus.title}.`,
      related_routes: [focus.related_route, "/admin/nexus/copilot"],
      strategic_importance: 65,
    });
  }

  return drafts.map((draft) => finalizeDecision(draft, generatedAt));
}

function buildIntelligenceDecisions(
  items: IntelligenceItem[],
  generatedAt: string,
): DecisionRecommendation[] {
  const drafts: DecisionDraft[] = items.slice(0, 4).map((item) => ({
    id: `decision:intelligence:${item.id}`,
    category: mapIntelligenceCategory(item.category),
    title: item.title,
    summary: item.summary,
    reasoning: "Intelligence signal with impact and confidence scoring.",
    expected_impact: item.impact_score,
    confidence_score: item.confidence_score,
    urgency_score: item.impact_score >= 80 ? 72 : 50,
    effort_score: 48,
    recommendation: item.recommendation,
    related_routes: CATEGORY_ROUTES[mapIntelligenceCategory(item.category)],
    strategic_importance: strategicImportance({
      missionScore: 65,
      missionStatus: "stable",
      category: mapIntelligenceCategory(item.category),
    }),
  }));

  return drafts.map((draft) => finalizeDecision(draft, generatedAt));
}

function buildCorrelationDecisions(
  correlations: CorrelationItem[],
  generatedAt: string,
): DecisionRecommendation[] {
  const drafts: DecisionDraft[] = correlations.slice(0, 4).map((item) => ({
    id: `decision:correlation:${item.id}`,
    category: item.category as DecisionCategory,
    title: item.title,
    summary: item.summary,
    reasoning: `Correlation detected across ${item.signals.length} signals in ${item.time_window} window.`,
    expected_impact: item.impact_score,
    confidence_score: item.confidence_score,
    urgency_score: item.impact_score >= 75 ? 68 : 48,
    effort_score: 50,
    recommendation: item.recommendation,
    related_routes:
      item.related_routes.length > 0 ? item.related_routes : CATEGORY_ROUTES[item.category as DecisionCategory],
    strategic_importance: strategicImportance({
      missionScore: 65,
      missionStatus: "stable",
      category: item.category as DecisionCategory,
    }),
  }));

  return drafts.map((draft) => finalizeDecision(draft, generatedAt));
}

function buildReportDecisions(report: ReportContext, generatedAt: string): DecisionRecommendation[] {
  const drafts: DecisionDraft[] = [];
  const degraded = filterDegradedWorkflows(report.mission.workflows);

  if (degraded.length > 0 || (report.mission.score ?? 100) < 65) {
    drafts.push({
      id: "decision:report:workflow-degradation",
      category: "operations",
      title: "Investigate workflow degradation",
      summary: `${degraded.length} workflow(s) below target; mission workflow score ${report.mission.score ?? "unknown"}.`,
      reasoning: "Workflow health remains below target.",
      expected_impact: 85,
      confidence_score: 82,
      urgency_score: degraded.some((w) => w.workflow_status === "failing") ? 88 : 72,
      effort_score: 68,
      recommendation: "Review workflow diagnostics.",
      related_routes: ["/admin/nexus/mission-health", "/admin/nexus/workflows"],
      strategic_importance: strategicImportance({
        missionScore: report.mission.score ?? 50,
        missionStatus: report.health.systemStatus === "critical" ? "critical" : "at_risk",
        category: "operations",
      }),
    });
  }

  if ((report.alerts.counts.critical ?? 0) > 0) {
    drafts.push({
      id: "decision:report:critical-alerts",
      category: "risk",
      title: "Resolve critical alerts",
      summary: `${report.alerts.counts.critical} critical alert(s) require founder attention.`,
      reasoning: "Active critical alerts threaten platform stability.",
      expected_impact: 93,
      confidence_score: 88,
      urgency_score: 96,
      effort_score: 55,
      recommendation: "Review and resolve critical alerts before strategic initiatives.",
      related_routes: ["/admin/nexus/alerts"],
      strategic_importance: 90,
    });
  }

  if (report.incidents.open.length > 0) {
    drafts.push({
      id: "decision:report:open-incidents",
      category: "risk",
      title: "Address open incidents",
      summary: `${report.incidents.open.length} open incident(s) affect operational confidence.`,
      reasoning: "Open incidents increase mission risk and founder attention load.",
      expected_impact: 88,
      confidence_score: 85,
      urgency_score: 85,
      effort_score: 62,
      recommendation: "Triage open incidents and confirm mitigation paths.",
      related_routes: ["/admin/nexus/incidents"],
      strategic_importance: 85,
    });
  }

  if (report.health.systemStatus !== "operational") {
    drafts.push({
      id: "decision:report:platform-health",
      category: "platform_health",
      title: "Restore platform health",
      summary: `System status is ${report.health.systemStatus}.`,
      reasoning: "Platform health is below operational baseline.",
      expected_impact: 90,
      confidence_score: 80,
      urgency_score: 88,
      effort_score: 70,
      recommendation: "Review system health integrations and restore operational status.",
      related_routes: ["/admin/nexus/system-health", "/admin/nexus/overview"],
      strategic_importance: 88,
    });
  }

  const pendingCommands =
    (report.commands.counts.pending_approval ?? 0) + (report.commands.counts.suggested ?? 0);

  if (pendingCommands > 0) {
    drafts.push({
      id: "decision:report:pending-commands",
      category: "operations",
      title: "Review pending commands",
      summary: `${pendingCommands} command(s) await founder review.`,
      reasoning: "Pending commands may block operational improvements.",
      expected_impact: 65,
      confidence_score: 75,
      urgency_score: 58,
      effort_score: 30,
      recommendation: "Review suggested and pending-approval commands.",
      related_routes: ["/admin/nexus/commands"],
      strategic_importance: 55,
    });
  }

  return drafts.map((draft) => finalizeDecision(draft, generatedAt));
}

function buildMemoryDecisions(
  entries: Array<{ id: string; title: string; summary: string; importance_score: number; entry_type: string }>,
  generatedAt: string,
): DecisionRecommendation[] {
  const notable = entries.filter((entry) => entry.importance_score >= 7).slice(0, 2);

  const drafts: DecisionDraft[] = notable.map((entry) => ({
    id: `decision:memory:${entry.id}`,
    category: entry.entry_type === "incident" ? "risk" : "community",
    title: `Review memory signal: ${entry.title}`,
    summary: entry.summary,
    reasoning: `High-importance memory entry (score ${entry.importance_score}).`,
    expected_impact: Math.min(85, entry.importance_score * 10),
    confidence_score: 65,
    urgency_score: entry.entry_type === "incident" ? 75 : 45,
    effort_score: 35,
    recommendation: "Review linked memory context before making related strategic decisions.",
    related_routes: ["/admin/nexus/memory"],
    strategic_importance: 58,
  }));

  return drafts.map((draft) => finalizeDecision(draft, generatedAt));
}

export function buildDecisionRecommendations(input: {
  mission: MissionControlSummary;
  planning: PlanningSummary;
  forecasts: ForecastItem[];
  copilot: CopilotSummary;
  intelligence: IntelligenceItem[];
  correlations: CorrelationItem[];
  report: ReportContext;
  memoryEntries: Array<{
    id: string;
    title: string;
    summary: string;
    importance_score: number;
    entry_type: string;
  }>;
  generatedAt: string;
  trendSignals: {
    growthSlowing: boolean;
    engagementStrong: boolean;
  };
}): DecisionRecommendation[] {
  const decisions = [
    ...buildMissionControlDecisions(input.mission, input.generatedAt),
    ...buildPlanningDecisions(input.planning, input.generatedAt),
    ...buildForecastDecisions(input.forecasts, input.generatedAt, input.trendSignals),
    ...buildCopilotDecisions(input.copilot, input.generatedAt),
    ...buildIntelligenceDecisions(input.intelligence, input.generatedAt),
    ...buildCorrelationDecisions(input.correlations, input.generatedAt),
    ...buildReportDecisions(input.report, input.generatedAt),
    ...buildMemoryDecisions(input.memoryEntries, input.generatedAt),
  ];

  return dedupeDecisions(decisions);
}

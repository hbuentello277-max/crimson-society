import type { SupabaseClient } from "@supabase/supabase-js";
import { loadChatContext } from "@/lib/chat/context";
import { routeChatMessage } from "@/lib/chat/router";
import type { ChatAnswer, ChatIntent, ChatMode, ChatSource } from "@/lib/chat/types";

const DATA_UNAVAILABLE = "Data unavailable.";

function uniqueRoutes(routes: string[]): string[] {
  return [...new Set(routes.filter(Boolean))];
}

function uniqueSources(sources: ChatSource[]): ChatSource[] {
  return [...new Set(sources)];
}

function averageConfidence(values: Array<number | null | undefined>, fallback = 72): number {
  const valid = values.filter((value): value is number => typeof value === "number" && !Number.isNaN(value));
  if (valid.length === 0) {
    return fallback;
  }
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

function formatScoreBreakdown(breakdown: Record<string, number>): string {
  const entries = Object.entries(breakdown)
    .filter(([, value]) => typeof value === "number")
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  if (entries.length === 0) {
    return "";
  }

  return entries.map(([key, value]) => `${key.replace(/_/g, " ")} ${Math.round(value)}`).join(", ");
}

type ChatContext = Awaited<ReturnType<typeof loadChatContext>>;

function topThreatLine(context: ChatContext): string | null {
  const threat =
    context.mission.threats[0]?.title ||
    context.mission.top_threat ||
    context.copilot.top_risk?.title ||
    context.decisions.brief.biggest_risk;

  if (!threat || threat.toLowerCase().includes("no major") || threat.toLowerCase().includes("no critical")) {
    return null;
  }

  return threat;
}

function topOpportunityLine(context: ChatContext): string | null {
  const opportunity =
    context.mission.top_opportunity ||
    context.copilot.top_opportunity?.title ||
    context.decisions.brief.biggest_opportunity ||
    context.planning.brief.biggest_opportunity;

  if (
    !opportunity ||
    opportunity.toLowerCase().includes("no major") ||
    opportunity.toLowerCase().includes("no supported")
  ) {
    return null;
  }

  return opportunity;
}

function buildAttentionAnswer(context: ChatContext): ChatAnswer {
  const primary =
    context.copilot.guidance.primary_focus ||
    context.mission.primary_focus ||
    context.planning.brief.primary_focus;

  const threat = topThreatLine(context);
  const openIncidents = context.report.incidents.open.length;
  const criticalAlerts = context.report.alerts.counts.critical ?? 0;

  let answer: string;
  if (threat) {
    answer = `Platform Control identifies "${threat}" as the highest-priority item. Primary focus: ${primary}.`;
  } else if (openIncidents > 0) {
    answer = `${openIncidents} open incident${openIncidents === 1 ? "" : "s"} require review. Primary focus: ${primary}.`;
  } else if (criticalAlerts > 0) {
    answer = `${criticalAlerts} critical alert${criticalAlerts === 1 ? "" : "s"} are active. Primary focus: ${primary}.`;
  } else {
    answer = `Platform is stable. Primary focus today: ${primary}. Secondary: ${context.copilot.guidance.secondary_focus || context.mission.secondary_focus}.`;
  }

  return {
    answer,
    sources: uniqueSources(["Platform Control", "Copilot", "Planning", "Alerts", "Incidents"]),
    related_routes: uniqueRoutes([
      "/admin/nexus/mission-control",
      "/admin/nexus/copilot",
      "/admin/nexus/planning",
      "/admin/nexus/alerts",
      "/admin/nexus/incidents",
    ]),
    confidence: averageConfidence([
      context.copilot.top_risk ? 88 : 82,
      context.mission.mission_score,
      context.planning.brief.primary_focus ? 85 : 70,
    ]),
  };
}

function buildBiggestRiskAnswer(context: ChatContext): ChatAnswer {
  const threat = topThreatLine(context);
  const missionThreat = context.mission.threats[0];
  const planningRisk = context.planning.risks[0];
  const riskItem = planningRisk ?? missionThreat;

  if (!threat && !riskItem) {
    return {
      answer: "No major active risk pattern detected from current Nexus data.",
      sources: uniqueSources(["Platform Control", "Copilot", "Planning", "Operational Intelligence"]),
      related_routes: uniqueRoutes([
        "/admin/nexus/mission-control",
        "/admin/nexus/copilot",
        "/admin/nexus/planning",
      ]),
      confidence: 78,
    };
  }

  const title = threat || planningRisk?.title || missionThreat?.title || "Unknown risk";
  const summary = planningRisk?.summary || missionThreat?.summary || context.copilot.top_risk?.summary || "";
  const answer = summary ? `Biggest risk: ${title}. ${summary}` : `Biggest risk: ${title}.`;

  return {
    answer,
    sources: uniqueSources([
      "Platform Control",
      "Copilot",
      "Planning",
      "Operational Intelligence",
      "Decision Engine",
    ]),
    related_routes: uniqueRoutes([
      "/admin/nexus/mission-control",
      "/admin/nexus/copilot",
      "/admin/nexus/planning",
      "/admin/nexus/decision-engine",
      ...(planningRisk?.related_routes ?? missionThreat?.related_routes ?? []),
    ]),
    confidence: averageConfidence([
      planningRisk?.confidence_score,
      context.copilot.top_risk ? 90 : 80,
      context.mission.mission_score,
    ]),
  };
}

function buildBiggestOpportunityAnswer(context: ChatContext): ChatAnswer {
  const opportunity = topOpportunityLine(context);
  const oppItem = context.planning.opportunities[0];

  if (!opportunity && !oppItem) {
    return {
      answer: "No supported opportunity detected from current Nexus data.",
      sources: uniqueSources(["Platform Control", "Copilot", "Planning", "Scenarios"]),
      related_routes: uniqueRoutes([
        "/admin/nexus/mission-control",
        "/admin/nexus/copilot",
        "/admin/nexus/planning",
        "/admin/nexus/scenarios",
      ]),
      confidence: 76,
    };
  }

  const summary = oppItem?.summary || context.copilot.top_opportunity?.summary || "";
  const answer = summary
    ? `Biggest opportunity: ${opportunity || oppItem?.title}. ${summary}`
    : `Biggest opportunity: ${opportunity || oppItem?.title}.`;

  return {
    answer,
    sources: uniqueSources(["Platform Control", "Copilot", "Planning", "Decision Engine", "Scenarios"]),
    related_routes: uniqueRoutes([
      "/admin/nexus/mission-control",
      "/admin/nexus/copilot",
      "/admin/nexus/planning",
      "/admin/nexus/scenarios",
      ...(oppItem?.related_routes ?? []),
    ]),
    confidence: averageConfidence([
      oppItem?.confidence_score,
      context.copilot.top_opportunity?.confidence_score,
      context.scenarios.rankings.best_overall?.confidence_score,
    ]),
  };
}

function buildWeeklySummaryAnswer(context: ChatContext): ChatAnswer {
  const briefing = context.weekly_briefing;
  if (!briefing.headline) {
    return {
      answer: DATA_UNAVAILABLE,
      sources: uniqueSources(["Briefings", "Reports"]),
      related_routes: ["/admin/nexus/briefings", "/admin/nexus/reports"],
      confidence: 40,
    };
  }

  const lines = [
    briefing.community_summary.lines[0],
    briefing.revenue_summary.lines[0],
    briefing.engagement_summary.lines[0],
    briefing.operations_summary.lines[0],
  ].filter(Boolean);

  const answer = `${briefing.headline}${lines.length > 0 ? ` ${lines.join(" ")}` : ""}`;

  return {
    answer,
    sources: uniqueSources(["Briefings", "Reports"]),
    related_routes: uniqueRoutes(["/admin/nexus/briefings", "/admin/nexus/reports", "/admin/nexus/metrics"]),
    confidence: 86,
  };
}

function buildChangesAnswer(context: ChatContext): ChatAnswer {
  const snapshot = context.executive.snapshot;
  const trendLines = context.executive.engagement_intelligence.activity_trends.slice(0, 4);

  if (trendLines.length === 0 && snapshot.new_users_this_week == null) {
    return {
      answer: DATA_UNAVAILABLE,
      sources: uniqueSources(["Reports", "Memory"]),
      related_routes: ["/admin/nexus/reports", "/admin/nexus/metrics"],
      confidence: 45,
    };
  }

  const answer = [
    `New users this week: ${snapshot.new_users_this_week ?? "unknown"}.`,
    `Open alerts: ${snapshot.open_alerts ?? 0}, open incidents: ${snapshot.open_incidents ?? 0}.`,
    trendLines.length > 0 ? `Trend shifts: ${trendLines.join("; ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    answer,
    sources: uniqueSources(["Reports", "Briefings", "Memory"]),
    related_routes: uniqueRoutes(["/admin/nexus/reports", "/admin/nexus/metrics", "/admin/nexus/briefings"]),
    confidence: 84,
  };
}

function buildBlackcardAnswer(context: ChatContext): ChatAnswer {
  const activeMembers = context.report.metrics.blackcard.active_members;
  const forecast = context.forecasting.forecasts.find((item) => item.category === "blackcard");

  if (activeMembers == null && !forecast?.available) {
    return {
      answer: DATA_UNAVAILABLE,
      sources: uniqueSources(["Reports", "Forecasting"]),
      related_routes: ["/admin/nexus/metrics", "/admin/nexus/forecasting"],
      confidence: 42,
    };
  }

  const parts: string[] = [];
  if (activeMembers != null) {
    parts.push(`Blackcard active members: ${activeMembers}.`);
  }
  if (forecast?.available) {
    parts.push(
      `30-day projection: ${forecast.projected_30d}. Risk score ${forecast.risk_score}. ${forecast.recommendation}`,
    );
  } else if (forecast) {
    parts.push(forecast.recommendation);
  }

  return {
    answer: parts.join(" "),
    sources: uniqueSources(["Reports", "Forecasting", "Planning"]),
    related_routes: uniqueRoutes(["/admin/nexus/metrics", "/admin/nexus/forecasting", "/admin/nexus/planning"]),
    confidence: averageConfidence([forecast?.confidence_score, activeMembers != null ? 88 : 60]),
  };
}

function buildMissionScoreAnswer(context: ChatContext): ChatAnswer {
  const { mission_score, mission_status, score_breakdown, mission_summary } = context.mission;
  const breakdown = formatScoreBreakdown(score_breakdown);

  const lowest = Object.entries(score_breakdown)
    .filter(([key]) => !key.includes("penalty"))
    .sort(([, a], [, b]) => a - b)[0];

  let reason = "";
  if (lowest && lowest[1] < 60) {
    reason = ` Weakest component: ${lowest[0].replace(/_/g, " ")} (${Math.round(lowest[1])}).`;
  } else if ((context.report.alerts.counts.critical ?? 0) > 0) {
    reason = " Critical alerts are weighing on the score.";
  } else if (context.report.incidents.open.length > 0) {
    reason = " Open incidents are affecting platform status.";
  }

  const answer = `Mission score is ${mission_score} (${mission_status.replace(/_/g, " ")}). ${mission_summary}${reason}${breakdown ? ` Breakdown highlights: ${breakdown}.` : ""}`;

  return {
    answer,
    sources: uniqueSources(["Platform Control", "Reports", "Operational Intelligence"]),
    related_routes: uniqueRoutes([
      "/admin/nexus/mission-control",
      "/admin/nexus/mission-health",
      "/admin/nexus/alerts",
    ]),
    confidence: 89,
  };
}

function buildNexusRecommendationAnswer(context: ChatContext): ChatAnswer {
  const recommendation =
    context.decisions.brief.founder_recommendation ||
    context.decisions.brief.best_decision_now ||
    context.copilot.guidance.recommended_next_step;

  const top = context.decisions.top_recommended[0];

  if (!recommendation && !top) {
    return {
      answer: DATA_UNAVAILABLE,
      sources: uniqueSources(["Decision Engine", "Copilot", "Planning"]),
      related_routes: ["/admin/nexus/decision-engine", "/admin/nexus/copilot"],
      confidence: 44,
    };
  }

  const answer = top ? `Nexus recommends: ${top.title}. ${top.recommendation}` : recommendation;

  return {
    answer,
    sources: uniqueSources(["Decision Engine", "Copilot", "Planning", "Platform Control"]),
    related_routes: uniqueRoutes([
      "/admin/nexus/decision-engine",
      "/admin/nexus/copilot",
      "/admin/nexus/planning",
      ...(top?.related_routes ?? []),
    ]),
    confidence: averageConfidence([top?.confidence_score, top?.decision_score, 85]),
  };
}

function buildMissionSummaryAnswer(context: ChatContext): ChatAnswer {
  const { mission_summary, mission_status, mission_score, primary_focus, top_threat, top_opportunity } =
    context.mission;

  const answer = `${mission_summary} Status: ${mission_status.replace(/_/g, " ")} (${mission_score}). Focus: ${primary_focus}. Top threat: ${top_threat}. Top opportunity: ${top_opportunity}.`;

  return {
    answer,
    sources: uniqueSources(["Platform Control", "Copilot", "Operational Intelligence"]),
    related_routes: uniqueRoutes(["/admin/nexus/mission-control", "/admin/nexus/copilot"]),
    confidence: 90,
  };
}

function buildGrowthForecastAnswer(context: ChatContext): ChatAnswer {
  const forecast = context.forecasting.forecasts.find((item) => item.category === "membership");

  if (!forecast) {
    return {
      answer: DATA_UNAVAILABLE,
      sources: uniqueSources(["Forecasting"]),
      related_routes: ["/admin/nexus/forecasting"],
      confidence: 40,
    };
  }

  if (!forecast.available) {
    return {
      answer: forecast.recommendation || DATA_UNAVAILABLE,
      sources: uniqueSources(["Forecasting", "Reports"]),
      related_routes: ["/admin/nexus/forecasting"],
      confidence: 55,
    };
  }

  const answer = `${forecast.title}: current ${forecast.current_value}. 30d ${forecast.projected_30d}, 90d ${forecast.projected_90d}. Risk ${forecast.risk_score}. ${forecast.recommendation}`;

  return {
    answer,
    sources: uniqueSources(["Forecasting", "Reports", "Planning"]),
    related_routes: uniqueRoutes(["/admin/nexus/forecasting", "/admin/nexus/planning"]),
    confidence: averageConfidence([forecast.confidence_score, 82]),
  };
}

function buildRevenueForecastAnswer(context: ChatContext): ChatAnswer {
  const forecast = context.forecasting.forecasts.find((item) => item.category === "revenue");
  const mrr = context.report.metrics.revenue.estimated_mrr;

  if (!forecast && mrr == null) {
    return {
      answer: DATA_UNAVAILABLE,
      sources: uniqueSources(["Forecasting", "Reports"]),
      related_routes: ["/admin/nexus/forecasting", "/admin/nexus/reports"],
      confidence: 42,
    };
  }

  const parts: string[] = [];
  if (mrr != null) {
    parts.push(`Estimated MRR: $${mrr.toLocaleString()}.`);
  }
  if (forecast?.available) {
    parts.push(
      `${forecast.title}: 30d ${forecast.projected_30d}, 90d ${forecast.projected_90d}. ${forecast.recommendation}`,
    );
  } else if (forecast) {
    parts.push(forecast.recommendation);
  }

  return {
    answer: parts.join(" "),
    sources: uniqueSources(["Forecasting", "Reports", "Scenarios"]),
    related_routes: uniqueRoutes(["/admin/nexus/forecasting", "/admin/nexus/reports", "/admin/nexus/scenarios"]),
    confidence: averageConfidence([forecast?.confidence_score, mrr != null ? 85 : 60]),
  };
}

function buildRecommendedFocusAnswer(context: ChatContext): ChatAnswer {
  const focus =
    context.planning.brief.primary_focus ||
    context.copilot.guidance.primary_focus ||
    context.weekly_briefing.recommended_focus[0];

  if (!focus) {
    return {
      answer: DATA_UNAVAILABLE,
      sources: uniqueSources(["Planning", "Copilot", "Briefings"]),
      related_routes: ["/admin/nexus/planning", "/admin/nexus/copilot"],
      confidence: 45,
    };
  }

  const secondary =
    context.planning.brief.secondary_focus || context.copilot.guidance.secondary_focus || "";

  const answer = secondary
    ? `Recommended focus: ${focus}. Secondary: ${secondary}.`
    : `Recommended focus: ${focus}.`;

  return {
    answer,
    sources: uniqueSources(["Planning", "Copilot", "Briefings", "Decision Engine"]),
    related_routes: uniqueRoutes(["/admin/nexus/planning", "/admin/nexus/copilot", "/admin/nexus/briefings"]),
    confidence: 87,
  };
}

function buildOpenIncidentsAnswer(context: ChatContext): ChatAnswer {
  const openIncidents = context.report.incidents.open;
  const criticalAlerts = context.report.alerts.counts.critical ?? 0;
  const activeAlerts = context.report.alerts.counts.active ?? 0;

  if (openIncidents.length === 0 && criticalAlerts === 0 && activeAlerts === 0) {
    return {
      answer: "No open incidents or active alerts at this time.",
      sources: uniqueSources(["Incidents", "Alerts"]),
      related_routes: uniqueRoutes(["/admin/nexus/incidents", "/admin/nexus/alerts"]),
      confidence: 92,
    };
  }

  const incidentTitles = openIncidents
    .slice(0, 3)
    .map((incident) => incident.title)
    .join("; ");

  const answer = [
    openIncidents.length > 0
      ? `${openIncidents.length} open incident${openIncidents.length === 1 ? "" : "s"}${incidentTitles ? `: ${incidentTitles}` : ""}.`
      : "",
    criticalAlerts > 0 ? `${criticalAlerts} critical alert${criticalAlerts === 1 ? "" : "s"} active.` : "",
    activeAlerts > 0 && criticalAlerts === 0
      ? `${activeAlerts} active alert${activeAlerts === 1 ? "" : "s"}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    answer,
    sources: uniqueSources(["Incidents", "Alerts", "Platform Control"]),
    related_routes: uniqueRoutes(["/admin/nexus/incidents", "/admin/nexus/alerts"]),
    confidence: 91,
  };
}

function buildBestScenarioAnswer(context: ChatContext): ChatAnswer {
  const favored =
    context.scenarios.rankings.nexus_favored ||
    context.scenarios.rankings.best_overall ||
    context.scenarios.ranked[0];

  if (!favored || !context.scenarios.available) {
    return {
      answer: context.scenarios.brief.headline || DATA_UNAVAILABLE,
      sources: uniqueSources(["Scenarios", "Forecasting", "Decision Engine"]),
      related_routes: ["/admin/nexus/scenarios"],
      confidence: favored ? 80 : 48,
    };
  }

  const answer = `Best scenario: ${favored.title} (${favored.scenario_type}). Score ${favored.scenario_score}. ${favored.recommendation}`;

  return {
    answer,
    sources: uniqueSources(["Scenarios", "Forecasting", "Decision Engine", "Planning"]),
    related_routes: uniqueRoutes(["/admin/nexus/scenarios", ...favored.related_routes]),
    confidence: averageConfidence([favored.confidence_score, favored.scenario_score]),
  };
}

function buildMemoryTimelineAnswer(context: ChatContext): ChatAnswer {
  const highlights = context.memory.entries.slice(0, 5);

  if (highlights.length === 0) {
    return {
      answer: DATA_UNAVAILABLE,
      sources: uniqueSources(["Memory"]),
      related_routes: ["/admin/nexus/memory"],
      confidence: 42,
    };
  }

  const lines = highlights.map(
    (entry) => `${entry.title} (${entry.entry_type}, ${new Date(entry.occurred_at).toLocaleDateString()})`,
  );

  const monthlyHeadline = context.monthly_briefing.headline;
  const answer = monthlyHeadline
    ? `${monthlyHeadline} Recent memory highlights: ${lines.join("; ")}.`
    : `Recent memory highlights: ${lines.join("; ")}.`;

  return {
    answer,
    sources: uniqueSources(["Memory", "Briefings", "Reports"]),
    related_routes: uniqueRoutes(["/admin/nexus/memory", "/admin/nexus/briefings"]),
    confidence: 83,
  };
}

function buildPlatformStatusAnswer(context: ChatContext): ChatAnswer {
  const status = context.copilot.guidance.overall_status;
  const missionStatus = context.mission.mission_status;
  const score = context.mission.mission_score;

  const answer = `${status} Mission status: ${missionStatus.replace(/_/g, " ")} (score ${score}). ${context.mission.mission_summary}`;

  return {
    answer,
    sources: uniqueSources(["Founder Dashboard", "Copilot", "Platform Control", "Reports"]),
    related_routes: uniqueRoutes(["/admin/nexus", "/admin/nexus/copilot", "/admin/nexus/mission-control"]),
    confidence: 88,
  };
}

function buildUnknownAnswer(context: ChatContext): ChatAnswer {
  const focus = context.copilot.guidance.primary_focus || context.mission.primary_focus;

  return {
    answer: `I can answer status, risk, growth, strategy, and historical questions from Nexus data. Try asking about attention today, biggest risk, forecasts, or platform summary. Current primary focus: ${focus || "review Platform Control"}.`,
    sources: uniqueSources(["Copilot", "Platform Control"]),
    related_routes: uniqueRoutes(["/admin/nexus/chat", "/admin/nexus/copilot", "/admin/nexus/mission-control"]),
    confidence: 65,
  };
}

export function buildChatAnswer(intent: ChatIntent, context: ChatContext): ChatAnswer {
  switch (intent) {
    case "attention_today":
      return buildAttentionAnswer(context);
    case "biggest_risk":
      return buildBiggestRiskAnswer(context);
    case "biggest_opportunity":
      return buildBiggestOpportunityAnswer(context);
    case "weekly_summary":
      return buildWeeklySummaryAnswer(context);
    case "changes_since_last_week":
      return buildChangesAnswer(context);
    case "blackcard_performance":
      return buildBlackcardAnswer(context);
    case "mission_score":
      return buildMissionScoreAnswer(context);
    case "nexus_recommendation":
      return buildNexusRecommendationAnswer(context);
    case "mission_summary":
      return buildMissionSummaryAnswer(context);
    case "growth_forecast":
      return buildGrowthForecastAnswer(context);
    case "revenue_forecast":
      return buildRevenueForecastAnswer(context);
    case "recommended_focus":
      return buildRecommendedFocusAnswer(context);
    case "open_incidents":
      return buildOpenIncidentsAnswer(context);
    case "best_scenario":
      return buildBestScenarioAnswer(context);
    case "memory_timeline":
      return buildMemoryTimelineAnswer(context);
    case "platform_status":
      return buildPlatformStatusAnswer(context);
    default:
      return buildUnknownAnswer(context);
  }
}

export async function answerNexusChat(
  supabase: SupabaseClient,
  message: string,
): Promise<{ answer: ChatAnswer; mode: ChatMode; intent: ChatIntent }> {
  const route = routeChatMessage(message);
  const context = await loadChatContext(supabase);
  const answer = buildChatAnswer(route.intent, context);

  if (route.match_confidence > 0 && answer.confidence > route.match_confidence - 20) {
    answer.confidence = Math.min(98, Math.max(answer.confidence, route.match_confidence - 5));
  }

  return {
    answer,
    mode: route.mode,
    intent: route.intent,
  };
}

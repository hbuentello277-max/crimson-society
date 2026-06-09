import type { ChatContext } from "@/lib/chat/context";
import { normalizeAnalysisQuestion } from "@/lib/ai-analysis/prompts";
import type { AnalysisSource, GroundingPacket } from "@/lib/ai-analysis/types";
import { ANALYSIS_SOURCES } from "@/lib/ai-analysis/types";

type SourceRule = {
  source: AnalysisSource;
  patterns: RegExp[];
};

const SOURCE_RULES: SourceRule[] = [
  {
    source: "Platform Status",
    patterns: [/platform score/, /platform summary/, /platform status/, /mission control/],
  },
  {
    source: "Forecasting",
    patterns: [/forecast/, /projection/, /trend/, /growth/, /revenue/, /mrr/, /member/],
  },
  {
    source: "Operational Intelligence",
    patterns: [/operational/, /workflow/, /pattern/, /relationship/, /why/, /happened/],
  },
  {
    source: "Scenarios",
    patterns: [/scenario/, /compare/, /strategic path/, /tradeoff/],
  },
  {
    source: "Decision Engine",
    patterns: [/decision/, /recommend/, /roi/, /priority/],
  },
  {
    source: "Copilot",
    patterns: [/attention/, /focus/, /copilot/, /guidance/, /important/],
  },
  {
    source: "Planning",
    patterns: [/planning/, /objective/, /focus/, /opportunity/, /risk/],
  },
  {
    source: "Briefings",
    patterns: [/briefing/, /week/, /month/, /changed/, /summary/],
  },
  {
    source: "Reports",
    patterns: [/report/, /activity/, /snapshot/, /changed/],
  },
  {
    source: "Intelligence",
    patterns: [/intelligence/, /insight/, /signal/],
  },
  {
    source: "Memory",
    patterns: [/memory/, /history/, /timeline/, /last month/],
  },
  {
    source: "Correlations",
    patterns: [/correlation/, /linked/, /relationship/],
  },
  {
    source: "Alerts",
    patterns: [/alert/, /critical/],
  },
  {
    source: "Incidents",
    patterns: [/incident/],
  },
  {
    source: "Commands",
    patterns: [/command/],
  },
];

const DEFAULT_SOURCES: AnalysisSource[] = [
  "Founder Dashboard",
  "Platform Status",
  "Copilot",
  "Planning",
  "Reports",
];

function isAnalysisSource(value: string): value is AnalysisSource {
  return (ANALYSIS_SOURCES as readonly string[]).includes(value);
}

export function selectConsultedSources(question: string): AnalysisSource[] {
  const normalized = normalizeAnalysisQuestion(question).toLowerCase();
  const selected = new Set<AnalysisSource>();

  for (const rule of SOURCE_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      selected.add(rule.source);
    }
  }

  if (selected.size === 0) {
    for (const source of DEFAULT_SOURCES) {
      selected.add(source);
    }
  } else {
    selected.add("Founder Dashboard");
  }

  return ANALYSIS_SOURCES.filter((source) => selected.has(source));
}

function sliceTop<T>(items: T[], limit: number): T[] {
  return items.slice(0, limit);
}

export function buildGroundingPacket(
  context: ChatContext,
  consultedSources: AnalysisSource[],
): GroundingPacket {
  const include = (source: AnalysisSource) => consultedSources.includes(source);

  return {
    generated_at: context.loaded_at,
    consulted_sources: consultedSources,
    founder_dashboard: include("Founder Dashboard")
      ? {
          system_status: context.report.health.systemStatus,
          mission_status: context.report.mission.status,
          mission_score: context.report.mission.score,
          critical_alerts: context.report.alerts.counts.critical ?? 0,
          open_incidents: context.report.incidents.open.length,
          new_users_this_week: context.report.metrics.growth.new_users_this_week,
          blackcard_members: context.report.metrics.blackcard.active_members,
          estimated_mrr: context.report.metrics.revenue.estimated_mrr,
        }
      : null,
    reports: include("Reports")
      ? {
          collected_at: context.executive.collected_at,
          snapshot: context.executive.snapshot,
          activity_trends: context.executive.engagement_intelligence.activity_trends,
          growth_signals: context.executive.community_growth.top_growth_signals,
          unavailable_metrics: context.executive.unavailable_metrics,
        }
      : null,
    briefings: include("Briefings")
      ? {
          weekly_headline: context.weekly_briefing.headline,
          weekly_risks: context.weekly_briefing.risks,
          weekly_focus: context.weekly_briefing.recommended_focus,
          monthly_headline: context.monthly_briefing.headline,
          monthly_risks: context.monthly_briefing.risks,
        }
      : null,
    intelligence: include("Intelligence")
      ? {
          items: sliceTop(context.intelligence.items, 8).map((item) => ({
            title: item.title,
            summary: item.summary,
            impact_score: item.impact_score,
            category: item.category,
          })),
        }
      : null,
    memory: include("Memory")
      ? {
          entries: sliceTop(context.memory.entries, 10).map((entry) => ({
            title: entry.title,
            summary: entry.summary,
            entry_type: entry.entry_type,
            occurred_at: entry.occurred_at,
          })),
        }
      : null,
    correlations: include("Correlations")
      ? {
          correlations: sliceTop(context.correlations.correlations, 8).map((row) => ({
            title: row.title,
            summary: row.summary,
            impact_score: row.impact_score,
            time_window: row.time_window,
          })),
        }
      : null,
    planning: include("Planning")
      ? {
          brief: context.planning.brief,
          priorities: sliceTop(context.planning.priorities, 5).map((item) => ({
            title: item.title,
            summary: item.summary,
            urgency: item.urgency,
          })),
          risks: sliceTop(context.planning.risks, 5),
          opportunities: sliceTop(context.planning.opportunities, 5),
        }
      : null,
    forecasting: include("Forecasting")
      ? {
          summary: context.forecasting.summary,
          forecasts: context.forecasting.forecasts.map((forecast) => ({
            category: forecast.category,
            title: forecast.title,
            current_value: forecast.current_value,
            projected_30d: forecast.projected_30d,
            projected_90d: forecast.projected_90d,
            risk_score: forecast.risk_score,
            confidence_score: forecast.confidence_score,
            available: forecast.available,
            recommendation: forecast.recommendation,
          })),
        }
      : null,
    copilot: include("Copilot")
      ? {
          guidance: context.copilot.guidance,
          daily_focus: context.copilot.daily_focus,
          top_opportunity: context.copilot.top_opportunity,
          top_risk: context.copilot.top_risk,
          improving_signals: sliceTop(context.copilot.improving_signals, 5),
          declining_signals: sliceTop(context.copilot.declining_signals, 5),
        }
      : null,
    operational_intelligence: include("Operational Intelligence")
      ? {
          overview: context.operational.overview,
          top_items: sliceTop(context.operational.recommendations, 6).map((item) => ({
            title: item.title,
            summary: item.summary,
            category: item.category,
            confidence_score: item.confidence_score,
          })),
          patterns: sliceTop(context.operational.patterns, 5).map((pattern) => ({
            title: pattern.title,
            summary: pattern.summary,
          })),
        }
      : null,
    mission_control: include("Platform Status")
      ? {
          mission_status: context.mission.mission_status,
          mission_score: context.mission.mission_score,
          mission_summary: context.mission.mission_summary,
          primary_focus: context.mission.primary_focus,
          secondary_focus: context.mission.secondary_focus,
          top_threat: context.mission.top_threat,
          top_opportunity: context.mission.top_opportunity,
          score_breakdown: context.mission.score_breakdown,
          threats: sliceTop(context.mission.threats, 5),
          accelerators: sliceTop(context.mission.accelerators, 5),
        }
      : null,
    decision_engine: include("Decision Engine")
      ? {
          brief: context.decisions.brief,
          top_recommended: sliceTop(context.decisions.top_recommended, 5).map((item) => ({
            title: item.title,
            summary: item.summary,
            recommendation: item.recommendation,
            decision_score: item.decision_score,
            confidence_score: item.confidence_score,
          })),
        }
      : null,
    scenarios: include("Scenarios")
      ? {
          available: context.scenarios.available,
          brief: context.scenarios.brief,
          rankings: {
            best_overall: context.scenarios.rankings.best_overall?.title ?? null,
            nexus_favored: context.scenarios.rankings.nexus_favored?.title ?? null,
            lowest_risk: context.scenarios.rankings.lowest_risk?.title ?? null,
          },
          comparison: context.scenarios.comparison,
        }
      : null,
    alerts: include("Alerts")
      ? {
          counts: context.report.alerts.counts,
          active: sliceTop(context.report.alerts.active, 5).map((alert) => ({
            title: alert.title,
            severity: alert.severity,
            status: alert.status,
          })),
        }
      : null,
    incidents: include("Incidents")
      ? {
          open_count: context.report.incidents.open.length,
          open: sliceTop(context.report.incidents.open, 5).map((incident) => ({
            title: incident.title,
            severity: incident.severity,
            status: incident.status,
          })),
        }
      : null,
    commands: include("Commands")
      ? {
          counts: context.report.commands.counts,
          commands: sliceTop(context.report.commands.commands, 5).map((command) => ({
            title: command.title,
            status: command.status,
            command_type: command.command_type,
          })),
        }
      : null,
  };
}

export function sanitizeAnalysisSources(sources: string[]): AnalysisSource[] {
  return sources.filter(isAnalysisSource);
}

export function sanitizeRelatedRoutes(routes: string[]): string[] {
  const allowedPrefix = "/admin/nexus";
  return [...new Set(routes.filter((route) => route.startsWith(allowedPrefix)))];
}

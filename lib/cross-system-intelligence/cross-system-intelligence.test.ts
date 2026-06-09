import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCrossSystemCorrelations } from "@/lib/cross-system-intelligence/correlations";
import { buildCrossSystemInsights } from "@/lib/cross-system-intelligence/insights";
import { buildCrossSystemOpportunities } from "@/lib/cross-system-intelligence/opportunity-engine";
import { buildCrossSystemRecommendations } from "@/lib/cross-system-intelligence/recommendations";
import { buildCrossSystemRisks } from "@/lib/cross-system-intelligence/risk-engine";
import { buildCrossSystemTimeline } from "@/lib/cross-system-intelligence/timeline";
import type { CrossSystemContext } from "@/lib/cross-system-intelligence/context";
import { resolveNexusVoiceTool } from "@/lib/admin/nexus-voice/routing";

function baseContext(overrides: Partial<CrossSystemContext> = {}): CrossSystemContext {
  const generated_at = new Date().toISOString();
  return {
    generated_at,
    intelligence: {
      generated_at,
      collected_at: generated_at,
      trends: {
        "revenue.mrr": { current: 90, previous: 100 },
        "blackcard.active_members": { current: 45, previous: 50 },
        "growth.signups_weekly": { current: 20, previous: 30 },
        "activity.posts_weekly": { current: 12, previous: 20 },
      },
      metrics: {
        collected_at: generated_at,
        revenue: { estimated_mrr: 90, estimated_arr: 1080, warnings: [] } as never,
        growth: { new_users_this_week: 20, total_users: 500, warnings: [] } as never,
        blackcard: { active_members: 45, warnings: [] } as never,
        activity: { posts_this_week: 12, warnings: [] } as never,
        snapshot_count: 4,
      },
      health: {} as never,
      mission: {} as never,
      alerts: { counts: { active: 1 }, active: [] } as never,
      incidents: { open: [{ id: "i1", title: "Checkout degraded", started_at: generated_at, impact_summary: "Checkout errors", severity: "warning" } as never] } as never,
      observations: {} as never,
      commands: {} as never,
      monthly_activity: { posts: 10, meets: 2, messages: 40, unavailable: [] },
    },
    correlations: {
      generated_at,
      window: "7d",
      window_start: generated_at,
      window_end: generated_at,
      deployments: [
        {
          id: "d1",
          deployment_id: "dep-1",
          environment: "production",
          status: "ready",
          started_at: generated_at,
          finished_at: generated_at,
          commit_message: "Fix checkout",
        },
      ],
      memory_entries: [],
      recent_commands: [],
      post_deployment_incidents: 1,
      post_deployment_critical_alerts: 0,
      metrics: {} as never,
      health: {} as never,
      mission: {} as never,
      alerts: {} as never,
      incidents: {} as never,
      observations: {} as never,
      commands: {} as never,
      trends: {},
    },
    proactive: {
      alerts: [
        {
          id: "revenue-risk",
          category: "revenue_drop",
          severity: "warning",
          title: "Revenue risk detected",
          summary: "Revenue down 12%",
          detectedAt: generated_at,
          relatedRoute: "/admin/nexus/metrics",
        },
      ],
      partial: false,
      warnings: [],
    },
    founder_timeline: {
      recentAccomplishments: [],
      recentDecisions: [
        {
          id: "decision-1",
          entryType: "command",
          title: "Paused referral push",
          summary: "Founder paused referral campaign.",
          occurredAt: generated_at,
          source: "memory",
        },
      ],
      currentBlockers: [],
      nextActions: [],
      generatedAt: generated_at,
    },
    credits: {
      active_rewards: 8,
      redemptions_this_week: 14,
      redemptions_previous_week: 10,
      transactions_this_week: 40,
      unavailable: [],
    },
    action_center: {
      pending_approval: 2,
      recent_types: [],
      has_recent_launch_announcement: false,
      has_recent_blackcard_campaign: false,
    },
    partial: false,
    warnings: [],
    ...overrides,
  };
}

describe("correlation engine", () => {
  it("explains revenue decline with linked signals", () => {
    const correlations = buildCrossSystemCorrelations(baseContext());
    const revenueCorrelation = correlations.find((item) => item.id === "revenue-blackcard-engagement-decline");
    assert.ok(revenueCorrelation);
    assert.match(revenueCorrelation.explanation, /Revenue declined/i);
    assert.match(revenueCorrelation.explanation, /Blackcard/i);
  });
});

describe("risk engine", () => {
  it("surfaces revenue and incident risks", () => {
    const risks = buildCrossSystemRisks(baseContext());
    assert.ok(risks.some((risk) => risk.insight_type === "risk" && risk.domain === "revenue"));
    assert.ok(risks.some((risk) => risk.title.includes("incident")));
  });
});

describe("opportunity engine", () => {
  it("flags missing launch announcement preparation", () => {
    const opportunities = buildCrossSystemOpportunities(baseContext());
    assert.ok(
      opportunities.some((item) => item.id === "opportunity:launch-campaign-gap"),
    );
  });
});

describe("timeline generation", () => {
  it("includes deployment and incident events", () => {
    const timeline = buildCrossSystemTimeline(baseContext(), "7d");
    assert.ok(timeline.some((event) => event.category === "deployment"));
    assert.ok(timeline.some((event) => event.category === "incident"));
  });
});

describe("recommendations", () => {
  it("maps insights to action center draft types", () => {
    const risks = buildCrossSystemRisks(baseContext());
    const insights = buildCrossSystemInsights({
      risks,
      opportunities: [],
      correlations: [],
      generated_at: new Date().toISOString(),
    });
    const recommendations = buildCrossSystemRecommendations(insights, new Date().toISOString());
    assert.ok(recommendations.length > 0);
    assert.ok(recommendations[0]?.suggested_action_type);
  });
});

describe("voice routing", () => {
  it("routes platform intelligence questions", () => {
    assert.equal(resolveNexusVoiceTool("Why is revenue down?"), "getPlatformIntelligenceBriefing");
    assert.equal(resolveNexusVoiceTool("What changed this week?"), "getPlatformIntelligenceTimeline");
    assert.equal(resolveNexusVoiceTool("Show major risks."), "getPlatformIntelligenceRisks");
    assert.equal(resolveNexusVoiceTool("Show opportunities."), "getPlatformIntelligenceOpportunities");
    assert.equal(
      resolveNexusVoiceTool("Give me a founder intelligence briefing."),
      "getPlatformIntelligenceBriefing",
    );
    assert.equal(
      resolveNexusVoiceTool("Summarize platform intelligence."),
      "getPlatformIntelligenceBriefing",
    );
  });
});

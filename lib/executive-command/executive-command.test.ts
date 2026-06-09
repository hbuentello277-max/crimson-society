import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildExecutivePriorities,
  emptyExecutivePriorities,
} from "@/lib/executive-command/priorities";
import { formatExecutiveSummaryForVoice } from "@/lib/executive-command/engine";
import type { ExecutiveCommandSummary } from "@/lib/executive-command/types";
import { resolveNexusVoiceTool } from "@/lib/admin/nexus-voice/routing";
import { resolveVoiceCommand } from "@/lib/nexus/voice-commands";

describe("executive summary composition", () => {
  it("formats voice summary with platform status and focus", () => {
    const summary: ExecutiveCommandSummary = {
      collected_at: new Date().toISOString(),
      access: "owner",
      executive_summary: {
        overall_platform_status: "warning",
        launch_readiness_score: 82,
        launch_readiness_status: "approaching",
        top_risk: "Revenue trend is declining",
        top_opportunity: "Membership signups are accelerating",
        recommended_focus_today: "Review pending Action Center approvals",
      },
      platform_health: {
        platform_status: "warning",
        platform_health: "degraded",
        platform_health_score: 78,
        failed_jobs: 1,
        open_alerts: 2,
        recent_incidents: [],
      },
      business_health: {
        revenue_status: "Estimated MRR $1,200",
        estimated_mrr: 1200,
        blackcard_growth: "45 active members",
        blackcard_members: 45,
        membership_growth: "20 new members this week",
        new_members_this_week: 20,
        shop_activity: "Stripe webhook processed 3 events in the last hour",
        credits_activity: "14 redemptions this week",
      },
      operations_planner: { available: false, plan: null },
      action_center: {
        pending_approval: 2,
        draft: 1,
        approved_awaiting_execution: 0,
        recent_titles: [],
      },
      founder_memory: {
        recent_decisions: [],
        current_blockers: [],
        completed_milestones: [],
        current_phase: "Phase 14 — Executive Command Center",
      },
      todays_priorities: emptyExecutivePriorities(),
      readOnly: true,
    };

    const spoken = formatExecutiveSummaryForVoice(summary);
    assert.match(spoken, /Executive Command Center/i);
    assert.match(spoken, /Launch readiness 82\/100/i);
    assert.match(spoken, /Top risk/i);
    assert.match(spoken, /2 actions need approval/i);
  });
});

describe("priority ranking", () => {
  it("ranks incidents and approvals ahead of opportunities", () => {
    const priorities = buildExecutivePriorities({
      risks: [{ id: "r1", title: "Revenue risk", summary: "Down 12%", impact_score: 80 }],
      opportunities: [
        { id: "o1", title: "Signup momentum", summary: "Up 15%", impact_score: 70 },
      ],
      launchBlockers: ["2 open incident(s)"],
      pendingApprovals: 4,
      memoryBlockers: [],
      platformStatus: "warning",
      failedJobs: 1,
      openIncidents: 2,
    });

    assert.ok(priorities.length >= 3);
    assert.equal(priorities[0]?.urgency, "critical");
    assert.ok(priorities.some((item) => item.title.includes("approval")));
  });
});

describe("pending approval summary", () => {
  it("includes action center counts in empty-state fallback", () => {
    const priorities = emptyExecutivePriorities();
    assert.equal(priorities.length, 1);
    assert.match(priorities[0]?.suggested_next_action ?? "", /executive summary/i);
  });
});

describe("voice routing", () => {
  it("routes executive command center phrases", () => {
    assert.equal(resolveVoiceCommand("open executive command center")?.href, "/admin/nexus");
    assert.equal(resolveNexusVoiceTool("Give me executive summary."), "getExecutiveCommandSummary");
    assert.equal(resolveNexusVoiceTool("What should I focus on right now?"), "getExecutiveCommandSummary");
    assert.equal(resolveNexusVoiceTool("Show today's priorities."), "getExecutiveCommandPriorities");
    assert.equal(resolveNexusVoiceTool("What needs approval?"), "getExecutiveCommandApprovals");
    assert.equal(resolveNexusVoiceTool("What is the biggest risk today?"), "getExecutiveCommandTopRisk");
    assert.equal(resolveNexusVoiceTool("What is the biggest opportunity today?"), "getExecutiveCommandTopOpportunity");
  });
});

describe("permissions", () => {
  it("defines owner and admin access types", () => {
    const summary: ExecutiveCommandSummary = {
      collected_at: new Date().toISOString(),
      access: "admin",
      executive_summary: {
        overall_platform_status: "operational",
        launch_readiness_score: 90,
        launch_readiness_status: "ready",
        top_risk: null,
        top_opportunity: null,
        recommended_focus_today: "Maintain operating rhythm",
      },
      platform_health: {
        platform_status: "operational",
        platform_health: "healthy",
        platform_health_score: 90,
        failed_jobs: 0,
        open_alerts: 0,
        recent_incidents: [],
      },
      business_health: {
        revenue_status: "n/a",
        estimated_mrr: null,
        blackcard_growth: "n/a",
        blackcard_members: null,
        membership_growth: "n/a",
        new_members_this_week: null,
        shop_activity: "n/a",
        credits_activity: "n/a",
      },
      operations_planner: { available: false, plan: null },
      action_center: {
        pending_approval: 0,
        draft: 0,
        approved_awaiting_execution: 0,
        recent_titles: [],
      },
      founder_memory: {
        recent_decisions: [],
        current_blockers: [],
        completed_milestones: [],
        current_phase: "Phase 14 — Executive Command Center",
      },
      todays_priorities: emptyExecutivePriorities(),
      readOnly: true,
    };

    assert.equal(summary.access, "admin");
    assert.equal(summary.action_center.pending_approval, 0);
  });
});

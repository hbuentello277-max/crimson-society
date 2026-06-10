import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildExecutivePriorities } from "@/lib/executive-command/priorities";
import { NEXUS_CURRENT_PHASE } from "@/lib/executive-command/types";
import { resolveNexusVoiceTool } from "@/lib/admin/nexus-voice/routing";
import { resolveVoiceCommand } from "@/lib/nexus/voice-commands";
import { requireOwnerSession } from "@/lib/nexus/auth";

describe("executive summary composition", () => {
  it("exposes the current NEXUS phase constant", () => {
    assert.equal(NEXUS_CURRENT_PHASE, 16);
  });

  it("ranks launch blockers and proactive alerts ahead of opportunities", () => {
    const priorities = buildExecutivePriorities({
      risks: [
        {
          id: "risk-1",
          insight_type: "risk",
          domain: "revenue",
          title: "Revenue softening",
          summary: "MRR trend is down week over week.",
          explanation: "MRR trend is down week over week.",
          confidence_score: 80,
          impact_score: 72,
          related_routes: ["/admin/nexus/intelligence"],
          suggested_action_type: "weekly_report",
          generated_at: new Date().toISOString(),
        },
      ],
      opportunities: [
        {
          id: "opp-1",
          insight_type: "opportunity",
          domain: "membership",
          title: "Membership momentum",
          summary: "Signups are rising.",
          explanation: "Signups are rising.",
          confidence_score: 70,
          impact_score: 60,
          related_routes: ["/admin/nexus/intelligence"],
          suggested_action_type: "community_update",
          generated_at: new Date().toISOString(),
        },
      ],
      launchReadiness: {
        score: 42,
        status: "not_ready",
        factors: {
          platformHealth: 50,
          openIncidents: 40,
          failedJobs: 30,
          appStoreReadiness: 45,
          betaFeedback: 55,
          operationalStability: 48,
        },
        blockers: ["2 failed platform job(s)"],
        summary: "Not launch ready.",
      },
      pendingApprovals: 0,
      actionItems: [],
      memoryBlockers: [],
      proactiveAlerts: [
        {
          id: "alert-1",
          category: "failed_jobs",
          severity: "critical",
          title: "Failed platform jobs",
          summary: "Two jobs failed overnight.",
          detectedAt: new Date().toISOString(),
          relatedRoute: "/admin/nexus/mission-health",
        },
      ],
      platformHealthUrgent: true,
    });

    assert.ok(priorities.length >= 3);
    assert.equal(priorities[0]?.urgency, "critical");
    assert.ok(priorities.some((item) => item.title.includes("Failed platform jobs")));
    assert.ok(priorities.some((item) => item.title.includes("Launch blocker")));
  });
});

describe("priority ranking", () => {
  it("limits output to five priorities with suggested next actions", () => {
    const priorities = buildExecutivePriorities({
      risks: Array.from({ length: 4 }, (_, index) => ({
        id: `risk-${index}`,
        insight_type: "risk" as const,
        domain: "revenue" as const,
        title: `Risk ${index}`,
        summary: `Risk summary ${index}`,
        explanation: `Risk summary ${index}`,
        confidence_score: 70,
        impact_score: 70,
        related_routes: ["/admin/nexus/intelligence"],
        suggested_action_type: "weekly_report" as const,
        generated_at: new Date().toISOString(),
      })),
      opportunities: [],
      launchReadiness: {
        score: 80,
        status: "ready",
        factors: {
          platformHealth: 80,
          openIncidents: 80,
          failedJobs: 80,
          appStoreReadiness: 80,
          betaFeedback: 80,
          operationalStability: 80,
        },
        blockers: [],
        summary: "Ready.",
      },
      pendingApprovals: 4,
      actionItems: [
        {
          id: "action-1",
          action_category: "marketing",
          action_type: "launch_announcement",
          title: "Launch announcement draft",
          summary: "Draft summary",
          reason: "Launch is approaching.",
          suggested_outcome: "Announce launch",
          status: "pending_approval",
          approval_required: true,
          created_by_label: "NEXUS",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      memoryBlockers: [],
      proactiveAlerts: [],
      platformHealthUrgent: false,
    });

    assert.ok(priorities.length <= 5);
    assert.ok(priorities.every((item) => item.suggested_next_action.length > 0));
    assert.ok(priorities.some((item) => item.title.includes("approval")));
  });
});

describe("pending approval summary", () => {
  it("routes approval questions to the action queue tool", () => {
    assert.equal(resolveNexusVoiceTool("What needs approval?"), "getNexusActionQueue");
    assert.equal(resolveNexusVoiceTool("What actions need approval?"), "getNexusActionQueue");
  });
});

describe("voice routing", () => {
  it("maps executive command navigation", () => {
    assert.equal(resolveVoiceCommand("open executive command center")?.label, "Executive Command Center");
    assert.equal(resolveVoiceCommand("open executive command center")?.href, "/admin/nexus");
  });

  it("maps executive summary and priority phrases", () => {
    assert.equal(resolveNexusVoiceTool("Give me executive summary."), "getExecutiveSummary");
    assert.equal(
      resolveNexusVoiceTool("What should I focus on right now?"),
      "getExecutiveSummary",
    );
    assert.equal(resolveNexusVoiceTool("Show today's priorities."), "getExecutivePriorities");
    assert.equal(
      resolveNexusVoiceTool("What is the biggest risk today?"),
      "getExecutiveBiggestRisk",
    );
    assert.equal(
      resolveNexusVoiceTool("What is the biggest opportunity today?"),
      "getExecutiveBiggestOpportunity",
    );
  });
});

describe("owner/admin permissions", () => {
  it("requires owner session helper for executive API access", () => {
    assert.equal(typeof requireOwnerSession, "function");
  });
});

describe("empty-state handling", () => {
  it("returns no priorities when all signal sources are empty", () => {
    const priorities = buildExecutivePriorities({
      risks: [],
      opportunities: [],
      launchReadiness: {
        score: 92,
        status: "strong",
        factors: {
          platformHealth: 95,
          openIncidents: 95,
          failedJobs: 95,
          appStoreReadiness: 95,
          betaFeedback: 95,
          operationalStability: 95,
        },
        blockers: [],
        summary: "Strong.",
      },
      pendingApprovals: 0,
      actionItems: [],
      memoryBlockers: [],
      proactiveAlerts: [],
      platformHealthUrgent: false,
    });

    assert.deepEqual(priorities, []);
  });
});

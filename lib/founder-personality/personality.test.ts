import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatFounderQuestionResponse,
  formatMorningBriefingResponse,
} from "@/lib/admin/nexus-voice/founder-formatters";
import { formatNexusVoiceResponse } from "@/lib/admin/nexus-voice/formatters";
import { runNexusVoiceAssistant } from "@/lib/admin/nexus-voice/assistant";
import {
  formatFounderModeAcknowledgement,
  resolveFounderModeCommand,
} from "@/lib/founder-personality/modes";
import { formatFounderStructuredResponse } from "@/lib/founder-personality/formatter";
import { buildLaunchReadinessBreakdown, formatLaunchReadinessResponse } from "@/lib/founder-personality/launch-summary";
import { pickMemoryHintForRecommendation } from "@/lib/founder-personality/memory-context";
import {
  rankFounderPriorityItems,
  rankFounderRecommendations,
  recommendationTier,
} from "@/lib/founder-personality/priority";
import type { FounderRecommendation } from "@/lib/founder-copilot/types";
import type { FounderPriorityItem } from "@/lib/proactive-intelligence/types";

describe("formatFounderStructuredResponse", () => {
  it("includes Situation, Risk, Recommendation, and Next action", () => {
    const text = formatFounderStructuredResponse({
      situation: "3 platform jobs failed.",
      risk: "Media delays may impact uploads.",
      recommendation: "Review failed job logs.",
      nextAction: "Open Platform Status.",
    });

    assert.match(text, /Situation:/i);
    assert.match(text, /Risk:/i);
    assert.match(text, /Recommendation:/i);
    assert.match(text, /Next action:/i);
  });
});

describe("priority ranking", () => {
  it("ranks platform stability above cosmetic issues", () => {
    const recommendations: FounderRecommendation[] = [
      {
        id: "cosmetic",
        priority: 1,
        title: "Polish nav copy",
        reason: "Minor UI polish for launch page",
        category: "growth",
        relatedRoute: "/admin/nexus/copilot",
      },
      {
        id: "platform",
        priority: 5,
        title: "Resolve failed platform jobs",
        reason: "2 failed jobs in media queue",
        category: "jobs",
        relatedRoute: "/admin/nexus/mission-control",
      },
    ];

    const ranked = rankFounderRecommendations(recommendations);
    assert.equal(ranked[0]?.id, "platform");
    assert.equal(recommendationTier(ranked[0]!), "platform_stability");
  });

  it("ranks critical platform issues above revenue opportunities", () => {
    const items: FounderPriorityItem[] = [
      {
        id: "revenue",
        rank: 1,
        type: "opportunity",
        title: "Revenue spike from checkout",
        reason: "Paid orders up today",
        urgency: "medium",
        relatedRoute: "/admin/nexus/metrics",
      },
      {
        id: "incident",
        rank: 2,
        type: "issue",
        title: "Critical alert open",
        reason: "Checkout degraded",
        urgency: "critical",
        relatedRoute: "/admin/nexus/alerts",
      },
    ];

    const ranked = rankFounderPriorityItems(items);
    assert.equal(ranked[0]?.id, "incident");
  });
});

describe("founder mode commands", () => {
  it("resolves supported mode switch phrases", () => {
    assert.equal(resolveFounderModeCommand("Switch to founder mode"), "founder");
    assert.equal(resolveFounderModeCommand("Switch to operator mode"), "operator");
    assert.equal(resolveFounderModeCommand("Switch to launch mode"), "launch");
    assert.equal(resolveFounderModeCommand("Switch to growth mode"), "growth");
  });

  it("acknowledges mode changes with focus guidance", () => {
    assert.match(formatFounderModeAcknowledgement("founder"), /growth, launch readiness/i);
    assert.match(formatFounderModeAcknowledgement("operator"), /alerts, jobs, incidents/i);
    assert.match(formatFounderModeAcknowledgement("launch"), /blockers, readiness score/i);
    assert.match(formatFounderModeAcknowledgement("growth"), /members, Blackcard, revenue/i);
  });
});

describe("launch readiness summaries", () => {
  it("builds ready, at risk, blocked, and next milestone sections", () => {
    const breakdown = buildLaunchReadinessBreakdown({
      score: 62,
      status: "approaching",
      summary: "Approaching launch readiness.",
      blockers: ["2 failed platform job(s)"],
      factors: {
        platformHealth: 80,
        openIncidents: 90,
        failedJobs: 40,
        appStoreReadiness: 70,
        betaFeedback: 75,
        operationalStability: 68,
      },
    });

    assert.ok(breakdown.ready.length > 0);
    assert.ok(breakdown.atRisk.length > 0);
    assert.equal(breakdown.blocked[0], "2 failed platform job(s)");
    assert.ok(breakdown.nextMilestone);
  });

  it("formats launch readiness with structured founder response", () => {
    const text = formatLaunchReadinessResponse({
      score: 72,
      status: "ready",
      summary: "Launch readiness is solid with minor operational follow-ups.",
      blockers: [],
      factors: {
        platformHealth: 80,
        openIncidents: 90,
        failedJobs: 85,
        appStoreReadiness: 70,
        betaFeedback: 75,
        operationalStability: 68,
      },
    });

    assert.match(text, /Situation:/i);
    assert.match(text, /Ready systems/i);
    assert.match(text, /Next milestone/i);
  });
});

describe("memory-aware recommendations", () => {
  it("prefers matching memory hints for monetization topics", () => {
    const hint = pickMemoryHintForRecommendation(
      [
        "Blackcard pricing is annual-first: prioritize annual plan messaging.",
        "Focus on beta testers before paid ads.",
      ],
      "Improve Blackcard conversion on pricing page",
    );

    assert.match(hint ?? "", /Blackcard pricing/i);
  });
});

describe("founder voice formatting", () => {
  it("formats failed platform jobs with structured guidance", () => {
    const text = formatNexusVoiceResponse(
      "getFailedPlatformJobs",
      {
        tool: "getFailedPlatformJobs",
        data: {
          jobs: [
            {
              label: "media transcode",
              status: "failed",
              error_message: "timeout",
            },
            { label: "daily digest", status: "failed" },
            { label: "signup sync", status: "failed" },
          ],
        },
      },
      { founderMode: "operator" },
    );

    assert.match(text, /Situation:/i);
    assert.match(text, /3 platform jobs failed/i);
    assert.match(text, /Media processing delays/i);
    assert.match(text, /Open Platform Status/i);
  });

  it("formats focus today with structured guidance", () => {
    const text = formatFounderQuestionResponse(
      {
        tool: "answerFounderQuestion",
        data: {
          questionType: "focus_today",
          data: {
            priority: {
              generatedAt: new Date().toISOString(),
              highestPriorityIssue: {
                id: "alert-1",
                rank: 1,
                type: "issue",
                title: "Critical alerts open",
                reason: "2 critical alerts need review",
                urgency: "critical",
                relatedRoute: "/admin/nexus/alerts",
              },
              highestOpportunity: null,
              recommendedNextAction: {
                id: "action-1",
                rank: 1,
                type: "action",
                title: "Resolve critical alerts",
                reason: "2 critical alerts open",
                urgency: "critical",
                relatedRoute: "/admin/nexus/alerts",
              },
              estimatedLaunchReadiness: {
                score: 70,
                status: "ready",
                summary: "Ready",
                blockers: [],
                factors: {
                  platformHealth: 80,
                  openIncidents: 90,
                  failedJobs: 85,
                  appStoreReadiness: 70,
                  betaFeedback: 75,
                  operationalStability: 68,
                },
              },
              rankedItems: [],
            },
          },
        },
      },
      { founderMode: "founder" },
    );

    assert.match(text, /Situation:/i);
    assert.match(text, /Recommended focus/i);
    assert.match(text, /Next action:/i);
  });

  it("formats morning briefing with founder guidance sections", () => {
    const text = formatMorningBriefingResponse(
      {
        tool: "getMorningBriefing",
        data: {
          morningBriefing: {
            generatedAt: new Date().toISOString(),
            headline: "Platform is stable with minor follow-ups.",
            sections: [
              { label: "Platform Health", value: "Healthy — score 82" },
              { label: "Revenue", value: "$120 today" },
            ],
            proactiveAlerts: [],
            priority: {
              generatedAt: new Date().toISOString(),
              highestPriorityIssue: null,
              highestOpportunity: {
                id: "growth-1",
                rank: 1,
                type: "opportunity",
                title: "Member signups trending up",
                reason: "12 signups this week",
                urgency: "medium",
                relatedRoute: "/admin/nexus/copilot",
              },
              recommendedNextAction: {
                id: "action-1",
                rank: 1,
                type: "action",
                title: "Review Platform Status",
                reason: "Confirm alerts and jobs",
                urgency: "medium",
                relatedRoute: "/admin/nexus/mission-control",
              },
              estimatedLaunchReadiness: {
                score: 75,
                status: "ready",
                summary: "Ready",
                blockers: [],
                factors: {
                  platformHealth: 80,
                  openIncidents: 90,
                  failedJobs: 85,
                  appStoreReadiness: 70,
                  betaFeedback: 75,
                  operationalStability: 68,
                },
              },
              rankedItems: [],
            },
            launchReadiness: {
              score: 75,
              status: "ready",
              summary: "Ready",
              blockers: [],
              factors: {
                platformHealth: 80,
                openIncidents: 90,
                failedJobs: 85,
                appStoreReadiness: 70,
                betaFeedback: 75,
                operationalStability: 68,
              },
            },
            recommendedActions: ["Review Platform Status"],
            readOnly: true,
          },
        },
      },
      { founderMode: "founder" },
    );

    assert.match(text, /Morning briefing/i);
    assert.match(text, /Biggest opportunity/i);
    assert.match(text, /Top actions/i);
  });
});

describe("runNexusVoiceAssistant founder mode", () => {
  it("acknowledges mode switch without running tools", async () => {
    const result = await runNexusVoiceAssistant(
      "Switch to operator mode",
      {} as never,
      "admin-1",
      { isPlatformOwner: true },
    );

    assert.equal(result.tool, null);
    assert.equal(result.founderMode, "operator");
    assert.match(result.response, /Operator mode enabled/i);
    assert.match(result.response, /Platform Health/i);
  });
});

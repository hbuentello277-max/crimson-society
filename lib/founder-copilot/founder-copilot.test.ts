import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatFounderQuestionResponse } from "@/lib/admin/nexus-voice/founder-formatters";
import { resolveFounderQuestionType } from "@/lib/founder-copilot/questions";
import { resolveNexusVoiceTool } from "@/lib/admin/nexus-voice/routing";
import { runNexusVoiceAssistant } from "@/lib/admin/nexus-voice/assistant";

describe("resolveFounderQuestionType", () => {
  it("maps supported founder questions", () => {
    assert.equal(resolveFounderQuestionType("What should I focus on today?"), "focus_today");
    assert.equal(resolveFounderQuestionType("What is blocking launch?"), "launch_blockers");
    assert.equal(resolveFounderQuestionType("What changed today?"), "changed_today");
    assert.equal(resolveFounderQuestionType("What is the biggest risk?"), "biggest_risk");
    assert.equal(resolveFounderQuestionType("How healthy is Crimson Society?"), "platform_health");
    assert.equal(resolveFounderQuestionType("What should I do next?"), "next_steps");
    assert.equal(resolveFounderQuestionType("What should I focus on?"), "focus_today");
    assert.equal(resolveFounderQuestionType("Are we launch ready?"), "launch_readiness");
    assert.equal(resolveFounderQuestionType("What is my biggest risk?"), "biggest_risk");
    assert.equal(resolveFounderQuestionType("What is the biggest opportunity?"), "biggest_opportunity");
    assert.equal(resolveFounderQuestionType("What matters most today?"), "matters_today");
  });
});

describe("resolveNexusVoiceTool founder patterns", () => {
  it("routes founder questions to answerFounderQuestion", () => {
    assert.equal(resolveNexusVoiceTool("What should I focus on today?"), "answerFounderQuestion");
    assert.equal(resolveNexusVoiceTool("How healthy is Crimson Society?"), "answerFounderQuestion");
    assert.equal(resolveNexusVoiceTool("Founder briefing"), "getFounderBriefing");
    assert.equal(resolveNexusVoiceTool("Give me a founder briefing."), "getFounderBriefing");
    assert.equal(resolveNexusVoiceTool("Are we launch ready?"), "answerFounderQuestion");
    assert.equal(resolveNexusVoiceTool("Founder recommendations"), "getFounderRecommendations");
    assert.equal(resolveNexusVoiceTool("Founder timeline"), "getFounderTimeline");
    assert.equal(resolveNexusVoiceTool("What is the biggest opportunity?"), "answerFounderQuestion");
    assert.equal(resolveNexusVoiceTool("What matters most today?"), "answerFounderQuestion");
  });
});

describe("formatFounderQuestionResponse", () => {
  it("formats launch blockers with structured guidance", () => {
    const text = formatFounderQuestionResponse({
      tool: "answerFounderQuestion",
      data: {
        questionType: "launch_blockers",
        data: { launchBlockers: ["2 critical alert(s) open", "1 failed platform job(s)"] },
      },
    });
    assert.match(text, /Situation:/i);
    assert.match(text, /Launch blockers/i);
    assert.match(text, /critical alert/i);
    assert.match(text, /Next action:/i);
  });

  it("formats launch readiness with ready and blocked sections", () => {
    const text = formatFounderQuestionResponse({
      tool: "answerFounderQuestion",
      data: {
        questionType: "launch_readiness",
        data: {
          launchReadiness: {
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
          },
        },
      },
    });
    assert.match(text, /Situation:/i);
    assert.match(text, /72\/100/i);
    assert.match(text, /Ready systems/i);
  });

  it("formats focus today with structured guidance", () => {
    const text = formatFounderQuestionResponse({
      tool: "answerFounderQuestion",
      data: {
        questionType: "focus_today",
        data: {
          priority: {
            generatedAt: new Date().toISOString(),
            highestPriorityIssue: null,
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
    });
    assert.match(text, /Situation:/i);
    assert.match(text, /Resolve critical alerts/i);
    assert.match(text, /Next action:/i);
  });
});

describe("runNexusVoiceAssistant founder access", () => {
  it("denies founder copilot for non-owners", async () => {
    const result = await runNexusVoiceAssistant(
      "What should I focus on today?",
      {} as never,
      "admin-1",
      { isPlatformOwner: false },
    );

    assert.equal(result.tool, null);
    assert.match(result.response, /platform owners only/i);
  });
});

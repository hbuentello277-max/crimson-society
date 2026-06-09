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
  });
});

describe("resolveNexusVoiceTool founder patterns", () => {
  it("routes founder questions to answerFounderQuestion", () => {
    assert.equal(resolveNexusVoiceTool("What should I focus on today?"), "answerFounderQuestion");
    assert.equal(resolveNexusVoiceTool("How healthy is Crimson Society?"), "answerFounderQuestion");
    assert.equal(resolveNexusVoiceTool("Founder briefing"), "getFounderBriefing");
    assert.equal(resolveNexusVoiceTool("Founder recommendations"), "getFounderRecommendations");
    assert.equal(resolveNexusVoiceTool("Founder timeline"), "getFounderTimeline");
  });
});

describe("formatFounderQuestionResponse", () => {
  it("formats launch blockers", () => {
    const text = formatFounderQuestionResponse({
      tool: "answerFounderQuestion",
      data: {
        questionType: "launch_blockers",
        data: { launchBlockers: ["2 critical alert(s) open", "1 failed platform job(s)"] },
      },
    });
    assert.match(text, /Launch blockers/i);
    assert.match(text, /critical alert/i);
  });

  it("formats focus today", () => {
    const text = formatFounderQuestionResponse({
      tool: "answerFounderQuestion",
      data: {
        questionType: "focus_today",
        data: {
          focus: [{ title: "Resolve critical alerts", reason: "2 critical alerts open" }],
        },
      },
    });
    assert.match(text, /Focus today/i);
    assert.match(text, /critical alerts/i);
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

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveLaunchReadinessStatus } from "@/lib/proactive-intelligence/launch-readiness";
import { resolveFounderQuestionType } from "@/lib/founder-copilot/questions";
import { resolveNexusVoiceTool } from "@/lib/admin/nexus-voice/routing";

describe("deriveLaunchReadinessStatus", () => {
  it("maps score bands to readiness status", () => {
    assert.equal(deriveLaunchReadinessStatus(90), "strong");
    assert.equal(deriveLaunchReadinessStatus(75), "ready");
    assert.equal(deriveLaunchReadinessStatus(60), "approaching");
    assert.equal(deriveLaunchReadinessStatus(40), "not_ready");
  });
});

describe("Phase 8 voice commands", () => {
  it("maps proactive founder questions", () => {
    assert.equal(resolveFounderQuestionType("What should I focus on?"), "focus_today");
    assert.equal(resolveFounderQuestionType("What is my biggest risk?"), "biggest_risk");
    assert.equal(resolveFounderQuestionType("Are we launch ready?"), "launch_readiness");
    assert.equal(resolveFounderQuestionType("What changed today?"), "changed_today");
  });

  it("routes proactive voice tools", () => {
    assert.equal(resolveNexusVoiceTool("Give me a founder briefing."), "getFounderBriefing");
    assert.equal(resolveNexusVoiceTool("Are we launch ready?"), "answerFounderQuestion");
    assert.equal(resolveNexusVoiceTool("Give me the morning briefing"), "getMorningBriefing");
    assert.equal(resolveNexusVoiceTool("What should I focus on?"), "answerFounderQuestion");
  });
});

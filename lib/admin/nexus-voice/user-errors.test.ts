import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isOpenAiQuotaOrRateLimitError,
  NEXUS_VOICE_TRANSCRIPTION_UNAVAILABLE_MESSAGE,
  toNexusVoiceUserError,
} from "@/lib/admin/nexus-voice/user-errors";

describe("nexus voice user errors", () => {
  it("detects OpenAI quota failures", () => {
    assert.equal(
      isOpenAiQuotaOrRateLimitError({
        status: 429,
        message: "You exceeded your current quota, please check your plan and billing details.",
      }),
      true,
    );
  });

  it("maps quota failures to a friendly transcription message", () => {
    const result = toNexusVoiceUserError({
      status: 429,
      message: "429 You exceeded your current quota, please check your plan and billing details.",
    });

    assert.equal(result.message, NEXUS_VOICE_TRANSCRIPTION_UNAVAILABLE_MESSAGE);
    assert.equal(result.transcriptionUnavailable, true);
    assert.doesNotMatch(result.message, /openai/i);
    assert.doesNotMatch(result.message, /docs\./i);
  });

  it("keeps generic failures user-safe", () => {
    const result = toNexusVoiceUserError(new Error("upstream socket reset"));
    assert.equal(result.transcriptionUnavailable, false);
    assert.equal(result.message, "NEXUS voice request failed. Try again or type a command.");
  });
});

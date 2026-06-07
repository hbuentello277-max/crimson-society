import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  getAiAnalysisConfigStatus,
  getDefaultNexusAiModel,
  isOpenAiApiKeyConfigured,
  resolveNexusAiModel,
} from "@/lib/ai-analysis/config";

const ORIGINAL_API_KEY = process.env.OPENAI_API_KEY;
const ORIGINAL_MODEL = process.env.OPENAI_NEXUS_MODEL;

afterEach(() => {
  if (ORIGINAL_API_KEY === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = ORIGINAL_API_KEY;
  }

  if (ORIGINAL_MODEL === undefined) {
    delete process.env.OPENAI_NEXUS_MODEL;
  } else {
    process.env.OPENAI_NEXUS_MODEL = ORIGINAL_MODEL;
  }
});

describe("ai analysis config", () => {
  it("detects missing API key", () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_NEXUS_MODEL;

    assert.equal(isOpenAiApiKeyConfigured(), false);
    const status = getAiAnalysisConfigStatus();
    assert.equal(status.configured, false);
    assert.equal(status.api_key_detected, false);
    assert.equal(status.model, getDefaultNexusAiModel());
    assert.equal(status.model_source, "default");
  });

  it("detects configured API key and custom model", () => {
    process.env.OPENAI_API_KEY = "sk-test-key";
    process.env.OPENAI_NEXUS_MODEL = "o4-mini";

    assert.equal(isOpenAiApiKeyConfigured(), true);
    assert.equal(resolveNexusAiModel(), "o4-mini");

    const status = getAiAnalysisConfigStatus();
    assert.equal(status.configured, true);
    assert.equal(status.api_key_detected, true);
    assert.equal(status.model, "o4-mini");
    assert.equal(status.model_source, "env");
  });
});

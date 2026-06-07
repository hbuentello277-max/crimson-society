import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AI_ANALYSIS_USER_MESSAGES,
  AiAnalysisError,
  mapOpenAiError,
} from "@/lib/ai-analysis/errors";
import {
  APIConnectionError,
  APIConnectionTimeoutError,
  AuthenticationError,
  InternalServerError,
  RateLimitError,
} from "openai";

describe("mapOpenAiError", () => {
  it("maps missing configuration", () => {
    const mapped = mapOpenAiError(
      new AiAnalysisError({
        code: "not_configured",
        status: 503,
        userMessage: AI_ANALYSIS_USER_MESSAGES.not_configured,
      }),
    );

    assert.equal(mapped.userMessage, AI_ANALYSIS_USER_MESSAGES.not_configured);
    assert.equal(mapped.code, "not_configured");
  });

  it("maps authentication failures to not configured", () => {
    const mapped = mapOpenAiError(
      new AuthenticationError(401, { code: "invalid_api_key" }, "invalid api key", new Headers()),
    );

    assert.equal(mapped.userMessage, AI_ANALYSIS_USER_MESSAGES.not_configured);
    assert.equal(mapped.code, "not_configured");
  });

  it("maps quota errors to billing unavailable", () => {
    const mapped = mapOpenAiError(
      new RateLimitError(
        429,
        { code: "insufficient_quota", message: "You exceeded your current quota" },
        "quota exceeded",
        new Headers(),
      ),
    );

    assert.equal(mapped.userMessage, AI_ANALYSIS_USER_MESSAGES.billing_unavailable);
    assert.equal(mapped.code, "billing_unavailable");
  });

  it("maps upstream failures to service unavailable", () => {
    const mapped = mapOpenAiError(
      new InternalServerError(500, { message: "server error" }, "server error", new Headers()),
    );

    assert.equal(mapped.userMessage, AI_ANALYSIS_USER_MESSAGES.service_unavailable);
    assert.equal(mapped.code, "service_unavailable");
  });

  it("maps connection timeouts to service unavailable", () => {
    const mapped = mapOpenAiError(new APIConnectionTimeoutError());

    assert.equal(mapped.userMessage, AI_ANALYSIS_USER_MESSAGES.service_unavailable);
    assert.equal(mapped.code, "service_unavailable");
  });

  it("maps connection errors to service unavailable", () => {
    const mapped = mapOpenAiError(new APIConnectionError({ message: "network down" }));

    assert.equal(mapped.userMessage, AI_ANALYSIS_USER_MESSAGES.service_unavailable);
    assert.equal(mapped.code, "service_unavailable");
  });
});

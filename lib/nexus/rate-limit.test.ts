import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkOwnerApiAiRateLimit } from "@/lib/nexus/rate-limit";
import { NEXUS_OWNER_API_AI_LIMIT } from "@/lib/nexus/constants";

describe("checkOwnerApiAiRateLimit", () => {
  it("allows requests under the AI limit", () => {
    const ownerId = `ai-limit-test-${Date.now()}`;
    for (let index = 0; index < NEXUS_OWNER_API_AI_LIMIT; index += 1) {
      const result = checkOwnerApiAiRateLimit(ownerId);
      assert.equal(result.allowed, true);
    }
  });

  it("blocks requests above the AI limit", () => {
    const ownerId = `ai-limit-block-${Date.now()}`;
    for (let index = 0; index < NEXUS_OWNER_API_AI_LIMIT; index += 1) {
      checkOwnerApiAiRateLimit(ownerId);
    }

    const blocked = checkOwnerApiAiRateLimit(ownerId);
    assert.equal(blocked.allowed, false);
    if (!blocked.allowed) {
      assert.ok(blocked.retryAfterSeconds >= 1);
    }
  });
});

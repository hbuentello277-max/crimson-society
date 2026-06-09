import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createNexusVoiceConfirmationToken,
  verifyNexusVoiceConfirmationToken,
} from "@/lib/admin/nexus-voice/confirmation";

describe("nexus voice confirmation tokens", () => {
  it("creates and verifies a confirmation token", () => {
    const { token } = createNexusVoiceConfirmationToken({
      userId: "admin-123",
      tool: "createSystemAlertDraft",
      draft: {
        title: "Checkout delay",
        message: "Investigate checkout latency",
        severity: "warning",
      },
    });

    const verified = verifyNexusVoiceConfirmationToken(token, "admin-123");
    assert.equal(verified.ok, true);
    if (verified.ok) {
      assert.equal(verified.payload.tool, "createSystemAlertDraft");
      assert.equal(verified.payload.draft.title, "Checkout delay");
    }
  });

  it("rejects tokens for a different admin", () => {
    const { token } = createNexusVoiceConfirmationToken({
      userId: "admin-123",
      tool: "createRunbookDraft",
      draft: { title: "Outage runbook" },
    });

    const verified = verifyNexusVoiceConfirmationToken(token, "admin-999");
    assert.equal(verified.ok, false);
  });

  it("rejects tampered tokens", () => {
    const { token } = createNexusVoiceConfirmationToken({
      userId: "admin-123",
      tool: "createNexusObservationDraft",
      draft: { title: "Observation" },
    });

    const verified = verifyNexusVoiceConfirmationToken(`${token}x`, "admin-123");
    assert.equal(verified.ok, false);
  });
});

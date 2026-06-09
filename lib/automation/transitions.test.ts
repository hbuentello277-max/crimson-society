import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  automationStatusAfterAction,
  canTransitionAutomationStatus,
} from "@/lib/automation/transitions";

describe("automation status transitions", () => {
  it("allows proposed to approve, reject, or archive", () => {
    assert.equal(canTransitionAutomationStatus("proposed", "approve"), true);
    assert.equal(canTransitionAutomationStatus("proposed", "reject"), true);
    assert.equal(canTransitionAutomationStatus("proposed", "archive"), true);
  });

  it("allows approved to reject or archive only", () => {
    assert.equal(canTransitionAutomationStatus("approved", "approve"), false);
    assert.equal(canTransitionAutomationStatus("approved", "reject"), true);
    assert.equal(canTransitionAutomationStatus("approved", "archive"), true);
  });

  it("blocks archived transitions", () => {
    assert.equal(canTransitionAutomationStatus("archived", "approve"), false);
    assert.equal(canTransitionAutomationStatus("archived", "reject"), false);
    assert.equal(canTransitionAutomationStatus("archived", "archive"), false);
  });

  it("maps actions to target statuses", () => {
    assert.equal(automationStatusAfterAction("approve"), "approved");
    assert.equal(automationStatusAfterAction("reject"), "rejected");
    assert.equal(automationStatusAfterAction("archive"), "archived");
  });
});

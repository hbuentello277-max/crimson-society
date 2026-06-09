import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AutomationActionDbRow } from "@/lib/automation/types";
import {
  isAllowedOperatorExecutionType,
  resolveOperatorExecutionType,
} from "@/lib/operator/types";

function action(overrides: Partial<AutomationActionDbRow>): AutomationActionDbRow {
  return {
    id: "action-1",
    action_type: "monitoring",
    title: "Refresh health",
    summary: "summary",
    recommendation: "recommendation",
    source: "planning",
    status: "approved",
    approval_required: true,
    approved_at: null,
    approved_by: null,
    created_at: new Date().toISOString(),
    metadata: {},
    ...overrides,
  };
}

describe("resolveOperatorExecutionType", () => {
  it("rejects war room titles", () => {
    assert.equal(
      resolveOperatorExecutionType(action({ title: "Open War Room for checkout outage" })),
      null,
    );
  });

  it("rejects command-sourced actions", () => {
    assert.equal(resolveOperatorExecutionType(action({ source: "commands" })), null);
  });

  it("maps briefing titles to refresh_briefings", () => {
    assert.equal(
      resolveOperatorExecutionType(action({ title: "Generate weekly briefing" })),
      "refresh_briefings",
    );
  });

  it("maps monitoring actions to refresh_health", () => {
    assert.equal(
      resolveOperatorExecutionType(action({ action_type: "monitoring", source: "alerts" })),
      "refresh_health",
    );
  });
});

describe("isAllowedOperatorExecutionType", () => {
  it("accepts allowlisted refresh tasks only", () => {
    assert.equal(isAllowedOperatorExecutionType("refresh_health"), true);
    assert.equal(isAllowedOperatorExecutionType("stripe_refund"), false);
    assert.equal(isAllowedOperatorExecutionType("delete_user"), false);
  });
});

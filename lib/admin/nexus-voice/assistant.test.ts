import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatNexusVoiceResponse,
  resolveNexusVoiceTool,
  runNexusVoiceAssistant,
} from "@/lib/admin/nexus-voice/assistant";

describe("resolveNexusVoiceTool", () => {
  it("maps phase 2 member count phrases", () => {
    assert.equal(resolveNexusVoiceTool("How many members do we have?"), "getMemberCount");
  });

  it("maps phase 3 action read tools", () => {
    assert.equal(resolveNexusVoiceTool("Show pickup orders"), "getOrdersNeedingPickup");
    assert.equal(resolveNexusVoiceTool("Summarize pending reports"), "summarizePendingReports");
  });

  it("maps phase 3 confirmation tools", () => {
    assert.equal(resolveNexusVoiceTool("Create system alert"), "createSystemAlertDraft");
    assert.equal(resolveNexusVoiceTool("Draft weekly briefing"), "createAdminBriefingDraft");
    assert.equal(resolveNexusVoiceTool("Create runbook for outage"), "createRunbookDraft");
    assert.equal(resolveNexusVoiceTool("Prepare observation draft"), "createNexusObservationDraft");
  });

  it("maps phase 4 monitoring tools", () => {
    assert.equal(resolveNexusVoiceTool("NEXUS, check app health."), "getNexusSystemHealth");
    assert.equal(resolveNexusVoiceTool("NEXUS, check checkout issues."), "getCheckoutHealth");
    assert.equal(resolveNexusVoiceTool("NEXUS, check signup failures."), "getSignupHealth");
    assert.equal(resolveNexusVoiceTool("NEXUS, show media processing failures."), "getMediaProcessingHealth");
    assert.equal(resolveNexusVoiceTool("What needs my attention?"), "getDailyOperatorBriefing");
    assert.equal(resolveNexusVoiceTool("NEXUS, summarize today."), "getDailyOperatorBriefing");
  });

  it("returns null for unsupported commands", () => {
    assert.equal(resolveNexusVoiceTool("delete all users"), null);
    assert.equal(resolveNexusVoiceTool("run arbitrary sql"), null);
  });
});

describe("formatNexusVoiceResponse", () => {
  it("formats member count", () => {
    const text = formatNexusVoiceResponse("getMemberCount", {
      tool: "getMemberCount",
      data: { count: 42 },
    });
    assert.match(text, /42 members/);
  });

  it("includes partial warning for monitoring responses", () => {
    const text = formatNexusVoiceResponse("getCheckoutHealth", {
      tool: "getCheckoutHealth",
      data: { status: "warning", pendingOrders24h: 2, paidOrders24h: 1 },
      partial: true,
      warnings: ["Some monitoring data is unavailable in this environment."],
    });
    assert.match(text, /unavailable/i);
  });
});

describe("runNexusVoiceAssistant", () => {
  it("returns help for unknown commands without calling tools", async () => {
    const calls: string[] = [];
    const admin = {
      from(table: string) {
        calls.push(table);
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          neq() {
            return this;
          },
          gte() {
            return this;
          },
          or() {
            return this;
          },
          order() {
            return this;
          },
          limit() {
            return Promise.resolve({ data: [], error: null, count: 0 });
          },
        };
      },
    };

    const result = await runNexusVoiceAssistant("ban everyone now", admin as never, "admin-1");
    assert.equal(result.tool, null);
    assert.match(result.response, /platform stats/i);
    assert.equal(calls.length, 0);
  });

  it("requires confirmation for write action tools", async () => {
    const result = await runNexusVoiceAssistant(
      "Create system alert titled checkout delay",
      {} as never,
      "admin-1",
    );

    assert.equal(result.tool, "createSystemAlertDraft");
    assert.equal(result.requiresConfirmation, true);
    assert.ok(result.pendingConfirmation?.token);
    assert.match(result.response, /Confirm/i);
  });
});

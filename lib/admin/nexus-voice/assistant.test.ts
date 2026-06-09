import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatNexusVoiceResponse,
  resolveNexusVoiceTool,
  runNexusVoiceAssistant,
} from "@/lib/admin/nexus-voice/assistant";

describe("resolveNexusVoiceTool", () => {
  it("maps member count phrases", () => {
    assert.equal(resolveNexusVoiceTool("How many members do we have?"), "getMemberCount");
    assert.equal(resolveNexusVoiceTool("get member count"), "getMemberCount");
  });

  it("maps blackcard phrases", () => {
    assert.equal(resolveNexusVoiceTool("How many blackcard members?"), "getBlackcardCount");
  });

  it("maps recent signups phrases", () => {
    assert.equal(resolveNexusVoiceTool("Show recent signups"), "getRecentSignups");
  });

  it("maps pending reports phrases", () => {
    assert.equal(resolveNexusVoiceTool("Any pending reports?"), "getPendingReports");
  });

  it("maps revenue today phrases", () => {
    assert.equal(resolveNexusVoiceTool("What is revenue today?"), "getRevenueToday");
  });

  it("maps system status phrases", () => {
    assert.equal(resolveNexusVoiceTool("System status"), "getSystemStatus");
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

    const result = await runNexusVoiceAssistant("ban everyone now", admin as never);
    assert.equal(result.tool, null);
    assert.match(result.response, /member count/i);
    assert.equal(calls.length, 0);
  });
});

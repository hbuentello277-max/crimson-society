import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultImportanceForCategory, isMemoryCategory } from "@/lib/memory/categories";
import { NEXUS_PHASE_DEFINITIONS } from "@/lib/memory/phase-tracker";
import {
  extractMemoryTopic,
  resolveMemoryQueryIntent,
} from "@/lib/memory/retrieval";
import { parseFounderMemoryDraft } from "@/lib/memory/voice-parse";
import { resolveNexusVoiceTool } from "@/lib/admin/nexus-voice/routing";
import { runNexusVoiceAssistant } from "@/lib/admin/nexus-voice/assistant";
import { isNexusVoiceOwnerConfirmTool } from "@/lib/admin/nexus-voice/types";

describe("memory categories", () => {
  it("recognizes founder memory categories", () => {
    assert.equal(isMemoryCategory("decision"), true);
    assert.equal(isMemoryCategory("blocker"), true);
    assert.equal(defaultImportanceForCategory("blocker"), 8);
  });
});

describe("phase tracker definitions", () => {
  it("tracks completed phases through phase 8 and phase 9 in progress", () => {
    assert.equal(NEXUS_PHASE_DEFINITIONS.length, 9);
    assert.equal(NEXUS_PHASE_DEFINITIONS[8].phase_number, 9);
    assert.equal(NEXUS_PHASE_DEFINITIONS[8].status, "in_progress");
    assert.equal(NEXUS_PHASE_DEFINITIONS[7].status, "completed");
  });
});

describe("memory retrieval intents", () => {
  it("maps blocker and completed work queries", () => {
    assert.equal(resolveMemoryQueryIntent("What is still blocking launch?"), "launch_blockers");
    assert.equal(resolveMemoryQueryIntent("What did we finish this week?"), "completed_this_week");
    assert.equal(resolveMemoryQueryIntent("What phase are we on?"), "phase_status");
    assert.equal(extractMemoryTopic("What did we decide about Blackcard?"), "Blackcard");
  });
});

describe("founder memory voice parsing", () => {
  it("parses remember and blocker commands", () => {
    const remembered = parseFounderMemoryDraft('Remember that we use Platform Status instead of Mission wording.');
    assert.equal(remembered.memory_category, "technical_note");

    const blocker = parseFounderMemoryDraft("Mark this as a blocker: Vercel cron schedules blocked production deploys.");
    assert.equal(blocker.memory_category, "blocker");
    assert.equal(blocker.entry_type, "owner_note");
  });

  it("routes memory voice commands", () => {
    assert.equal(resolveNexusVoiceTool("Remember that Blackcard pricing is annual-first."), "createFounderMemoryDraft");
    assert.equal(resolveNexusVoiceTool("What phase are we on?"), "queryFounderMemory");
    assert.equal(resolveNexusVoiceTool("Summarize founder memory."), "queryFounderMemory");
    assert.equal(isNexusVoiceOwnerConfirmTool("createFounderMemoryDraft"), true);
  });
});

describe("founder memory write permissions", () => {
  it("denies founder memory capture for non-owners", async () => {
    const result = await runNexusVoiceAssistant(
      "Remember that launch copy should say Platform Status.",
      {} as never,
      "admin-1",
      { isPlatformOwner: false },
    );

    assert.equal(result.tool, null);
    assert.match(result.response, /platform owners only/i);
  });

  it("requires confirmation before saving founder memory for owners", async () => {
    const result = await runNexusVoiceAssistant(
      "Save this decision: keep founder memory read-only except confirmed voice capture.",
      {} as never,
      "owner-1",
      { isPlatformOwner: true },
    );

    assert.equal(result.tool, "createFounderMemoryDraft");
    assert.equal(result.requiresConfirmation, true);
    assert.ok(result.pendingConfirmation);
    assert.equal(result.pendingConfirmation?.details.memory_category, "decision");
  });
});

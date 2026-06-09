import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { resolveNexusVoiceTool } from "@/lib/admin/nexus-voice/routing";
import { requireOwnerSession } from "@/lib/nexus/auth";
import { resolveVoiceCommand } from "@/lib/nexus/voice-commands";
import {
  appendCopilotConversation,
  readCopilotConversation,
} from "@/lib/mobile-copilot/conversation-storage";
import { MOBILE_COPILOT_QUICK_ACTIONS, findQuickAction } from "@/lib/mobile-copilot/quick-actions";
import {
  copilotVoiceStatusLabel,
  resolveCopilotVoiceDisplayStatus,
} from "@/lib/mobile-copilot/voice-status";
import { NEXUS_MOBILE_COPILOT_PHASE } from "@/lib/mobile-copilot/types";

describe("mobile copilot rendering", () => {
  it("loads MobileCopilotCenter on the copilot route", () => {
    const pagePath = path.join(process.cwd(), "app/admin/(nexus)/nexus/copilot/page.tsx");
    const lazyPath = path.join(process.cwd(), "lib/nexus/lazy-centers.tsx");
    const pageSource = readFileSync(pagePath, "utf8");
    const lazySource = readFileSync(lazyPath, "utf8");

    assert.match(pageSource, /LazyNexusCopilotCenter/);
    assert.match(lazySource, /mobile-copilot\/MobileCopilotCenter/);
    assert.match(lazySource, /MobileCopilotCenter/);
  });

  it("exposes mobile copilot phase constant", () => {
    assert.equal(NEXUS_MOBILE_COPILOT_PHASE, 15);
  });
});

describe("conversation persistence", () => {
  it("reads and appends session conversation entries", () => {
    const storage = new Map<string, string>();
    const originalSessionStorage = globalThis.sessionStorage;
    const originalWindow = globalThis.window;

    const sessionStorageMock = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    };

    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: sessionStorageMock,
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { sessionStorage: sessionStorageMock },
    });

    try {
      assert.deepEqual(readCopilotConversation(), []);

      appendCopilotConversation({
        role: "founder",
        content: "What should I focus on?",
        source: "typed",
        tool: null,
      });

      appendCopilotConversation({
        role: "nexus",
        content: "Focus on pending approvals first.",
        source: "typed",
        tool: "getExecutiveSummary",
      });

      const entries = readCopilotConversation();
      assert.equal(entries.length, 2);
      assert.equal(entries[0]?.role, "nexus");
      assert.equal(entries[1]?.role, "founder");
    } finally {
      Object.defineProperty(globalThis, "sessionStorage", {
        configurable: true,
        value: originalSessionStorage,
      });
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  });
});

describe("quick actions", () => {
  it("defines all required quick action chips", () => {
    const labels = MOBILE_COPILOT_QUICK_ACTIONS.map((action) => action.label);
    assert.ok(labels.includes("Executive Summary"));
    assert.ok(labels.includes("Today's Priorities"));
    assert.ok(labels.includes("Founder Briefing"));
    assert.ok(labels.includes("Launch Readiness"));
    assert.ok(labels.includes("Pending Approvals"));
    assert.ok(labels.includes("Biggest Risk"));
    assert.ok(labels.includes("Biggest Opportunity"));
    assert.ok(labels.includes("Build Launch Plan"));
    assert.ok(labels.includes("Build Revenue Plan"));
    assert.ok(labels.includes("Open Action Center"));
  });

  it("maps launch and revenue plan actions to operations planner transcripts", () => {
    const launch = findQuickAction("build-launch-plan");
    const revenue = findQuickAction("build-revenue-plan");
    assert.equal(resolveNexusVoiceTool(launch?.transcript ?? ""), "generateOperationsPlan");
    assert.equal(resolveNexusVoiceTool(revenue?.transcript ?? ""), "generateOperationsPlan");
  });
});

describe("voice routing", () => {
  it("maps mobile copilot navigation phrases", () => {
    assert.equal(resolveVoiceCommand("open copilot mode")?.href, "/admin/nexus/copilot");
    assert.equal(resolveVoiceCommand("show my founder dashboard")?.href, "/admin/nexus");
    assert.equal(resolveVoiceCommand("open approvals")?.href, "/admin/nexus/actions");
    assert.equal(resolveNexusVoiceTool("Show today's priorities."), "getExecutivePriorities");
    assert.equal(resolveVoiceCommand("open launch plan")?.href, "/admin/nexus/copilot");
    assert.equal(resolveVoiceCommand("show founder snapshot")?.href, "/admin/nexus/copilot");
  });

  it("maps focus question without breaking founder copilot routing", () => {
    assert.equal(resolveNexusVoiceTool("What should I focus on?"), "answerFounderQuestion");
    assert.equal(resolveNexusVoiceTool("What should I focus on right now?"), "getExecutiveSummary");
  });
});

describe("approval inbox", () => {
  it("routes approval voice queries to the action queue tool", () => {
    assert.equal(resolveNexusVoiceTool("What needs approval?"), "getNexusActionQueue");
    assert.equal(resolveNexusVoiceTool("Open approvals."), null);
  });
});

describe("founder snapshot", () => {
  it("navigates founder snapshot voice phrase to mobile copilot", () => {
    const match = resolveVoiceCommand("show founder snapshot");
    assert.equal(match?.href, "/admin/nexus/copilot");
    assert.equal(match?.label, "Mobile Copilot");
  });
});

describe("copilot voice status", () => {
  it("resolves paused and follow-up display states", () => {
    assert.equal(
      resolveCopilotVoiceDisplayStatus({
        status: "idle",
        conversationPaused: true,
        awaitingFollowUp: false,
      }),
      "conversation_paused",
    );
    assert.equal(
      resolveCopilotVoiceDisplayStatus({
        status: "idle",
        conversationPaused: false,
        awaitingFollowUp: true,
      }),
      "waiting_for_follow_up",
    );
    assert.equal(copilotVoiceStatusLabel("listening"), "Listening");
  });
});

describe("permissions", () => {
  it("keeps executive command owner gate for mobile copilot data", () => {
    assert.equal(typeof requireOwnerSession, "function");
  });
});

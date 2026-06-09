import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSessionContextFromResult,
  formatConversationControlResponse,
  isFollowUpPhrase,
  resolveConversationControlCommand,
  resolveFollowUpTranscript,
  shouldResumeConversationListening,
} from "@/lib/admin/nexus-voice/conversation";

describe("conversation mode controls", () => {
  it("detects conversation voice commands", () => {
    assert.equal(resolveConversationControlCommand("start conversation mode"), "start_mode");
    assert.equal(resolveConversationControlCommand("stop conversation mode"), "stop_mode");
    assert.equal(resolveConversationControlCommand("end conversation"), "end_conversation");
    assert.equal(resolveConversationControlCommand("pause listening"), "pause_listening");
    assert.equal(resolveConversationControlCommand("resume listening"), "resume_listening");
  });

  it("formats control responses", () => {
    assert.match(formatConversationControlResponse("start_mode"), /Conversation mode is on/i);
    assert.match(formatConversationControlResponse("end_conversation"), /ended/i);
  });
});

describe("follow-up context", () => {
  it("detects follow-up phrases", () => {
    assert.equal(isFollowUpPhrase("open that"), true);
    assert.equal(isFollowUpPhrase("tell me more"), true);
    assert.equal(isFollowUpPhrase("what about launch?"), true);
    assert.equal(isFollowUpPhrase("how many members"), false);
  });

  it("resolves open that from navigation context", () => {
    const resolved = resolveFollowUpTranscript("open that", {
      lastTranscript: "open platform status",
      lastResponse: "Opening Platform Status.",
      lastTool: "navigate",
      lastNavigation: { href: "/admin/nexus/mission-control", label: "Platform Status" },
      lastFounderRecommendation: null,
      lastBlocker: null,
      lastActionItem: null,
    });
    assert.equal(resolved, "open Platform Status");
  });

  it("resolves launch follow-up", () => {
    const resolved = resolveFollowUpTranscript("what about launch?", {
      lastTranscript: "founder briefing",
      lastResponse: "Here is your briefing.",
      lastTool: "getFounderBriefing",
      lastNavigation: null,
      lastFounderRecommendation: null,
      lastBlocker: null,
      lastActionItem: null,
    });
    assert.equal(resolved, "what is blocking launch");
  });

  it("stores session context from assistant results", () => {
    const context = buildSessionContextFromResult("founder recommendations", {
      transcript: "founder recommendations",
      response: "Focus on checkout recovery.",
      tool: "getFounderRecommendations",
      actionResult: {
        tool: "getFounderRecommendations",
        data: {
          recommendedNextAction: { title: "Review checkout failures" },
          launchBlockers: ["Stripe webhook lag"],
        },
      },
    });

    assert.equal(context.lastTool, "getFounderRecommendations");
    assert.equal(context.lastFounderRecommendation, "Review checkout failures");
    assert.equal(context.lastBlocker, "Stripe webhook lag");
  });
});

describe("conversation resume rules", () => {
  it("resumes listening after successful voice turn", () => {
    const decision = shouldResumeConversationListening({
      conversationModeEnabled: true,
      conversationActive: true,
      conversationPaused: false,
      transcriptionUnavailable: false,
      recordingSupported: true,
      hadError: false,
      requiresConfirmation: false,
    });
    assert.equal(decision.shouldResumeListening, true);
    assert.equal(decision.nextStatus, "listening_followup");
  });

  it("does not auto-listen after errors", () => {
    const decision = shouldResumeConversationListening({
      conversationModeEnabled: true,
      conversationActive: true,
      conversationPaused: false,
      transcriptionUnavailable: false,
      recordingSupported: true,
      hadError: true,
      requiresConfirmation: false,
    });
    assert.equal(decision.shouldResumeListening, false);
    assert.equal(decision.reason, "error");
  });

  it("pauses conversation during confirmation", () => {
    const decision = shouldResumeConversationListening({
      conversationModeEnabled: true,
      conversationActive: true,
      conversationPaused: false,
      transcriptionUnavailable: false,
      recordingSupported: true,
      hadError: false,
      requiresConfirmation: true,
    });
    assert.equal(decision.shouldResumeListening, false);
    assert.equal(decision.reason, "confirmation_required");
  });

  it("supports typed follow-up when STT is unavailable", () => {
    const decision = shouldResumeConversationListening({
      conversationModeEnabled: true,
      conversationActive: true,
      conversationPaused: false,
      transcriptionUnavailable: true,
      recordingSupported: false,
      hadError: false,
      requiresConfirmation: false,
    });
    assert.equal(decision.shouldResumeListening, false);
    assert.equal(decision.nextStatus, "listening_followup");
    assert.equal(decision.reason, "typed_followup");
  });
});

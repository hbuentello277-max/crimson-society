import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ACTION_TYPE_CATEGORY, ACTION_TYPE_LABELS, NEXUS_ACTION_TYPES } from "@/lib/action-center/constants";
import {
  canMutateAction,
  canReadActionCategory,
  canReadActionType,
} from "@/lib/action-center/permissions";
import {
  canTransitionActionStatus,
  actionStatusAfterMutation,
} from "@/lib/action-center/transitions";
import {
  isNexusActionQueueQuery,
  resolveNexusActionDraftType,
} from "@/lib/action-center/voice";
import { resolveNexusVoiceTool } from "@/lib/admin/nexus-voice/routing";
import { runNexusVoiceAssistant } from "@/lib/admin/nexus-voice/assistant";

describe("action types", () => {
  it("covers communication, marketing, operational, and growth categories", () => {
    assert.equal(NEXUS_ACTION_TYPES.length, 21);
    assert.equal(ACTION_TYPE_CATEGORY.launch_announcement, "marketing");
    assert.equal(ACTION_TYPE_CATEGORY.weekly_report, "operational");
    assert.equal(ACTION_TYPE_CATEGORY.blackcard_conversion_campaign, "growth");
    assert.ok(ACTION_TYPE_LABELS.instagram_caption);
  });
});

describe("approval workflow", () => {
  it("allows approve from pending approval", () => {
    assert.equal(canTransitionActionStatus("pending_approval", "approve"), true);
    assert.equal(actionStatusAfterMutation("pending_approval", "approve"), "approved");
  });

  it("requires approved status before execute", () => {
    assert.equal(canTransitionActionStatus("pending_approval", "execute"), false);
    assert.equal(canTransitionActionStatus("approved", "execute"), true);
    assert.equal(actionStatusAfterMutation("approved", "execute"), "executed");
  });

  it("returns edited cards to pending approval", () => {
    assert.equal(actionStatusAfterMutation("approved", "edit"), "pending_approval");
  });
});

describe("permissions", () => {
  it("grants owners full category access", () => {
    assert.equal(canReadActionCategory("owner", "marketing"), true);
    assert.equal(canMutateAction("owner", "launch_announcement"), true);
  });

  it("limits admins to operational drafts", () => {
    assert.equal(canReadActionCategory("admin", "operational"), true);
    assert.equal(canReadActionCategory("admin", "marketing"), false);
    assert.equal(canReadActionType("admin", "weekly_report"), true);
    assert.equal(canReadActionType("admin", "instagram_caption"), false);
    assert.equal(canMutateAction("admin", "weekly_report"), false);
  });
});

describe("voice commands", () => {
  it("routes draft and queue phrases", () => {
    assert.equal(resolveNexusVoiceTool("Draft a launch announcement."), "prepareNexusActionDraft");
    assert.equal(resolveNexusVoiceTool("Create a Blackcard promotion."), "prepareNexusActionDraft");
    assert.equal(resolveNexusVoiceTool("Prepare a founder update."), "prepareNexusActionDraft");
    assert.equal(resolveNexusVoiceTool("Create a weekly report."), "prepareNexusActionDraft");
    assert.equal(resolveNexusVoiceTool("Generate an Instagram post."), "prepareNexusActionDraft");
    assert.equal(resolveNexusVoiceTool("Generate a TikTok caption."), "prepareNexusActionDraft");
    assert.equal(resolveNexusVoiceTool("Show pending actions."), "getNexusActionQueue");
    assert.equal(resolveNexusVoiceTool("What actions need approval?"), "getNexusActionQueue");
  });

  it("resolves action draft types from transcript", () => {
    assert.equal(resolveNexusActionDraftType("Draft a launch announcement"), "launch_announcement");
    assert.equal(resolveNexusActionDraftType("Generate an Instagram post"), "instagram_caption");
    assert.equal(isNexusActionQueueQuery("What should I approve today?"), true);
  });
});

describe("runNexusVoiceAssistant action center access", () => {
  it("denies action center tools for non-owners", async () => {
    const result = await runNexusVoiceAssistant(
      "Show pending actions.",
      {} as never,
      "admin-1",
      { isPlatformOwner: false },
    );

    assert.equal(result.tool, null);
    assert.match(result.response, /platform owners only/i);
  });
});

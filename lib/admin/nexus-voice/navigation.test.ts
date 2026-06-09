import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAccessVoiceNavigation,
  formatNexusVoiceNavigationDenied,
  resolveNexusVoiceNavigation,
} from "@/lib/admin/nexus-voice/navigation";
import { runNexusVoiceAssistant } from "@/lib/admin/nexus-voice/assistant";

describe("resolveNexusVoiceNavigation", () => {
  it("maps open platform status navigation", () => {
    const navigation = resolveNexusVoiceNavigation("Open Platform Status");
    assert.equal(navigation?.href, "/admin/nexus/mission-control");
    assert.equal(navigation?.label, "Platform Status");
    assert.equal(navigation?.access, "owner");
  });

  it("maps admin shop navigation", () => {
    const navigation = resolveNexusVoiceNavigation("Go to Shop Admin");
    assert.equal(navigation?.href, "/admin/shop");
    assert.equal(navigation?.access, "admin");
  });

  it("does not treat monitoring phrases as navigation", () => {
    assert.equal(resolveNexusVoiceNavigation("check platform health"), null);
    assert.equal(resolveNexusVoiceNavigation("are platform jobs healthy"), null);
  });
});

describe("canAccessVoiceNavigation", () => {
  it("allows admin routes for non-owners", () => {
    assert.equal(
      canAccessVoiceNavigation({ access: "admin" }, false),
      true,
    );
  });

  it("blocks owner routes for non-owners", () => {
    assert.equal(
      canAccessVoiceNavigation({ access: "owner" }, false),
      false,
    );
    assert.match(formatNexusVoiceNavigationDenied("Platform Status"), /owner access/i);
  });
});

describe("runNexusVoiceAssistant navigation", () => {
  it("returns navigation without confirmation", async () => {
    const result = await runNexusVoiceAssistant(
      "Open alerts",
      {} as never,
      "admin-1",
      { isPlatformOwner: true },
    );

    assert.equal(result.tool, null);
    assert.equal(result.requiresConfirmation, undefined);
    assert.equal(result.navigation?.href, "/admin/nexus/alerts");
    assert.match(result.response, /Opening Alerts/i);
  });

  it("denies owner navigation for admins without owner access", async () => {
    const result = await runNexusVoiceAssistant(
      "Open Platform Status",
      {} as never,
      "admin-1",
      { isPlatformOwner: false },
    );

    assert.equal(result.navigation, undefined);
    assert.match(result.response, /owner access/i);
  });

  it("still requires confirmation for write actions after navigation check", async () => {
    const result = await runNexusVoiceAssistant(
      "Create system alert titled outage",
      {} as never,
      "admin-1",
      { isPlatformOwner: true },
    );

    assert.equal(result.tool, "createSystemAlertDraft");
    assert.equal(result.requiresConfirmation, true);
  });
});

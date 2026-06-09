import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listVoiceCommandExamples, resolveVoiceCommand } from "@/lib/nexus/voice-commands";

describe("resolveVoiceCommand", () => {
  it("maps founder dashboard phrases", () => {
    const match = resolveVoiceCommand("Open founder dashboard");
    assert.equal(match?.href, "/admin/nexus");
    assert.equal(match?.label, "Founder");
    assert.equal(resolveVoiceCommand("Open founder")?.href, "/admin/nexus");
  });

  it("maps admin staff navigation targets", () => {
    assert.equal(resolveVoiceCommand("go to shop admin")?.href, "/admin/shop");
    assert.equal(resolveVoiceCommand("go to blackcard")?.href, "/admin/blackcard");
    assert.equal(resolveVoiceCommand("go to rewards")?.href, "/admin/rewards");
  });

  it("ignores monitoring phrases without navigation intent", () => {
    assert.equal(resolveVoiceCommand("check platform health"), null);
  });

  it("maps overview and commands", () => {
    assert.equal(resolveVoiceCommand("open overview")?.href, "/admin/nexus/overview");
    assert.equal(resolveVoiceCommand("open commands")?.href, "/admin/nexus/commands");
  });

  it("maps alerts incidents reports scenarios", () => {
    assert.equal(resolveVoiceCommand("open alerts")?.href, "/admin/nexus/alerts");
    assert.equal(resolveVoiceCommand("open incidents")?.href, "/admin/nexus/incidents");
    assert.equal(resolveVoiceCommand("open reports")?.href, "/admin/nexus/reports");
    assert.equal(resolveVoiceCommand("open scenarios")?.href, "/admin/nexus/scenarios");
  });

  it("maps platform health to mission-health route", () => {
    assert.equal(resolveVoiceCommand("open platform health")?.href, "/admin/nexus/mission-health");
    assert.equal(resolveVoiceCommand("open mission health")?.href, "/admin/nexus/mission-health");
    assert.equal(resolveVoiceCommand("open platform health")?.label, "Platform Health");
  });

  it("maps platform status to mission-control route", () => {
    assert.equal(resolveVoiceCommand("open platform status")?.href, "/admin/nexus/mission-control");
    assert.equal(resolveVoiceCommand("open mission control")?.href, "/admin/nexus/mission-control");
    assert.equal(resolveVoiceCommand("open platform status")?.label, "Platform Status");
  });

  it("returns null for unknown commands", () => {
    assert.equal(resolveVoiceCommand("approve refund"), null);
    assert.equal(resolveVoiceCommand("delete user"), null);
  });
});

describe("listVoiceCommandExamples", () => {
  it("returns navigation examples", () => {
    const examples = listVoiceCommandExamples();
    assert.ok(examples.length >= 8);
    assert.ok(examples.some((entry) => entry.href === "/admin/shop"));
    assert.ok(examples.some((entry) => entry.label === "Platform Status"));
  });
});

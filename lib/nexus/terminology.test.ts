import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatNexusDisplayText, NEXUS_LABELS } from "@/lib/nexus/terminology";

describe("formatNexusDisplayText", () => {
  it("replaces Mission Status with Platform Status", () => {
    assert.equal(formatNexusDisplayText("Mission Status is At Risk"), "Platform Status is At Risk");
  });

  it("replaces Mission Score with Platform Score", () => {
    assert.equal(formatNexusDisplayText("Mission Score 72"), `${NEXUS_LABELS.workflowHealthScore} 72`);
  });

  it("replaces Mission Health with Platform Health", () => {
    assert.equal(formatNexusDisplayText("Open Mission Health"), `Open ${NEXUS_LABELS.platformHealth}`);
  });

  it("replaces Mission Control with Platform Status", () => {
    assert.equal(formatNexusDisplayText("Review Mission Control"), `Review ${NEXUS_LABELS.platformStatus}`);
  });

  it("replaces Mission Operations with Platform Operations", () => {
    assert.equal(formatNexusDisplayText("Mission Operations summary"), "Platform Operations summary");
  });

  it("replaces Mission Intelligence with Platform Intelligence", () => {
    assert.equal(formatNexusDisplayText("Mission Intelligence briefing"), "Platform Intelligence briefing");
  });

  it("normalizes legacy scoring language", () => {
    assert.equal(
      formatNexusDisplayText("strategic mission scoring may weigh down mission status"),
      "strategic platform scoring may weigh down Platform Status",
    );
  });

  it("returns empty string for nullish input", () => {
    assert.equal(formatNexusDisplayText(null), "");
    assert.equal(formatNexusDisplayText(undefined), "");
  });
});

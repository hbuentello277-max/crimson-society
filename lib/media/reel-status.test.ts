import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getReelProcessingLabel } from "@/lib/media/reel-status";
import { isVideoDurationAllowed, videoDurationLimitMessage } from "@/lib/media";

describe("reel processing labels", () => {
  it("returns distinct queued and processing copy", () => {
    assert.equal(getReelProcessingLabel("queued"), "Reel queued for processing");
    assert.equal(getReelProcessingLabel("processing"), "Processing reel…");
    assert.equal(
      getReelProcessingLabel("failed"),
      "Reel processing failed. Try uploading again.",
    );
  });
});

describe("isVideoDurationAllowed", () => {
  it("allows up to 60 seconds and rejects longer reels", () => {
    assert.equal(isVideoDurationAllowed(59.2), true);
    assert.equal(isVideoDurationAllowed(60), true);
    assert.equal(isVideoDurationAllowed(60.4), false);
    assert.equal(isVideoDurationAllowed(70), false);
    assert.equal(videoDurationLimitMessage(), "Reels must be 60 seconds or less.");
  });
});

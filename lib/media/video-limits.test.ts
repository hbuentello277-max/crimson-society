import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  VIDEO_LIMIT_BYTES,
  VIDEO_LIMIT_MB,
  VIDEO_MAX_DURATION_SECONDS,
  videoDurationLimitMessage,
  videoFileSizeLimitMessage,
} from "@/lib/media";

describe("video beta limits", () => {
  it("uses Hobby-safe duration and size caps", () => {
    assert.equal(VIDEO_MAX_DURATION_SECONDS, 60);
    assert.equal(VIDEO_LIMIT_MB, 50);
    assert.equal(VIDEO_LIMIT_BYTES, 50 * 1024 * 1024);
  });

  it("surfaces maximum in user-facing messages", () => {
    assert.match(videoFileSizeLimitMessage(), /50 MB maximum/i);
    assert.equal(videoDurationLimitMessage(), "Reels must be 60 seconds or less.");
  });
});

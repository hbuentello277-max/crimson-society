import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { reelRenderPaths } from "@/lib/media/reel-paths";

describe("reelRenderPaths", () => {
  it("derives thumbnail and playback paths from the original", () => {
    const original = "user-1/videos/abc/ride-clip.mp4";
    assert.deepEqual(reelRenderPaths(original), {
      thumbnailPath: "user-1/videos/abc/thumbnail.jpg",
      playbackPath: "user-1/videos/abc/playback.mp4",
    });
  });
});

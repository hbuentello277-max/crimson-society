import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collectPostMediaPaths } from "@/lib/posts/post-media-paths";

describe("collectPostMediaPaths", () => {
  it("collects originals and render paths from post fields", () => {
    const result = collectPostMediaPaths({
      video_original_path: "user/videos/id/source.mov",
      video_playback_url: "https://example.supabase.co/storage/v1/object/public/media-renders/user/videos/id/playback.mp4",
      video_thumbnail_url: "user/videos/id/thumbnail.jpg",
    });

    assert.deepEqual(result.originals, ["user/videos/id/source.mov"]);
    assert.ok(result.renders.includes("user/videos/id/thumbnail.jpg"));
    assert.ok(result.renders.includes("user/videos/id/playback.mp4"));
  });
});

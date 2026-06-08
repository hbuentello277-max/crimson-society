import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getPostGridPreviewUrl,
  isReelProcessing,
} from "@/lib/posts/post-grid-media";

describe("post grid media", () => {
  it("detects processing reels", () => {
    assert.equal(isReelProcessing({ post_type: "reel", media_status: "queued" }), true);
    assert.equal(isReelProcessing({ post_type: "photo", media_status: "queued" }), false);
  });

  it("prefers reel thumbnail for reel posts", () => {
    const url = getPostGridPreviewUrl({
      post_type: "reel",
      video_thumbnail_url:
        "https://example.supabase.co/storage/v1/object/public/media-renders/u/v/t.jpg",
      image_display_url: "https://example.supabase.co/storage/v1/object/public/media-renders/u/i.jpg",
    });

    assert.ok(url?.includes("media-renders"));
    assert.ok(url?.includes("t.jpg") || url?.includes("render/image"));
  });
});

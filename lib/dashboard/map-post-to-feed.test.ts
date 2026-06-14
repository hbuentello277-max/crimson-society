import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapPostToFeed } from "@/lib/dashboard/map-post-to-feed";

describe("mapPostToFeed", () => {
  it("maps a photo post with profile and counts", () => {
    const feedPost = mapPostToFeed({
      id: "post-1",
      user_id: "user-1",
      post_type: "photo",
      caption: "Sunset run",
      image_url: "https://example.com/photo.jpg",
      location: "Austin",
      created_at: new Date(Date.now() - 5 * 60_000).toISOString(),
      profiles: {
        username: "rider1",
        display_name: "Rider One",
        profile_image_url: "https://example.com/avatar.jpg",
      },
      post_likes: [{ count: 3 }],
      post_comments: [{ count: 1 }],
    });

    assert.equal(feedPost.id, "post-1");
    assert.equal(feedPost.type, "photo");
    assert.equal(feedPost.author.handle, "@rider1");
    assert.equal(feedPost.author.name, "@rider1");
    assert.equal(feedPost.likes, 3);
    assert.equal(feedPost.comments, 1);
    assert.equal(feedPost.timeLabel, "5m");
    assert.equal(feedPost.photos?.[0], "https://example.com/photo.jpg");
  });

  it("maps a status post with defaults", () => {
    const feedPost = mapPostToFeed({
      id: "post-2",
      user_id: "user-2",
      post_type: "status",
      status_text: "Rolling out",
      status_bg: "crimson",
      created_at: new Date().toISOString(),
    });

    assert.equal(feedPost.type, "status");
    assert.equal(feedPost.statusText, "Rolling out");
    assert.equal(feedPost.statusBg, "crimson");
    assert.equal(feedPost.author.handle, "@unknown");
    assert.equal(feedPost.timeLabel, "Just now");
  });
});

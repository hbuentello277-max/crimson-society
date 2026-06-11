import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPostImageCount, getPostImageUrls } from "@/lib/posts/post-images";

describe("post images", () => {
  it("returns single-image posts from top-level columns", () => {
    const urls = getPostImageUrls({
      image_url: "https://example.com/one.jpg",
      media_metadata: {},
    });
    assert.deepEqual(urls, ["https://example.com/one.jpg"]);
    assert.equal(getPostImageCount({ image_url: "https://example.com/one.jpg" }), 1);
  });

  it("returns all images from media metadata", () => {
    const urls = getPostImageUrls({
      image_url: "https://example.com/cover.jpg",
      media_metadata: {
        image_count: 3,
        images: [
          { display_url: "https://example.com/cover.jpg" },
          { display_url: "https://example.com/two.jpg" },
          { display_url: "https://example.com/three.jpg" },
        ],
      },
    });
    assert.equal(urls.length, 3);
    assert.equal(getPostImageCount({ media_metadata: { images: urls.map((url) => ({ display_url: url })) } }), 3);
  });
});

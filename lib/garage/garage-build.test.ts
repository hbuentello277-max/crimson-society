import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatGarageBuildRideLabel,
  getGarageBuildPhotoUrls,
  isGarageBuildPost,
  parseGarageBuildMetadata,
} from "@/lib/garage/garage-build";

describe("garage build posts", () => {
  it("detects garage build post type", () => {
    assert.equal(isGarageBuildPost("garage_build"), true);
    assert.equal(isGarageBuildPost("photo"), false);
  });

  it("parses garage build metadata", () => {
    const parsed = parseGarageBuildMetadata({
      garage_build: {
        motorcycle_id: "bike-1",
        modification_title: "Installed Full Exhaust",
        motorcycle_name: "Yamaha R1",
        motorcycle_year: "2003",
        motorcycle_photo_url: "https://example.com/r1.jpg",
        photo_urls: ["https://example.com/build-1.jpg", "https://example.com/build-2.jpg"],
      },
    });
    assert.equal(parsed?.modification_title, "Installed Full Exhaust");
    assert.equal(formatGarageBuildRideLabel(parsed), "2003 Yamaha R1");
    assert.deepEqual(getGarageBuildPhotoUrls(parsed), [
      "https://example.com/build-1.jpg",
      "https://example.com/build-2.jpg",
    ]);
  });

  it("falls back to the primary post image when build metadata has no photos", () => {
    assert.deepEqual(getGarageBuildPhotoUrls(null, "https://example.com/primary.jpg"), [
      "https://example.com/primary.jpg",
    ]);
  });
});

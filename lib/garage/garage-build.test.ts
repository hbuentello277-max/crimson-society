import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatGarageBuildRideLabel,
  getGarageBuildPhotoUrls,
  isGarageBuildPost,
  parseGarageBuildMetadata,
  resolveGarageBuildRideImageUrl,
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

  it("resolves ride image from metadata or motorcycle lookup", () => {
    const parsed = parseGarageBuildMetadata({
      garage_build: {
        motorcycle_id: "bike-1",
        motorcycle_photo_url: "https://example.com/bike.jpg",
      },
    });
    assert.equal(resolveGarageBuildRideImageUrl(parsed), "https://example.com/bike.jpg");

    const fromLookup = parseGarageBuildMetadata({
      garage_build: { motorcycle_id: "bike-2" },
    });
    const photos = new Map([["bike-2", "https://example.com/lookup.jpg"]]);
    assert.equal(resolveGarageBuildRideImageUrl(fromLookup, photos), "https://example.com/lookup.jpg");
  });
});

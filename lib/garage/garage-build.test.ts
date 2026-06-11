import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatGarageBuildRideLabel,
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
      },
    });
    assert.equal(parsed?.modification_title, "Installed Full Exhaust");
    assert.equal(formatGarageBuildRideLabel(parsed), "2003 Yamaha R1");
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

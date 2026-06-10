import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAppleMapsDirectionsUrl,
  buildGoogleMapsDirectionsUrl,
  buildMapsDirectionsUrl,
  hasMapsNavigationTarget,
} from "@/lib/meets/maps-links";

describe("maps-links", () => {
  it("builds Apple Maps directions to coordinates", () => {
    const url = buildAppleMapsDirectionsUrl({ lat: 29.4241, lng: -98.4936, label: "Meet" });
    assert.match(url, /^https:\/\/maps\.apple\.com\/\?/);
    assert.match(url, /daddr=29\.4241%2C-98\.4936/);
    assert.match(url, /dirflg=d/);
  });

  it("builds Google Maps directions to coordinates", () => {
    const url = buildGoogleMapsDirectionsUrl({ lat: 29.4241, lng: -98.4936 });
    assert.match(url, /^https:\/\/www\.google\.com\/maps\/dir\/\?/);
    assert.match(url, /destination=29\.4241%2C-98\.4936/);
    assert.match(url, /travelmode=driving/);
  });

  it("defaults to Google Maps on non-mobile user agents", () => {
    const url = buildMapsDirectionsUrl({ lat: 1, lng: 2 });
    assert.match(url, /google\.com\/maps/);
  });

  it("validates navigation targets", () => {
    assert.equal(hasMapsNavigationTarget({ lat: 1, lng: 2 }), true);
    assert.equal(hasMapsNavigationTarget({ lat: Number.NaN, lng: 2 }), false);
    assert.equal(hasMapsNavigationTarget(null), false);
  });
});

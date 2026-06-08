import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasRoadGeometry,
  isNearlyStraightLineGeometry,
  maxRouteChordDeviationMeters,
  needsRouteRepair,
} from "@/lib/meets/route-geometry";

describe("route geometry repair detection", () => {
  const meet = { lat: 29.4241, lng: -98.4936 };
  const destination = { lat: 29.5, lng: -98.4 };

  it("flags two-point endpoint geometry as weak", () => {
    const route = [meet, destination];
    assert.equal(isNearlyStraightLineGeometry(route), true);
    assert.equal(hasRoadGeometry(route), false);
    assert.equal(needsRouteRepair(route), true);
  });

  it("flags disguised straight polylines as weak", () => {
    const midpoint = (from: typeof meet, to: typeof destination, ratio: number) => ({
      lat: from.lat + (to.lat - from.lat) * ratio,
      lng: from.lng + (to.lng - from.lng) * ratio,
    });
    const route = [meet, midpoint(meet, destination, 0.33), midpoint(meet, destination, 0.66), destination];

    assert.equal(maxRouteChordDeviationMeters(route) < 1, true);
    assert.equal(hasRoadGeometry(route), false);
    assert.equal(needsRouteRepair(route), true);
  });

  it("accepts geometry with meaningful road deviation", () => {
    const route = [
      meet,
      { lat: 29.43, lng: -98.52 },
      { lat: 29.48, lng: -98.55 },
      destination,
    ];

    assert.equal(hasRoadGeometry(route), true);
    assert.equal(needsRouteRepair(route), false);
  });
});

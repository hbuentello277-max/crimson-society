import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyMonotonicRouteProgress,
  computeRouteProgress,
} from "@/lib/meets/navigation/progress";
import type { NavigationRoute } from "@/lib/meets/navigation/types";

const route: NavigationRoute = {
  meetId: "meet-1",
  points: [
    { lat: 29.4241, lng: -98.4936 },
    { lat: 29.4251, lng: -98.4926 },
    { lat: 29.4261, lng: -98.4916 },
  ],
  segments: [
    {
      index: 0,
      start: { lat: 29.4241, lng: -98.4936 },
      end: { lat: 29.4251, lng: -98.4926 },
      distanceMiles: 0.08,
    },
    {
      index: 1,
      start: { lat: 29.4251, lng: -98.4926 },
      end: { lat: 29.4261, lng: -98.4916 },
      distanceMiles: 0.08,
    },
  ],
  steps: [],
  totalDistanceMiles: 0.16,
  meetPoint: "Start",
  destination: "End",
  plannedDistanceLabel: "0.16 mi",
  plannedDurationLabel: "5 min",
};

function positionAt(point: { lat: number; lng: number }) {
  return {
    ...point,
    accuracy: 5,
    heading: null,
    speedMph: 25,
    timestamp: Date.now(),
  };
}

describe("applyMonotonicRouteProgress", () => {
  it("does not let traveled distance regress when GPS snaps backward", () => {
    const ahead = computeRouteProgress(route, positionAt(route.points[2]));
    const behind = computeRouteProgress(route, positionAt(route.points[0]));
    const monotonic = applyMonotonicRouteProgress(ahead, behind);

    assert.ok(monotonic.distanceTraveledMiles >= ahead.distanceTraveledMiles);
    assert.ok(monotonic.percentComplete >= ahead.percentComplete);
    assert.equal(monotonic.currentRouteIndex, ahead.currentRouteIndex);
  });

  it("advances progress when rider moves forward", () => {
    const start = computeRouteProgress(route, positionAt(route.points[0]));
    const middle = computeRouteProgress(route, positionAt(route.points[1]));
    const monotonic = applyMonotonicRouteProgress(start, middle);

    assert.ok(monotonic.distanceTraveledMiles >= start.distanceTraveledMiles);
    assert.ok(monotonic.currentRouteIndex >= start.currentRouteIndex);
  });
});

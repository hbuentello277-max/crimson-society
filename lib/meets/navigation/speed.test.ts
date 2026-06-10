import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatSpeedHudLabel,
  resolveCurrentSpeedMph,
  updateSessionMaxSpeedMph,
} from "@/lib/meets/navigation/speed";
import type { NavigationPosition } from "@/lib/meets/navigation/types";

function positionAt(
  point: { lat: number; lng: number },
  overrides: Partial<NavigationPosition> = {},
): NavigationPosition {
  return {
    lat: point.lat,
    lng: point.lng,
    accuracy: 5,
    heading: null,
    speedMph: null,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("resolveCurrentSpeedMph", () => {
  it("uses browser GPS speed when available", () => {
    const speed = resolveCurrentSpeedMph(positionAt({ lat: 1, lng: 1 }, { speedMph: 24.6 }), null);
    assert.equal(speed, 25);
  });

  it("derives speed from distance and elapsed time when GPS speed is missing", () => {
    const previous = positionAt({ lat: 29.4241, lng: -98.4936 }, { timestamp: 1_000 });
    const next = positionAt({ lat: 29.4251, lng: -98.4926 }, { timestamp: 91_000 });
    const speed = resolveCurrentSpeedMph(next, previous);
    assert.ok(speed > 0);
  });

  it("returns 0 mph when stationary or unavailable", () => {
    assert.equal(resolveCurrentSpeedMph(null, null), 0);
    assert.equal(resolveCurrentSpeedMph(positionAt({ lat: 1, lng: 1 }, { speedMph: 1.2 }), null), 0);
  });
});

describe("updateSessionMaxSpeedMph", () => {
  it("tracks the highest speed for the session", () => {
    assert.equal(updateSessionMaxSpeedMph(40, 24), 40);
    assert.equal(updateSessionMaxSpeedMph(40, 61), 61);
    assert.equal(updateSessionMaxSpeedMph(61, 0), 61);
  });
});

describe("formatSpeedHudLabel", () => {
  it("formats mph labels for the HUD", () => {
    assert.equal(formatSpeedHudLabel(24.2), "24 mph");
    assert.equal(formatSpeedHudLabel(0), "0 mph");
  });
});

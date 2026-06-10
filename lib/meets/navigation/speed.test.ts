import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatSpeedHudLabel,
  MAX_REALISTIC_MOTORCYCLE_SPEED_MPH,
  resolveCurrentSpeedMph,
  speedMphFromGeolocationMetersPerSecond,
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
  it("uses browser GPS speed when available and plausible", () => {
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

  it("discards corrupt GPS speed that would have produced 5502 mph on max-speed HUD", () => {
    // 5502 mph ÷ 2.2369362921 ≈ 2459.61 m/s — absurd Geolocation API spike
    const corruptMps = 5502 / 2.2369362921;
    const speedMph = speedMphFromGeolocationMetersPerSecond(corruptMps);
    assert.equal(speedMph, null);

    const resolved = resolveCurrentSpeedMph(
      positionAt({ lat: 1, lng: 1 }, { speedMph: 5502 }),
      null,
    );
    assert.equal(resolved, 0);
  });

  it("discards derived speed from GPS position teleport with tiny elapsed time", () => {
    const previous = positionAt({ lat: 29.4241, lng: -98.4936 }, { timestamp: 1_000 });
  // ~123 m east in 50 ms would have been ~5502 mph before sanity filtering
    const next = positionAt({ lat: 29.4241, lng: -98.4922 }, { timestamp: 1_050 });
    const speed = resolveCurrentSpeedMph(next, previous);
    assert.equal(speed, 0);
  });

  it("accepts realistic highway speeds up to the motorcycle cap", () => {
    const speed = resolveCurrentSpeedMph(
      positionAt({ lat: 1, lng: 1 }, { speedMph: MAX_REALISTIC_MOTORCYCLE_SPEED_MPH }),
      null,
    );
    assert.equal(speed, MAX_REALISTIC_MOTORCYCLE_SPEED_MPH);
  });

  it("discards speeds above the motorcycle cap", () => {
    const speed = resolveCurrentSpeedMph(
      positionAt({ lat: 1, lng: 1 }, { speedMph: MAX_REALISTIC_MOTORCYCLE_SPEED_MPH + 1 }),
      null,
    );
    assert.equal(speed, 0);
  });
});

describe("formatSpeedHudLabel", () => {
  it("formats mph labels for the HUD", () => {
    assert.equal(formatSpeedHudLabel(24.2), "24 mph");
    assert.equal(formatSpeedHudLabel(0), "0 mph");
  });

  it("never formats impossible speeds", () => {
    assert.equal(formatSpeedHudLabel(5502), "0 mph");
  });
});

describe("speedMphFromGeolocationMetersPerSecond", () => {
  it("converts plausible m/s to mph", () => {
    const mph = speedMphFromGeolocationMetersPerSecond(10);
    assert.ok(mph !== null && mph > 20 && mph < 25);
  });
});

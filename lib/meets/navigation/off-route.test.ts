import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BACK_ON_ROUTE_BANNER_MESSAGE,
  calculateRouteDeviation,
  createOffRouteTracker,
  OFF_ROUTE_BANNER_MESSAGE,
  OFF_ROUTE_THRESHOLD_METERS,
  RETURN_TO_ROUTE_THRESHOLD_METERS,
  stepOffRouteTracker,
} from "@/lib/meets/navigation/off-route";

const ROUTE = [
  { lat: 29.4241, lng: -98.4936 },
  { lat: 29.4251, lng: -98.4926 },
  { lat: 29.4261, lng: -98.4916 },
];

function offsetPoint(
  point: { lat: number; lng: number },
  metersEast: number,
  metersNorth = 0,
) {
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = 111_320 * Math.cos((point.lat * Math.PI) / 180);

  return {
    lat: point.lat + metersNorth / metersPerDegreeLat,
    lng: point.lng + metersEast / metersPerDegreeLng,
  };
}

function positionAt(point: { lat: number; lng: number }) {
  return {
    ...point,
    accuracy: 5,
    heading: null,
    speedMph: 25,
    timestamp: Date.now(),
  };
}

describe("calculateRouteDeviation", () => {
  it("reports on-route distance near zero for a point on the polyline", () => {
    const deviation = calculateRouteDeviation(ROUTE, positionAt(ROUTE[1]));
    assert.ok(deviation);
    assert.ok(deviation.distanceFromRouteMeters < 5);
    assert.equal(deviation.isBeyondOffRouteThreshold, false);
    assert.equal(deviation.isWithinReturnThreshold, true);
  });

  it("does not flag moderate deviation as off route", () => {
    const point = offsetPoint(ROUTE[1], 50);
    const deviation = calculateRouteDeviation(ROUTE, positionAt(point));
    assert.ok(deviation);
    assert.ok(deviation.distanceFromRouteMeters < OFF_ROUTE_THRESHOLD_METERS);
    assert.equal(deviation.isBeyondOffRouteThreshold, false);
  });

  it("flags 200m deviation as beyond the off-route threshold", () => {
    const point = offsetPoint(ROUTE[1], 200);
    const deviation = calculateRouteDeviation(ROUTE, positionAt(point));
    assert.ok(deviation);
    assert.ok(deviation.distanceFromRouteMeters > OFF_ROUTE_THRESHOLD_METERS);
    assert.equal(deviation.isBeyondOffRouteThreshold, true);
    assert.equal(deviation.isWithinReturnThreshold, false);
  });
});

describe("stepOffRouteTracker", () => {
  it("keeps rider on route without warnings when near the polyline", () => {
    const tracker = createOffRouteTracker();
    let now = 1_000;

    for (let index = 0; index < 5; index += 1) {
      const result = stepOffRouteTracker(
        tracker,
        ROUTE,
        positionAt(ROUTE[1]),
        now,
        { offRouteConfirmMs: 100, returnConfirmMs: 100 },
      );
      now += 1000;
      if (index === 4) {
        assert.equal(result.state.offRouteStatus, "on_route");
        assert.equal(result.state.bannerMessage, null);
      }
    }
  });

  it("confirms off route after sustained deviation beyond 150m", () => {
    const tracker = createOffRouteTracker();
    const farPoint = offsetPoint(ROUTE[1], 200);
    let now = 1_000;
    let offRouteBannerShown = false;

    for (let index = 0; index < 6; index += 1) {
      const result = stepOffRouteTracker(
        tracker,
        ROUTE,
        positionAt(farPoint),
        now,
        { offRouteConfirmMs: 5000, offRouteMinSamples: 2 },
      );
      now += 1000;

      if (result.state.bannerMessage === OFF_ROUTE_BANNER_MESSAGE) {
        offRouteBannerShown = true;
      }
    }

    assert.equal(tracker.status, "off_route");
    assert.equal(offRouteBannerShown, true);
  });

  it("shows back on route once after returning within 75m", () => {
    const tracker = createOffRouteTracker();
    const farPoint = offsetPoint(ROUTE[1], 200);
    const nearPoint = offsetPoint(ROUTE[1], 20);
    let now = 1_000;

    for (let index = 0; index < 8; index += 1) {
      stepOffRouteTracker(tracker, ROUTE, positionAt(farPoint), now, {
        offRouteConfirmMs: 1000,
        offRouteMinSamples: 2,
      });
      now += 1000;
    }

    assert.equal(tracker.status, "off_route");

    let backOnRouteBannerTransitions = 0;
    let previousBanner = tracker.bannerMessage;

    for (let index = 0; index < 6; index += 1) {
      const result = stepOffRouteTracker(tracker, ROUTE, positionAt(nearPoint), now, {
        returnConfirmMs: 3000,
        returnMinSamples: 2,
      });
      now += 1000;

      if (result.state.bannerMessage !== previousBanner) {
        if (result.state.bannerMessage === BACK_ON_ROUTE_BANNER_MESSAGE) {
          backOnRouteBannerTransitions += 1;
        }
        previousBanner = result.state.bannerMessage;
      }
    }

    assert.equal(tracker.status, "on_route");
    assert.equal(backOnRouteBannerTransitions, 1);
    assert.ok(
      tracker.distanceFromRouteMeters !== null &&
        tracker.distanceFromRouteMeters <= RETURN_TO_ROUTE_THRESHOLD_METERS,
    );
  });

  it("does not spam off-route banner while already off route", () => {
    const tracker = createOffRouteTracker();
    const farPoint = offsetPoint(ROUTE[1], 220);
    let now = 1_000;
    let bannerTransitions = 0;
    let previousBanner = tracker.bannerMessage;

    for (let index = 0; index < 12; index += 1) {
      const result = stepOffRouteTracker(tracker, ROUTE, positionAt(farPoint), now, {
        offRouteConfirmMs: 1000,
        offRouteMinSamples: 2,
      });
      now += 1000;

      if (result.state.bannerMessage !== previousBanner) {
        bannerTransitions += 1;
        previousBanner = result.state.bannerMessage;
      }
    }

    assert.equal(tracker.status, "off_route");
    assert.equal(tracker.bannerMessage, OFF_ROUTE_BANNER_MESSAGE);
    assert.equal(bannerTransitions, 1);
  });
});

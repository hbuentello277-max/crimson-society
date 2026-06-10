import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  calculateRouteDeviation,
  createOffRouteTracker,
  OFF_ROUTE_THRESHOLD_METERS,
  stepOffRouteTracker,
} from "@/lib/meets/navigation/off-route";
import {
  EMPTY_RECOVERY_ROUTE_STATE,
  fetchRecoveryNavigationRoute,
  shouldFetchRecoveryRoute,
} from "@/lib/meets/navigation/recovery-route";

const ROUTE = [
  { lat: 29.4241, lng: -98.4936 },
  { lat: 29.4251, lng: -98.4926 },
  { lat: 29.4261, lng: -98.4916 },
  { lat: 29.5, lng: -98.4 },
];

function feetToMeters(feet: number) {
  return feet * 0.3048;
}

function offsetPerpendicularFromRoute(route: typeof ROUTE, metersOffRoute: number) {
  const start = route[1];
  const end = route[2];
  const mid = { lat: (start.lat + end.lat) / 2, lng: (start.lng + end.lng) / 2 };
  const dLat = end.lat - start.lat;
  const dLng = end.lng - start.lng;
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = 111_320 * Math.cos((mid.lat * Math.PI) / 180);
  const segmentLatMeters = dLat * metersPerDegreeLat;
  const segmentLngMeters = dLng * metersPerDegreeLng;
  const segmentLengthMeters = Math.hypot(segmentLatMeters, segmentLngMeters);
  const perpendicularLatMeters = (-segmentLngMeters / segmentLengthMeters) * metersOffRoute;
  const perpendicularLngMeters = (segmentLatMeters / segmentLengthMeters) * metersOffRoute;

  return {
    lat: mid.lat + perpendicularLatMeters / metersPerDegreeLat,
    lng: mid.lng + perpendicularLngMeters / metersPerDegreeLng,
  };
}

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

function positionAt(point: { lat: number; lng: number }, timestamp = Date.now()) {
  return {
    ...point,
    accuracy: 5,
    heading: null,
    speedMph: 25,
    timestamp,
  };
}

function confirmOffRouteAt(point: { lat: number; lng: number }) {
  const tracker = createOffRouteTracker();
  let now = 1_000;

  for (let index = 0; index < 8; index += 1) {
    stepOffRouteTracker(tracker, ROUTE, positionAt(point, now), now, {
      offRouteConfirmMs: 1000,
      offRouteMinSamples: 2,
    });
    now += 1000;
  }

  return tracker;
}

describe("off-route recovery QA distances", () => {
  const scenarios = [
    { label: "100 ft off route", feet: 100, expectOffRoute: false },
    { label: "500 ft off route", feet: 500, expectOffRoute: true },
    { label: "1 mile off route", feet: 5280, expectOffRoute: true },
    { label: "5 miles off route", feet: 5280 * 5, expectOffRoute: true },
  ] as const;

  for (const scenario of scenarios) {
    it(`${scenario.label}: deviation detection matches ${OFF_ROUTE_THRESHOLD_METERS}m threshold`, () => {
      const meters = feetToMeters(scenario.feet);
      const point = offsetPerpendicularFromRoute(ROUTE, meters);
      const deviation = calculateRouteDeviation(ROUTE, positionAt(point));

      assert.ok(deviation);
      assert.equal(deviation.isBeyondOffRouteThreshold, scenario.expectOffRoute);

      if (scenario.expectOffRoute) {
        assert.ok(deviation.nearestPoint);
        assert.ok(deviation.distanceFromRouteMeters > OFF_ROUTE_THRESHOLD_METERS);
      }
    });
  }

  for (const scenario of scenarios.filter((entry) => entry.expectOffRoute)) {
    it(`${scenario.label}: recovery fetch is requested in-app when off route is confirmed`, () => {
      const meters = feetToMeters(scenario.feet);
      const point = offsetPerpendicularFromRoute(ROUTE, meters);
      const tracker = confirmOffRouteAt(point);

      assert.equal(tracker.status, "off_route");
      assert.ok(tracker.nearestRejoinPoint);

      assert.equal(
        shouldFetchRecoveryRoute({
          offRouteStatus: "off_route",
          rejoinPoint: tracker.nearestRejoinPoint,
          currentTargetKey: null,
          status: "idle",
        }),
        true,
      );
    });
  }

  it("100 ft off route: does not trigger recovery fetch while still considered on route", () => {
    const point = offsetPerpendicularFromRoute(ROUTE, feetToMeters(100));
    const tracker = createOffRouteTracker();
    stepOffRouteTracker(tracker, ROUTE, positionAt(point), Date.now());

    assert.notEqual(tracker.status, "off_route");
    assert.equal(
      shouldFetchRecoveryRoute({
        offRouteStatus: tracker.status,
        rejoinPoint: tracker.nearestRejoinPoint,
        currentTargetKey: null,
        status: "idle",
      }),
      false,
    );
  });

  it("500 ft off route: calculates in-app recovery geometry without external maps", async () => {
    const point = offsetPerpendicularFromRoute(ROUTE, feetToMeters(500));
    const tracker = confirmOffRouteAt(point);
    const origin = point;
    const rejoin = tracker.nearestRejoinPoint!;

    const recoveryRoute = await fetchRecoveryNavigationRoute("meet-qa", origin, rejoin);

    assert.ok(recoveryRoute);
    assert.ok(recoveryRoute.points.length >= 2);
    assert.ok(recoveryRoute.steps.length >= 0);
    assert.equal(recoveryRoute.destination, "Rejoin route");
  });

  it("clears recovery state after rider rejoins original route", () => {
    const farPoint = offsetPerpendicularFromRoute(ROUTE, feetToMeters(500));
    const tracker = confirmOffRouteAt(farPoint);
    assert.equal(tracker.status, "off_route");

    const nearPoint = offsetPerpendicularFromRoute(ROUTE, 15);
    let now = 20_000;

    for (let index = 0; index < 8; index += 1) {
      stepOffRouteTracker(tracker, ROUTE, positionAt(nearPoint, now), now, {
        returnConfirmMs: 1000,
        returnMinSamples: 2,
      });
      now += 1000;
    }

    assert.equal(tracker.status, "on_route");
    assert.equal(EMPTY_RECOVERY_ROUTE_STATE.status, "idle");
    assert.equal(EMPTY_RECOVERY_ROUTE_STATE.route, null);
  });
});

describe("off-route recovery navigation UI contract", () => {
  it("does not expose Open Maps to Rejoin in navigation direction banner", () => {
    const source = readFileSync(
      `${process.cwd()}/components/meets/navigation/NavigationDirectionBanner.tsx`,
      "utf8",
    );

    assert.doesNotMatch(source, /openMapsNavigation/i);
    assert.doesNotMatch(source, /Open Maps to Rejoin/i);
  });

  it("recovery routing uses in-app snapped route builder only", () => {
    const source = readFileSync(
      `${process.cwd()}/lib/meets/navigation/recovery-route.ts`,
      "utf8",
    );

    assert.match(source, /buildSnappedRoute/);
    assert.doesNotMatch(source, /maps\.apple\.com/i);
    assert.doesNotMatch(source, /google\.com\/maps/i);
    assert.doesNotMatch(source, /openMapsNavigation/i);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  recoveryTargetKey,
  shouldFetchRecoveryRoute,
} from "@/lib/meets/navigation/recovery-route";

describe("shouldFetchRecoveryRoute", () => {
  const rejoinPoint = { lat: 29.4241, lng: -98.4936 };

  it("does not fetch while on route", () => {
    assert.equal(
      shouldFetchRecoveryRoute({
        offRouteStatus: "on_route",
        rejoinPoint,
        currentTargetKey: null,
        status: "idle",
      }),
      false,
    );
  });

  it("fetches when off route with a new rejoin target", () => {
    assert.equal(
      shouldFetchRecoveryRoute({
        offRouteStatus: "off_route",
        rejoinPoint,
        currentTargetKey: null,
        status: "idle",
      }),
      true,
    );
  });

  it("does not refetch while loading", () => {
    assert.equal(
      shouldFetchRecoveryRoute({
        offRouteStatus: "off_route",
        rejoinPoint,
        currentTargetKey: recoveryTargetKey(rejoinPoint),
        status: "loading",
      }),
      false,
    );
  });

  it("refetches when rejoin target changes", () => {
    const nextPoint = { lat: 29.4251, lng: -98.4926 };
    assert.equal(
      shouldFetchRecoveryRoute({
        offRouteStatus: "off_route",
        rejoinPoint: nextPoint,
        currentTargetKey: recoveryTargetKey(rejoinPoint),
        status: "active",
      }),
      true,
    );
  });
});

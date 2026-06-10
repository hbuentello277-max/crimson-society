import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  navigationGpsStatusLabel,
  NAVIGATION_GPS_STATUS_LABELS,
  resolveNavigationGpsDisplayStatus,
} from "@/lib/meets/navigation/gps-status";

describe("resolveNavigationGpsDisplayStatus", () => {
  it("shows GPS Connected while navigating with a live fix", () => {
    assert.equal(
      resolveNavigationGpsDisplayStatus({
        gpsStatus: "connected",
        navigationState: "navigating",
      }),
      "connected",
    );
    assert.equal(
      navigationGpsStatusLabel("connected"),
      NAVIGATION_GPS_STATUS_LABELS.connected,
    );
  });

  it("shows reconnecting copy while recovering", () => {
    assert.equal(
      resolveNavigationGpsDisplayStatus({
        gpsStatus: "recovering",
        navigationState: "navigating",
      }),
      "recovering",
    );
    assert.equal(
      navigationGpsStatusLabel("recovering"),
      NAVIGATION_GPS_STATUS_LABELS.recovering,
    );
  });

  it("shows permission required when GPS is denied", () => {
    assert.equal(
      resolveNavigationGpsDisplayStatus({
        gpsStatus: "denied",
        navigationState: "gps_permission_required",
      }),
      "permission_denied",
    );
  });

  it("shows unavailable when the device cannot provide GPS", () => {
    assert.equal(
      resolveNavigationGpsDisplayStatus({
        gpsStatus: "unavailable",
        navigationState: "error",
      }),
      "unavailable",
    );
  });

  it("hides the status pill before navigation is active", () => {
    assert.equal(
      resolveNavigationGpsDisplayStatus({
        gpsStatus: "connected",
        navigationState: "ready",
      }),
      "hidden",
    );
  });
});

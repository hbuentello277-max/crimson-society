import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapRideToDashboardMeet } from "@/lib/dashboard/map-ride-to-dashboard-meet";
import type { DashboardRideRow } from "@/lib/dashboard/types";

const baseRide: DashboardRideRow = {
  id: "ride-1",
  host_id: "host-1",
  name: "Night Ride",
  date: "2099-12-31",
  time: "20:00",
  meet_point: "Downtown",
  destination: "Hill Country",
  city: "Austin",
  cover: null,
  route: [
    { lat: 30.27, lng: -97.74 },
    { lat: 30.28, lng: -97.75 },
  ],
  waypoints: [{ id: "wp-1", label: "Stop", lat: 30.275, lng: -97.745 }],
  tracking_status: "idle",
  started_at: null,
  status: "active",
  meet_point_lat: 30.27,
  meet_point_lng: -97.74,
  distance: "12 mi",
  duration: "30 min",
  privacy: "Open",
  visibility: "public",
};

describe("mapRideToDashboardMeet", () => {
  it("maps an upcoming meet with attendee and live counts", () => {
    const attendeeCounts = new Map([["ride-1", 4]]);
    const liveCounts = new Map([["ride-1", 2]]);
    const hostNames = new Map([["host-1", "@host_rider"]]);

    const meet = mapRideToDashboardMeet(
      baseRide,
      attendeeCounts,
      liveCounts,
      hostNames,
      Date.now(),
    );

    assert.ok(meet);
    assert.equal(meet.id, "ride-1");
    assert.equal(meet.lifecyclePhase, "upcoming");
    assert.equal(meet.riderCount, 4);
    assert.equal(meet.liveRiderCount, 2);
    assert.equal(meet.hostName, "@host_rider");
    assert.equal(meet.waypoints.length, 1);
    assert.equal(meet.route.length, 2);
  });

  it("returns null when coordinates are missing", () => {
    const meet = mapRideToDashboardMeet(
      { ...baseRide, meet_point_lat: null, meet_point_lng: null },
      new Map(),
      new Map(),
      new Map(),
      Date.now(),
    );

    assert.equal(meet, null);
  });
});

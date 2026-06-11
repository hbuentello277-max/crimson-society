import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseDashboardRoute,
  parseDashboardWaypoints,
  pickDashboardProfile,
  pickDashboardSound,
} from "@/lib/dashboard/parsers";

describe("dashboard parsers", () => {
  it("picks the first profile from an array", () => {
    const profile = pickDashboardProfile([
      { username: "first" },
      { username: "second" },
    ]);
    assert.equal(profile?.username, "first");
  });

  it("parses route and waypoint arrays", () => {
    const route = parseDashboardRoute([
      { lat: 1, lng: 2 },
      { lat: 3, lng: 4 },
    ]);
    assert.equal(route.length, 2);

    const waypoints = parseDashboardWaypoints([
      { id: "a", label: "A", lat: 1, lng: 2 },
      { lat: 9, lng: 9 },
    ]);
    assert.equal(waypoints.length, 1);
    assert.equal(waypoints[0]?.label, "A");
  });

  it("picks the first sound from nested arrays", () => {
    const sound = pickDashboardSound([
      {
        id: "ps-1",
        sounds: [{ id: "sound-1", title: "Track" } as never],
      },
    ]);
    assert.equal(sound?.id, "sound-1");
  });
});

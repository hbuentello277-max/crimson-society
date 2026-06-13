import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RIDER_SOS_NEARBY_RADIUS_MILES } from "@/lib/rider-sos/nearby-config";
import { filterNearbySosAlerts } from "@/lib/rider-sos/nearby-filter";
import {
  formatSosDistanceMiles,
  formatSosStatusLabel,
  formatSosTimeAgo,
  riderSosDisplayName,
} from "@/lib/rider-sos/nearby-format";
import type { NearbyRiderSosAlert } from "@/lib/rider-sos/nearby-types";

const baseAlert: NearbyRiderSosAlert = {
  id: "alert-1",
  user_id: "user-1",
  rider_name: "Javi",
  rider_username: "javi",
  sos_type: "mechanical",
  status: "active",
  bike_info: "Ducati Monster",
  latitude: 29.4241,
  longitude: -98.4936,
  created_at: new Date(Date.now() - 5 * 60_000).toISOString(),
  distance_miles: 2.1,
};

describe("nearby sos formatting", () => {
  it("uses a 10 mile nearby SOS radius", () => {
    assert.equal(RIDER_SOS_NEARBY_RADIUS_MILES, 10);
  });

  it("formats distance and time ago", () => {
    assert.equal(formatSosDistanceMiles(2.1), "2.1 miles away");
    assert.equal(formatSosDistanceMiles(null), "Distance unknown");
    assert.equal(formatSosTimeAgo(baseAlert.created_at), "5 minutes ago");
  });

  it("formats status labels", () => {
    assert.equal(formatSosStatusLabel("active"), "Active");
    assert.equal(formatSosStatusLabel("resolved"), "Resolved");
  });

  it("prefers rider display name", () => {
    assert.equal(riderSosDisplayName(baseAlert), "Javi");
  });
});

describe("filterNearbySosAlerts", () => {
  it("filters alerts outside the radius", () => {
    const nearby = filterNearbySosAlerts(
      [baseAlert, { ...baseAlert, id: "far", latitude: 40.7128, longitude: -74.006 }],
      { lat: 29.4241, lng: -98.4936 },
      5,
    );

    assert.equal(nearby.length, 1);
    assert.equal(nearby[0]?.id, "alert-1");
  });

  it("hides nearby alerts when viewer location is unavailable", () => {
    const alerts = [baseAlert, { ...baseAlert, id: "alert-2" }];
    assert.equal(filterNearbySosAlerts(alerts, null).length, 0);
  });
});

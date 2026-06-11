import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapMeetDetailRow } from "@/lib/meets/load-meet-detail";
import type { MeetRow } from "@/lib/meets/types";

const baseRow: MeetRow = {
  id: "meet-1",
  host_id: "host-1",
  name: "Night Ride",
  date: "2099-12-31",
  time: "20:00",
  meet_point: "Downtown",
  meet_point_lat: 30.27,
  meet_point_lng: -97.74,
  destination: "Hill Country",
  destination_lat: 30.35,
  destination_lng: -97.9,
  city: "Austin",
  type: "Group Ride",
  privacy: "Open",
  distance: "12 mi",
  duration: "30 min",
  description: null,
  cover: null,
  route: [
    { lat: 30.27, lng: -97.74 },
    { lat: 30.35, lng: -97.9 },
  ],
  waypoints: [],
  status: "active",
  tracking_status: "not_started",
  created_at: new Date().toISOString(),
};

describe("mapMeetDetailRow", () => {
  it("does not treat endpoint fallback geometry as a valid detail route", () => {
    const meet = mapMeetDetailRow({
      ...baseRow,
      host: {
        id: "host-1",
        username: "host",
        display_name: "Host Rider",
        full_name: null,
        profile_image_url: null,
        avatar_url: null,
      },
      attendeeRiders: [],
    });

    assert.equal(meet.route?.length, 0);
    assert.equal(meet.lat, 30.27);
    assert.equal(meet.destinationLat, 30.35);
  });

  it("preserves road-following geometry when already saved", () => {
    const meet = mapMeetDetailRow({
      ...baseRow,
      route: [
        { lat: 30.27, lng: -97.74 },
        { lat: 30.28, lng: -97.8 },
        { lat: 30.35, lng: -97.9 },
      ],
      attendeeRiders: [],
    });

    assert.equal(meet.route?.length, 3);
  });
});

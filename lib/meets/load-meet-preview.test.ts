import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapMeetPreviewRow } from "@/lib/meets/load-meet-preview";
import {
  buildMeetPublicUrl,
  buildMeetShareText,
  resolveMeetShareOrigin,
} from "@/lib/meets/meet-public-url";

describe("meet public url helpers", () => {
  it("builds canonical public meet urls", () => {
    assert.equal(
      buildMeetPublicUrl("meet-1", "https://www.crimson-society.com"),
      "https://www.crimson-society.com/meets/meet-1",
    );
  });

  it("falls back to the production origin when no browser origin exists", () => {
    assert.equal(resolveMeetShareOrigin(), "https://www.crimson-society.com");
  });

  it("builds share text with host and meet url", () => {
    assert.equal(
      buildMeetShareText(
        "Saturday Night Ride",
        "Javi",
        "https://www.crimson-society.com/meets/meet-1",
      ),
      "Saturday Night Ride\n\nHosted by Javi\n\nJoin us on Crimson Society.\n\nhttps://www.crimson-society.com/meets/meet-1",
    );
  });
});

describe("mapMeetPreviewRow", () => {
  it("maps accessible preview rows", () => {
    const preview = mapMeetPreviewRow({
      id: "meet-1",
      name: "Saturday Night Ride",
      meet_date: "2026-06-14",
      meet_time: "20:00",
      meet_point: "Downtown",
      destination: "Hill Country",
      city: "San Antonio",
      description: "Cruise night",
      cover: "/cover.jpg",
      distance: "42 mi",
      duration: "1h",
      meet_type: "Night Run",
      host_name: "Javi",
      host_username: "javi",
      rider_count: 3,
      visibility: "public",
      status: "active",
      is_accessible: true,
      can_open_in_app: false,
      lock_message: null,
      route: [
        { lat: 29.42, lng: -98.49 },
        { lat: 29.45, lng: -98.47 },
        { lat: 29.5, lng: -98.4 },
      ],
      meet_point_lat: 29.42,
      meet_point_lng: -98.49,
      destination_lat: 29.5,
      destination_lng: -98.4,
    });

    assert.equal(preview.name, "Saturday Night Ride");
    assert.equal(preview.hostName, "Javi");
    assert.equal(preview.riderCount, 3);
    assert.equal(preview.isAccessible, true);
    assert.equal(preview.route.length, 3);
  });

  it("maps restricted preview rows without leaking meet details", () => {
    const preview = mapMeetPreviewRow({
      id: "meet-2",
      name: null,
      meet_date: null,
      meet_time: null,
      meet_point: null,
      destination: null,
      city: null,
      description: null,
      cover: null,
      distance: null,
      duration: null,
      meet_type: null,
      host_name: null,
      host_username: null,
      rider_count: 0,
      visibility: "invite",
      status: "active",
      is_accessible: false,
      can_open_in_app: false,
      lock_message: "Invite-only meet. Ask the host to add you.",
      route: null,
      meet_point_lat: null,
      meet_point_lng: null,
      destination_lat: null,
      destination_lng: null,
    });

    assert.equal(preview.isAccessible, false);
    assert.equal(preview.lockMessage, "Invite-only meet. Ask the host to add you.");
    assert.equal(preview.meetPoint, "");
    assert.equal(preview.hostName, "Crimson Rider");
  });
});

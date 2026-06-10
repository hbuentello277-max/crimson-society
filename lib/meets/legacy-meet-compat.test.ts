import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { resolveMeetFooterActions } from "@/lib/meets/footer-actions";
import {
  assessLegacyMeetRowCompatibility,
  mapMeetRowToMeet,
  parseMeetWaypoints,
} from "@/lib/meets/meet-row-mapper";
import { rowToNavigationMeetShape } from "@/lib/meets/navigation-meet-shape";
import { hasRoadGeometry, parseRoute } from "@/lib/meets/route-geometry";
import type { MeetRow } from "@/lib/meets/types";

const LEGACY_ROW: MeetRow = {
  id: "legacy-meet-1",
  host_id: "host-1",
  name: null as unknown as string,
  date: "2026-06-15",
  time: "19:30",
  meet_point: null as unknown as string,
  meet_point_lat: 29.4241,
  meet_point_lng: -98.4936,
  destination: null as unknown as string,
  destination_lat: 29.5,
  destination_lng: -98.4,
  city: null,
  type: "Group Ride",
  privacy: "Open",
  distance: null,
  duration: null,
  description: null,
  cover: null,
  route: [
    { lat: 29.4241, lng: -98.4936 },
    { lat: 29.43, lng: -98.52 },
    { lat: 29.48, lng: -98.55 },
    { lat: 29.5, lng: -98.4 },
  ],
  waypoints: null,
  tracking_status: null,
  started_at: null,
  ended_at: null,
  status: "active",
  host: null,
  attendeeRiders: [],
};

describe("legacy meet row mapping", () => {
  it("maps sparse pre-refactor rows with safe UI fallbacks", () => {
    const meet = mapMeetRowToMeet(LEGACY_ROW);

    assert.equal(meet.name, "Untitled Meet");
    assert.equal(meet.meetPoint, "Meet point pending");
    assert.equal(meet.destination, "Destination pending");
    assert.equal(meet.distance, "TBD");
    assert.equal(meet.duration, "TBD");
    assert.equal(meet.trackingStatus, "not_started");
    assert.equal(meet.coHost, null);
    assert.equal(meet.host.name, "Crimson Member");
    assert.equal(meet.waypoints?.length, 0);
    assert.equal(hasRoadGeometry(meet.route ?? []), true);
  });

  it("preserves co-host and attendee data when present", () => {
    const meet = mapMeetRowToMeet({
      ...LEGACY_ROW,
      co_host_id: "cohost-1",
      coHost: {
        id: "cohost-1",
        username: "cohost",
        display_name: "Co Host",
        full_name: null,
        profile_image_url: null,
        avatar_url: null,
      },
      attendeeRiders: [{ name: "Rider One", photo: "/icon.png", username: "rider1" }],
      host: {
        id: "host-1",
        username: "host",
        display_name: "Host Rider",
        full_name: null,
        profile_image_url: null,
        avatar_url: null,
      },
    });

    assert.equal(meet.coHost?.name, "Co Host");
    assert.equal(meet.host.name, "Host Rider");
    assert.equal(meet.going.length, 1);
  });

  it("ignores malformed waypoint payloads", () => {
    assert.deepEqual(parseMeetWaypoints(null), []);
    assert.deepEqual(parseMeetWaypoints([{ lat: 1, lng: 2 }]), []);
    assert.equal(
      parseMeetWaypoints([
        { id: "wp-1", label: "Gas", lat: 29.43, lng: -98.5 },
      ]).length,
      1,
    );
  });

  it("flags missing route data and tolerates weak geometry warnings", () => {
    const broken = assessLegacyMeetRowCompatibility({
      id: "m1",
      host_id: "h1",
      route: [{ lat: 1, lng: 2 }],
      meet_point_lat: null,
      destination_lat: null,
    });

    assert.equal(
      broken.some((issue) => issue.field === "route" && issue.severity === "error"),
      true,
    );

    const weak = assessLegacyMeetRowCompatibility({
      id: "m2",
      host_id: "h2",
      route: [
        { lat: 29.4241, lng: -98.4936 },
        { lat: 29.5, lng: -98.4 },
      ],
      meet_point_lat: 29.4241,
      meet_point_lng: -98.4936,
      destination_lat: 29.5,
      destination_lng: -98.4,
    });

    assert.equal(
      weak.some((issue) => issue.field === "route" && issue.severity === "warning"),
      true,
    );
  });
});

describe("existing meet flows without recreation", () => {
  it("exposes role-based footer actions for legacy host rows", () => {
    const meet = mapMeetRowToMeet(LEGACY_ROW);
    const actions = resolveMeetFooterActions({
      isPrimaryHost: true,
      isCoHost: false,
      isGoing: false,
      isCanceled: false,
      trackingStatus: meet.trackingStatus,
      hasRoute: hasRoadGeometry(meet.route ?? []),
      inviteJoinBlocked: false,
      hasMapsTarget: true,
    });

    assert.deepEqual(actions, ["navigate", "start_meet"]);
    assert.equal(actions.includes("join"), false);
    assert.equal(actions.includes("leave"), false);
  });

  it("maps legacy rows into navigation session shape", () => {
    const meet = mapMeetRowToMeet(LEGACY_ROW);
    const navigationMeet = rowToNavigationMeetShape({
      id: meet.id,
      hostId: meet.hostId ?? null,
      name: meet.name,
      meetPoint: meet.meetPoint,
      destination: meet.destination,
      date: meet.date,
      time: meet.time,
      meetDurationMinutes: meet.meetDurationMinutes ?? null,
      status: meet.status ?? "active",
      trackingStatus: meet.trackingStatus ?? "not_started",
      startedAt: meet.startedAt ?? null,
      endedAt: meet.endedAt ?? null,
      distance: meet.distance === "TBD" ? null : meet.distance,
      duration: meet.duration === "TBD" ? null : meet.duration,
      route: meet.route ?? [],
      waypoints: meet.waypoints ?? [],
      routeSteps: [],
    });

    assert.equal(navigationMeet.name, "Untitled Meet");
    assert.equal(parseRoute(navigationMeet.route).length, 4);
  });

  it("keeps overflow-menu report action out of footer action resolver", () => {
    const footerActions = resolveMeetFooterActions({
      isPrimaryHost: false,
      isCoHost: false,
      isGoing: true,
      isCanceled: false,
      trackingStatus: "not_started",
      hasRoute: true,
      inviteJoinBlocked: false,
      hasMapsTarget: true,
    });

    assert.equal(footerActions.includes("join" as never), false);
    assert.equal(footerActions.includes("leave" as never), true);
    assert.equal(
      footerActions.some((action) => action === "navigate" || action === "start_ride"),
      true,
    );
  });
});

describe("navigation layout structure", () => {
  it("uses redesigned top banner, speed HUD, riders toggle, and compact HUD", () => {
    const source = readFileSync("components/meets/navigation/NavigationLayout.tsx", "utf8");

    assert.match(source, /NavigationDirectionBanner/);
    assert.match(source, /NavigationSpeedHud/);
    assert.match(source, /NavigationRidersToggle/);
    assert.match(source, /NavigationHud/);
    assert.doesNotMatch(source, /NavigationBottomSheet/);
  });
});

describe("meet details modal structure", () => {
  it("places report in overflow menu and keeps footer role-based only", () => {
    const modal = readFileSync("components/meets/MeetDetailsModal.tsx", "utf8");
    const overflow = readFileSync("components/meets/MeetDetailsOverflowMenu.tsx", "utf8");

    assert.match(modal, /MeetDetailsOverflowMenu/);
    assert.match(modal, /footerActions\.map/);
    assert.match(overflow, /Report Meet/);
    assert.doesNotMatch(modal, /renderFooterAction\("report"\)/);
    assert.doesNotMatch(modal, /meetFooterActionLabel\("close"\)/);
  });
});

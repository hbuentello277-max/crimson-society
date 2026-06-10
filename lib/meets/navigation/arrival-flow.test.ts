import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findNearestGroupRider,
  formatDistanceFeet,
  hasLeftMeetStartZone,
  resolveNextArrivalPhase,
  shouldEnterMeetStartArrival,
} from "@/lib/meets/navigation/arrival-flow";

describe("arrival flow", () => {
  it("enters meet start arrival only before ride goes live", () => {
    assert.equal(
      shouldEnterMeetStartArrival(
        {
          atMeetStart: true,
          atDestination: false,
          distanceToMeetStartMiles: 0.01,
          distanceToDestinationMiles: 5,
        },
        "not_started",
      ),
      true,
    );
    assert.equal(
      shouldEnterMeetStartArrival(
        {
          atMeetStart: true,
          atDestination: false,
          distanceToMeetStartMiles: 0.01,
          distanceToDestinationMiles: 5,
        },
        "active",
      ),
      false,
    );
  });

  it("transitions from meet start notice to find group after the notice window", () => {
    const now = 10_000;
    const next = resolveNextArrivalPhase("meet_start_notice", {
      detection: {
        atMeetStart: true,
        atDestination: false,
        distanceToMeetStartMiles: 0.01,
        distanceToDestinationMiles: 4,
      },
      trackingStatus: "not_started",
      position: { lat: 29.4241, lng: -98.4936, accuracy: 5, heading: null, speedMph: 0, timestamp: now },
      meetStart: { lat: 29.4241, lng: -98.4936 },
      now,
      phaseStartedAt: 2_000,
    });

    assert.equal(next, "find_group");
  });

  it("clears meet arrival when ride tracking becomes active", () => {
    const next = resolveNextArrivalPhase("find_group", {
      detection: {
        atMeetStart: true,
        atDestination: false,
        distanceToMeetStartMiles: 0.01,
        distanceToDestinationMiles: 4,
      },
      trackingStatus: "active",
      position: { lat: 29.4241, lng: -98.4936, accuracy: 5, heading: null, speedMph: 0, timestamp: Date.now() },
      meetStart: { lat: 29.4241, lng: -98.4936 },
      now: Date.now(),
      phaseStartedAt: Date.now() - 1_000,
    });

    assert.equal(next, "none");
  });

  it("resumes navigation when rider leaves the meet start zone", () => {
    assert.equal(
      hasLeftMeetStartZone(
        { lat: 29.5, lng: -98.4, accuracy: 5, heading: null, speedMph: 12, timestamp: Date.now() },
        { lat: 29.4241, lng: -98.4936 },
      ),
      true,
    );
  });

  it("picks the nearest live rider for find-the-group guidance", () => {
    const nearest = findNearestGroupRider(
      { lat: 29.4241, lng: -98.4936, accuracy: 5, heading: null, speedMph: 0, timestamp: Date.now() },
      [
        {
          user_id: "host-1",
          rider_name: "Host",
          rider_display_name: "Host",
          rider_photo: null,
          lat: 29.4243,
          lng: -98.4938,
        },
        {
          user_id: "rider-2",
          rider_name: "Crimson",
          rider_display_name: "Crimson",
          rider_photo: null,
          lat: 29.42415,
          lng: -98.49355,
        },
      ],
      "host-1",
      "Javi Buentello",
    );

    assert.equal(nearest?.name, "Crimson");
    assert.equal(nearest?.role, "rider");
    assert.ok(nearest && nearest.distanceFeet < 500);
    assert.equal(formatDistanceFeet(350), "350 ft away");
  });
});

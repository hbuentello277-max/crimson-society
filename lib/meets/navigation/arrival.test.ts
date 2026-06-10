import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  detectNavigationArrival,
  DESTINATION_ARRIVAL_MILES,
  MEET_START_ARRIVAL_MILES,
} from "@/lib/meets/navigation/arrival";

const meetStart = { lat: 29.4241, lng: -98.4936 };
const destination = { lat: 29.4341, lng: -98.4836 };

function positionAt(point: { lat: number; lng: number }) {
  return {
    ...point,
    accuracy: 5,
    heading: null,
    speedMph: 20,
    timestamp: Date.now(),
  };
}

describe("detectNavigationArrival", () => {
  it("detects arrival at meet start within threshold", () => {
    const result = detectNavigationArrival(positionAt(meetStart), meetStart, destination);
    assert.equal(result.atMeetStart, true);
    assert.equal(result.atDestination, false);
    assert.ok((result.distanceToMeetStartMiles ?? 1) <= MEET_START_ARRIVAL_MILES);
  });

  it("detects arrival at destination within threshold", () => {
    const result = detectNavigationArrival(positionAt(destination), meetStart, destination);
    assert.equal(result.atDestination, true);
    assert.ok((result.distanceToDestinationMiles ?? 1) <= DESTINATION_ARRIVAL_MILES);
  });

  it("returns false when rider is far from both points", () => {
    const far = { lat: 30.5, lng: -97.5 };
    const result = detectNavigationArrival(positionAt(far), meetStart, destination);
    assert.equal(result.atMeetStart, false);
    assert.equal(result.atDestination, false);
  });
});

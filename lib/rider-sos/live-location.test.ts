import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  responderLocationToMapRider,
  shouldShowArrivalAssist,
  type RiderSosResponderLocationView,
} from "@/lib/rider-sos/live-location";

const liveLocation: RiderSosResponderLocationView = {
  id: "loc-1",
  sos_event_id: "sos-1",
  responder_user_id: "rider-1",
  rider_name: "Mike R.",
  bike_info: "2020 GSX-R750",
  status: "responding",
  latitude: 29.4241,
  longitude: -98.4936,
  accuracy: 12,
  heading: null,
  speed: null,
  distance_miles: 2.1,
  eta_minutes: 8,
  updated_at: "2026-06-12T12:00:00.000Z",
};

describe("rider sos live responder locations", () => {
  it("maps live locations to MeetMap rider markers without private fields", () => {
    const rider = responderLocationToMapRider(liveLocation);

    assert.equal(rider.user_id, "rider-1");
    assert.equal(rider.rider_name, "Mike R.");
    assert.equal(rider.lat, 29.4241);
    assert.equal(rider.lng, -98.4936);
    assert.equal(rider.distance_label, "2.1 miles away");
    assert.equal(rider.last_updated_label, "Responding · 8 min away");
    assert.equal("phone" in rider, false);
    assert.equal("medical_notes" in rider, false);
  });

  it("shows arrival assist only near the SOS location", () => {
    assert.equal(shouldShowArrivalAssist(0.04), true);
    assert.equal(shouldShowArrivalAssist(0.05), true);
    assert.equal(shouldShowArrivalAssist(0.2), false);
    assert.equal(shouldShowArrivalAssist(null), false);
  });
});


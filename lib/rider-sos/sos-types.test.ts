import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMapsUrl,
  formatMedicalSnapshot,
  hasCompleteEmergencyProfile,
  sosTypeLabel,
} from "@/lib/rider-sos/sos-types";

describe("rider sos types", () => {
  it("labels sos types for display", () => {
    assert.equal(sosTypeLabel("medical_emergency"), "Medical Emergency");
    assert.equal(sosTypeLabel("lost_separated"), "Lost / Separated");
  });

  it("builds a maps URL from coordinates", () => {
    assert.equal(buildMapsUrl(29.4241, -98.4936), "https://www.google.com/maps?q=29.4241,-98.4936");
  });

  it("formats medical snapshot from profile fields", () => {
    const snapshot = formatMedicalSnapshot({
      blood_type: "O+",
      allergies: "Penicillin",
      medical_notes: "Asthma inhaler in jacket.",
    });

    assert.match(snapshot ?? "", /Blood type: O\+/);
    assert.match(snapshot ?? "", /Allergies: Penicillin/);
    assert.match(snapshot ?? "", /Asthma inhaler/);
  });

  it("detects incomplete emergency profile", () => {
    assert.equal(
      hasCompleteEmergencyProfile({ emergency_contact_name: "Alex", emergency_contact_phone: "" }),
      false,
    );
    assert.equal(
      hasCompleteEmergencyProfile({
        emergency_contact_name: "Alex",
        emergency_contact_phone: "555-0100",
      }),
      true,
    );
  });
});

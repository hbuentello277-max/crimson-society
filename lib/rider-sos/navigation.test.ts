import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRiderSosNavigationTarget } from "@/lib/rider-sos/navigation";

describe("buildRiderSosNavigationTarget", () => {
  it("builds a maps target for valid SOS coordinates", () => {
    assert.deepEqual(
      buildRiderSosNavigationTarget({
        latitude: 29.4241,
        longitude: -98.4936,
      }),
      {
        lat: 29.4241,
        lng: -98.4936,
        label: "SOS location",
      },
    );
  });

  it("does not build a target when coordinates are unavailable", () => {
    assert.equal(buildRiderSosNavigationTarget({ latitude: null, longitude: -98.4936 }), null);
    assert.equal(buildRiderSosNavigationTarget({ latitude: 29.4241, longitude: null }), null);
  });
});


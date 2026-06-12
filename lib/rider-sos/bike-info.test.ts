import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatRiderSosBikeInfo } from "@/lib/rider-sos/bike-info";

describe("formatRiderSosBikeInfo", () => {
  it("prefers primary garage motorcycle year and name", () => {
    const result = formatRiderSosBikeInfo(
      { bike_type: "Sport" },
      [{ year: "2003", name: "Yamaha R1", finish: "Matte Black", label: "Garage One" }],
    );

    assert.equal(result, "2003 Yamaha R1 (Matte Black)");
  });

  it("falls back to profile bike type when garage is empty", () => {
    const result = formatRiderSosBikeInfo({ bike_type: "Cruiser" }, []);
    assert.equal(result, "Cruiser");
  });
});

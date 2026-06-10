import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatRouteDurationLabel } from "@/lib/meets/format-route-duration";

describe("formatRouteDurationLabel", () => {
  it("formats sub-hour durations in minutes", () => {
    assert.equal(formatRouteDurationLabel(45 * 60), "45 min");
  });

  it("formats multi-hour durations with hours and minutes", () => {
    assert.equal(formatRouteDurationLabel(2 * 3600 + 47 * 60), "2h 47m");
  });
});

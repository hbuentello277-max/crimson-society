import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatProfileMeetDate } from "@/lib/profile/profile-meets";

describe("profile meets helpers", () => {
  it("formats ISO-like meet dates", () => {
    const formatted = formatProfileMeetDate("2026-06-15");
    assert.match(formatted, /Jun/);
    assert.match(formatted, /2026/);
  });

  it("returns pending label for empty dates", () => {
    assert.equal(formatProfileMeetDate(""), "Date pending");
  });
});

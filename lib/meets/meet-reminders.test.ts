import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { meetStartsWithinReminderWindow } from "@/lib/meets/meet-reminders";

describe("meetStartsWithinReminderWindow", () => {
  it("matches the 1-hour reminder window", () => {
    const now = new Date("2026-06-06T11:00:00.000Z");
    const startDate = "2026-06-06";
    const startTime = "12:00";

    assert.equal(meetStartsWithinReminderWindow(startDate, startTime, "1h", now), true);
  });

  it("rejects meets outside the reminder window", () => {
    const now = new Date("2026-06-06T09:00:00.000Z");
    assert.equal(meetStartsWithinReminderWindow("2026-06-06", "12:00", "1h", now), false);
  });
});

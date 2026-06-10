import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveMeetLifecycle, getMeetEndTime } from "@/lib/meets/lifecycle";

describe("meet lifecycle calendar-day rule", () => {
  it("keeps meets active through the end of the scheduled calendar day", () => {
    const end = getMeetEndTime("2026-06-07", "11:00", null);
    assert.ok(end);
    assert.equal(end.getHours(), 23);
    assert.equal(end.getMinutes(), 59);
  });

  it("does not move ended tracking to past before the next day", () => {
    const saturdayLate = new Date("2026-06-07T23:30:00").getTime();
    const phase = deriveMeetLifecycle({
      status: "active",
      trackingStatus: "ended",
      date: "2026-06-07",
      time: "11:00",
      now: saturdayLate,
    });
    assert.equal(phase, "active");
  });

  it("moves to past after the meet calendar day ends", () => {
    const sundayEarly = new Date("2026-06-08T00:01:00").getTime();
    const phase = deriveMeetLifecycle({
      status: "active",
      trackingStatus: "ended",
      date: "2026-06-07",
      time: "11:00",
      now: sundayEarly,
    });
    assert.equal(phase, "past");
  });
});

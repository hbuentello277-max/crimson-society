import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getMeetStartTime } from "@/lib/meets/lifecycle";
import { meetStartsWithinReminderWindow } from "@/lib/meets/meet-reminders";

function localMeetScheduleFromDate(start: Date) {
  const year = start.getFullYear();
  const month = String(start.getMonth() + 1).padStart(2, "0");
  const day = String(start.getDate()).padStart(2, "0");
  const hours = String(start.getHours()).padStart(2, "0");
  const minutes = String(start.getMinutes()).padStart(2, "0");

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
}

describe("meetStartsWithinReminderWindow", () => {
  it("matches the 1-hour reminder window", () => {
    const now = new Date();
    now.setSeconds(0, 0);

    const start = new Date(now.getTime() + 60 * 60 * 1000);
    start.setSeconds(0, 0);
    const { date, time } = localMeetScheduleFromDate(start);

    assert.equal(getMeetStartTime(date, time)?.getTime(), start.getTime());
    assert.equal(meetStartsWithinReminderWindow(date, time, "1h", now), true);
  });

  it("rejects meets outside the reminder window", () => {
    const now = new Date();
    now.setSeconds(0, 0);

    const start = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    start.setSeconds(0, 0);
    const { date, time } = localMeetScheduleFromDate(start);

    assert.equal(meetStartsWithinReminderWindow(date, time, "1h", now), false);
  });
});

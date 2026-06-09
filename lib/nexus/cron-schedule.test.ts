import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeNextCronRunIso,
  cronIntervalMinutes,
  isCronRunOverdue,
} from "@/lib/nexus/cron-schedule";

describe("cronIntervalMinutes", () => {
  it("parses */5 schedules", () => {
    assert.equal(cronIntervalMinutes("*/5 * * * *"), 5);
    assert.equal(cronIntervalMinutes("2-57/5 * * * *"), 5);
  });

  it("defaults hourly schedules to 60 minutes", () => {
    assert.equal(cronIntervalMinutes("35 * * * *"), 60);
  });
});

describe("computeNextCronRunIso", () => {
  it("computes the next */5 run", () => {
    const next = computeNextCronRunIso("*/5 * * * *", new Date("2026-06-06T12:03:00.000Z"));
    assert.equal(next, "2026-06-06T12:05:00.000Z");
  });

  it("computes the next fixed-minute hourly run", () => {
    const next = computeNextCronRunIso("35 * * * *", new Date("2026-06-06T12:40:00.000Z"));
    assert.equal(next, "2026-06-06T13:35:00.000Z");
  });
});

describe("isCronRunOverdue", () => {
  it("flags stale runs beyond interval and grace", () => {
    const now = new Date("2026-06-06T12:30:00.000Z");
    assert.equal(isCronRunOverdue("2026-06-06T12:00:00.000Z", "*/5 * * * *", now), true);
    assert.equal(isCronRunOverdue("2026-06-06T12:28:00.000Z", "*/5 * * * *", now), false);
  });

  it("treats missing runs as overdue", () => {
    assert.equal(isCronRunOverdue(null, "*/5 * * * *"), true);
  });
});

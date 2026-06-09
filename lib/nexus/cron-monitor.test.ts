import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NEXUS_CRON_JOBS } from "@/lib/nexus/cron-jobs";
import { buildNexusCronJobHealth } from "@/lib/nexus/cron-monitor";

describe("buildNexusCronJobHealth", () => {
  const job = NEXUS_CRON_JOBS[0];
  const now = new Date("2026-06-06T12:30:00.000Z");

  it("marks healthy jobs from recent successful activity", () => {
    const health = buildNexusCronJobHealth(
      job,
      [
        {
          action: job.activityAction,
          created_at: "2026-06-06T12:28:00.000Z",
          details: { ok: true, duration_ms: 420 },
        },
      ],
      now,
    );

    assert.equal(health.status, "healthy");
    assert.equal(health.duration_ms, 420);
    assert.equal(health.error_message, null);
  });

  it("marks failed jobs when the latest run failed", () => {
    const health = buildNexusCronJobHealth(
      job,
      [
        {
          action: job.activityAction,
          created_at: "2026-06-06T12:28:00.000Z",
          details: { ok: false, error: "probe timeout", duration_ms: 900 },
        },
      ],
      now,
    );

    assert.equal(health.status, "failed");
    assert.equal(health.error_message, "probe timeout");
  });

  it("reads legacy activity actions", () => {
    const health = buildNexusCronJobHealth(
      job,
      [
        {
          action: job.legacyActivityActions[0],
          created_at: "2026-06-06T12:27:00.000Z",
          details: { ok: true, duration_ms: 300 },
        },
      ],
      now,
    );

    assert.equal(health.status, "healthy");
    assert.equal(health.last_run_at, "2026-06-06T12:27:00.000Z");
  });
});

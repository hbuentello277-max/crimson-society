import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

/** Hobby-safe: fixed minute + hour, daily (`M H * * *`). */
const DAILY_CRON_PATTERN = /^([0-5]?\d) ([01]?\d|2[0-3]) \* \* \*$/;

const REQUIRED_CRON_PATHS = [
  "/api/cron/media-processing",
  "/api/cron/meet-reminders",
  "/api/cron/push-dispatch",
  "/api/cron/shop-expire-reservations",
  "/api/cron/nexus/health-check",
  "/api/cron/nexus/mission-health",
  "/api/cron/nexus/metrics-rollup",
  "/api/cron/nexus/alert-evaluation",
  "/api/cron/nexus/observation-engine",
  "/api/cron/nexus/command-suggestions",
  "/api/cron/nexus/command-expiry",
] as const;

type VercelJson = {
  crons?: Array<{ path: string; schedule: string }>;
};

describe("vercel.json cron schedules (Hobby)", () => {
  const config = JSON.parse(
    readFileSync(path.join(process.cwd(), "vercel.json"), "utf8"),
  ) as VercelJson;

  it("registers all required cron routes", () => {
    const paths = (config.crons ?? []).map((entry) => entry.path);
    for (const required of REQUIRED_CRON_PATHS) {
      assert.ok(paths.includes(required), `missing cron path: ${required}`);
    }
  });

  it("uses daily-only schedules compatible with Vercel Hobby", () => {
    for (const entry of config.crons ?? []) {
      assert.match(
        entry.schedule,
        DAILY_CRON_PATTERN,
        `${entry.path} schedule "${entry.schedule}" is not daily (Hobby-safe)`,
      );
      assert.doesNotMatch(entry.schedule, /\*\//, `${entry.path} uses sub-daily step syntax`);
      assert.doesNotMatch(entry.schedule, / \* \* \* \*$/, `${entry.path} uses hourly or finer cadence`);
    }
  });
});

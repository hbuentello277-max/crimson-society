#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const migrations = [
  {
    file: "supabase/migrations/20260717120000_meet_co_host_credits_notifications.sql",
    required: [
      "co_host_id",
      "is_meet_host_or_cohost",
      "set_meet_co_host",
      "try_award_meet_completion_credits",
      "notify_crimson_credits_meet_reward",
      "meet_attend:",
      "meet_host:",
      "meet_cohost:",
    ],
  },
  {
    file: "supabase/migrations/20260718120000_meet_create_idempotency.sql",
    required: ["create_idempotency_key", "rides_host_create_idempotency_key_uidx"],
  },
];

let failed = false;

for (const migration of migrations) {
  const path = join(root, migration.file);
  const sql = readFileSync(path, "utf8");
  const missing = migration.required.filter((token) => !sql.includes(token));

  if (missing.length > 0) {
    failed = true;
    console.error(`FAIL ${migration.file}`);
    for (const token of missing) {
      console.error(`  missing: ${token}`);
    }
    continue;
  }

  console.log(`PASS ${migration.file}`);
}

if (failed) {
  process.exit(1);
}

console.log("All meet migration checks passed.");

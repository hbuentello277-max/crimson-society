import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aggregateIntegrationStatus } from "@/lib/monitoring/aggregator";
import { buildProbeResult } from "@/lib/monitoring/probe-utils";
import {
  INTEGRATION_THRESHOLDS,
  latencyStatus,
} from "@/lib/monitoring/thresholds";

const supabaseThresholds = INTEGRATION_THRESHOLDS.supabase.latency!;

function supabaseDatabaseCheck(latencyMs: number) {
  const status = latencyStatus(latencyMs, supabaseThresholds);
  return buildProbeResult({
    integration_slug: "supabase",
    check_type: "database",
    status,
    latency_ms: latencyMs,
    details: { ok: true, error: null },
  });
}

describe("Supabase latency thresholds", () => {
  it("uses 1200ms pass and 2000ms warn thresholds", () => {
    assert.equal(supabaseThresholds.passMs, 1200);
    assert.equal(supabaseThresholds.warnMs, 2000);
  });

  it("treats 824ms database latency as pass", () => {
    assert.equal(latencyStatus(824, supabaseThresholds), "pass");
    assert.equal(aggregateIntegrationStatus([supabaseDatabaseCheck(824)]), "healthy");
  });

  it("treats 1300ms database latency as warn and degraded", () => {
    assert.equal(latencyStatus(1300, supabaseThresholds), "warn");
    assert.equal(aggregateIntegrationStatus([supabaseDatabaseCheck(1300)]), "degraded");
  });

  it("treats latency above 2000ms as fail and down", () => {
    assert.equal(latencyStatus(2001, supabaseThresholds), "fail");
    assert.equal(aggregateIntegrationStatus([supabaseDatabaseCheck(2001)]), "down");
  });
});

describe("other integration latency thresholds", () => {
  it("keeps non-Supabase pass thresholds at 500ms", () => {
    assert.equal(INTEGRATION_THRESHOLDS.stripe.latency?.passMs, 500);
    assert.equal(INTEGRATION_THRESHOLDS.github.latency?.passMs, 500);
    assert.equal(INTEGRATION_THRESHOLDS.vercel.latency?.passMs, 500);
    assert.equal(INTEGRATION_THRESHOLDS.resend.latency?.passMs, 500);
    assert.equal(INTEGRATION_THRESHOLDS.crimson_society.latency?.passMs, 500);
  });
});

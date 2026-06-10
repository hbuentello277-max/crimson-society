import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAttemptGpsRecovery,
  GPS_RECOVERY_COOLDOWN_MS,
  GPS_STALE_TIMEOUT_MS,
  isGpsUpdateStale,
  shouldTriggerStaleGpsRecovery,
} from "@/lib/meets/navigation/gps-stale-recovery";

describe("isGpsUpdateStale", () => {
  it("detects GPS update timeout after 30 seconds", () => {
    const nowMs = 100_000;
    assert.equal(isGpsUpdateStale(nowMs - GPS_STALE_TIMEOUT_MS, nowMs), true);
    assert.equal(isGpsUpdateStale(nowMs - GPS_STALE_TIMEOUT_MS + 1, nowMs), false);
  });

  it("does not mark GPS stale before the first update", () => {
    assert.equal(isGpsUpdateStale(null, Date.now()), false);
  });
});

describe("canAttemptGpsRecovery", () => {
  it("allows the first recovery attempt immediately", () => {
    assert.equal(canAttemptGpsRecovery(null, 50_000), true);
  });

  it("blocks recovery attempts inside the 30 second cooldown", () => {
    const nowMs = 200_000;
    const lastRecoveryAtMs = nowMs - GPS_RECOVERY_COOLDOWN_MS + 1;
    assert.equal(canAttemptGpsRecovery(lastRecoveryAtMs, nowMs), false);
    assert.equal(
      canAttemptGpsRecovery(nowMs - GPS_RECOVERY_COOLDOWN_MS, nowMs),
      true,
    );
  });
});

describe("shouldTriggerStaleGpsRecovery", () => {
  const base = {
    enabled: true,
    gpsState: "active" as const,
    lastUpdateAtMs: 1_000,
    lastRecoveryAtMs: null,
    nowMs: 40_000,
  };

  it("triggers recovery after a successful GPS timeout", () => {
    assert.equal(shouldTriggerStaleGpsRecovery(base), true);
  });

  it("does not trigger recovery before GPS has produced an update", () => {
    assert.equal(
      shouldTriggerStaleGpsRecovery({
        ...base,
        lastUpdateAtMs: null,
      }),
      false,
    );
  });

  it("does not trigger recovery while GPS is disabled", () => {
    assert.equal(
      shouldTriggerStaleGpsRecovery({
        ...base,
        enabled: false,
      }),
      false,
    );
  });

  it("does not trigger recovery for denied or unavailable GPS", () => {
    assert.equal(
      shouldTriggerStaleGpsRecovery({
        ...base,
        gpsState: "denied",
      }),
      false,
    );
    assert.equal(
      shouldTriggerStaleGpsRecovery({
        ...base,
        gpsState: "unavailable",
      }),
      false,
    );
  });

  it("protects against multiple recovery attempts inside the cooldown window", () => {
    assert.equal(
      shouldTriggerStaleGpsRecovery({
        ...base,
        lastRecoveryAtMs: base.nowMs - 5_000,
      }),
      false,
    );
  });

  it("allows another recovery attempt after the cooldown expires", () => {
    assert.equal(
      shouldTriggerStaleGpsRecovery({
        ...base,
        nowMs: 80_000,
        lastRecoveryAtMs: 40_000,
      }),
      true,
    );
  });

  it("can recover from a stale watch while GPS is in error state", () => {
    assert.equal(
      shouldTriggerStaleGpsRecovery({
        ...base,
        gpsState: "error",
      }),
      true,
    );
  });
});

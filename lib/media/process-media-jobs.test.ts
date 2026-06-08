import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_MEDIA_JOB_ATTEMPTS,
  STALE_PROCESSING_MINUTES,
  staleProcessingCutoffIso,
  staleRecoveryAction,
} from "@/lib/media/process-media-jobs";

describe("staleRecoveryAction", () => {
  it("requeues when attempts are below the max", () => {
    assert.equal(staleRecoveryAction(0), "requeue");
    assert.equal(staleRecoveryAction(1), "requeue");
    assert.equal(staleRecoveryAction(MAX_MEDIA_JOB_ATTEMPTS - 1), "requeue");
  });

  it("fails when attempts reached the max", () => {
    assert.equal(staleRecoveryAction(MAX_MEDIA_JOB_ATTEMPTS), "fail");
    assert.equal(staleRecoveryAction(MAX_MEDIA_JOB_ATTEMPTS + 1), "fail");
  });
});

describe("staleProcessingCutoffIso", () => {
  it("returns a timestamp 15 minutes before the reference time", () => {
    const now = Date.parse("2026-06-08T12:00:00.000Z");
    const cutoff = staleProcessingCutoffIso(now);
    assert.equal(cutoff, "2026-06-08T11:45:00.000Z");
    assert.equal(STALE_PROCESSING_MINUTES, 15);
  });
});

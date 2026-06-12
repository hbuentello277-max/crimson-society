import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimateSosEtaMinutes,
  formatResponderCount,
  formatResponseStatusLabel,
  formatSosDistanceSummary,
  formatSosResponseEtaLine,
  isActiveResponseStatus,
} from "@/lib/rider-sos/response-format";

describe("rider sos response formatting", () => {
  it("formats responder counts for dashboard cards", () => {
    assert.equal(formatResponderCount(0), null);
    assert.equal(formatResponderCount(1), "👥 1 Rider Responding");
    assert.equal(formatResponderCount(3), "👥 3 Riders Responding");
  });

  it("formats response status labels", () => {
    assert.equal(formatResponseStatusLabel("responding"), "Responding");
    assert.equal(formatResponseStatusLabel("arrived"), "Arrived");
    assert.equal(formatResponseStatusLabel("cancelled"), "Cancelled");
  });

  it("detects active response statuses", () => {
    assert.equal(isActiveResponseStatus("responding"), true);
    assert.equal(isActiveResponseStatus("arrived"), true);
    assert.equal(isActiveResponseStatus("cancelled"), false);
    assert.equal(isActiveResponseStatus(null), false);
  });

  it("estimates distance-based ETA conservatively", () => {
    assert.equal(estimateSosEtaMinutes(2.1), 9);
    assert.equal(estimateSosEtaMinutes(0), 1);
    assert.equal(estimateSosEtaMinutes(null), null);
  });

  it("formats response ETA lines", () => {
    assert.equal(formatSosResponseEtaLine({ status: "responding", etaMinutes: 8 }), "Responding · 8 min away");
    assert.equal(formatSosResponseEtaLine({ status: "responding", etaMinutes: null }), "Responding · ETA unavailable");
    assert.equal(formatSosResponseEtaLine({ status: "arrived", etaMinutes: 8 }), "Arrived");
    assert.equal(formatSosDistanceSummary(2.14), "2.1 miles away");
  });
});

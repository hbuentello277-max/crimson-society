import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatResponderCount,
  formatResponseStatusLabel,
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
});

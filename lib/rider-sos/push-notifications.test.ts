import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSosActivatedPushCopy,
  buildSosArrivedPushCopy,
  buildSosRespondedPushCopy,
  riderSosAlertPath,
  riderSosNotificationGroupKey,
  riderSosNotificationIdempotencyKey,
} from "@/lib/rider-sos/push-notifications";

describe("rider sos push notifications", () => {
  it("builds safe activated copy with type and approximate distance only", () => {
    const copy = buildSosActivatedPushCopy({
      sosType: "mechanical",
      distanceMiles: 2.14,
    });

    assert.equal(copy.title, "🚨 Rider Needs Assistance");
    assert.equal(copy.body, "Mechanical Issue · 2.1 miles away");
    assert.doesNotMatch(copy.body, /555|@|medical|allerg/i);
  });

  it("builds safe response status copy with responder name only", () => {
    assert.deepEqual(buildSosRespondedPushCopy("Mike R."), {
      title: "🚨 Help Is Responding",
      body: "Mike R. is responding to your SOS",
    });
    assert.deepEqual(buildSosArrivedPushCopy("Mike R."), {
      title: "✅ Help Arrived",
      body: "Mike R. marked arrived",
    });
  });

  it("uses deterministic per-recipient idempotency keys", () => {
    const key = riderSosNotificationIdempotencyKey(
      "alert-1",
      "sos_activated",
      "rider-2",
    );

    assert.equal(key, "rider_sos:sos_activated:alert-1:rider-2");
    assert.equal(
      key,
      riderSosNotificationGroupKey("alert-1", "sos_activated", "rider-2"),
    );
    assert.notEqual(
      key,
      riderSosNotificationIdempotencyKey("alert-1", "sos_responded", "rider-2"),
    );
  });

  it("routes push taps to the SOS alert detail", () => {
    assert.equal(riderSosAlertPath("alert-1"), "/rider-sos/alerts/alert-1");
  });
});


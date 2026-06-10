import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPickupOrderTimeline,
  buildShippingOrderTimeline,
} from "@/lib/shop/order-timeline";

describe("buildShippingOrderTimeline", () => {
  it("shows delivered as the current step for delivered orders", () => {
    const steps = buildShippingOrderTimeline({
      fulfillment_status: "delivered",
      created_at: "2026-06-01T10:00:00.000Z",
      fulfilled_at: "2026-06-02T10:00:00.000Z",
      shipped_at: "2026-06-03T10:00:00.000Z",
      delivered_at: "2026-06-04T10:00:00.000Z",
    });

    const delivered = steps.find((step) => step.key === "delivered");
    assert.ok(delivered);
    assert.equal(delivered?.complete, true);
    assert.equal(delivered?.current, true);
    assert.equal(delivered?.label, "Delivered");
  });

  it("does not mark delivered complete for shipped orders", () => {
    const steps = buildShippingOrderTimeline({
      fulfillment_status: "shipped",
      created_at: "2026-06-01T10:00:00.000Z",
      fulfilled_at: "2026-06-02T10:00:00.000Z",
      shipped_at: "2026-06-03T10:00:00.000Z",
      delivered_at: null,
    });

    const delivered = steps.find((step) => step.key === "delivered");
    assert.equal(delivered?.complete, false);
    assert.equal(delivered?.current, false);
  });
});

describe("buildPickupOrderTimeline", () => {
  it("shows completed for picked up pickup orders", () => {
    const steps = buildPickupOrderTimeline({
      pickup_status: "picked_up",
      created_at: "2026-06-01T10:00:00.000Z",
      pickup_ready_at: "2026-06-02T10:00:00.000Z",
      picked_up_at: "2026-06-03T10:00:00.000Z",
    });

    const completed = steps.find((step) => step.key === "completed");
    assert.equal(completed?.complete, true);
    assert.equal(completed?.current, true);
    assert.equal(steps.some((step) => step.key === "delivered"), false);
  });
});

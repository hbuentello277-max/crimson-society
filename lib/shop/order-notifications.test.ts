import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { orderNotificationPath } from "@/lib/notifications";

describe("order delivered notification contract", () => {
  it("uses order_delivered type and buyer order detail destination", () => {
    const orderId = "order-delivered-99";
    const notification = {
      type: "order_delivered",
      title: "Order delivered",
      body: "Your Crimson Society order was delivered.",
      target_url: orderNotificationPath(orderId),
      metadata: { order_id: orderId, entity_type: "order_delivered" },
    };

    assert.equal(notification.type, "order_delivered");
    assert.equal(notification.body, "Your Crimson Society order was delivered.");
    assert.equal(notification.target_url, `/profile/orders/${orderId}`);
  });
});

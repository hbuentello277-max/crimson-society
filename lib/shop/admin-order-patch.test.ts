import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAdminOrderUpdateRow,
  validateFulfillmentTransition,
} from "@/lib/shop/admin-order-patch";

describe("validateFulfillmentTransition", () => {
  it("allows shipped orders to be marked delivered", () => {
    assert.equal(
      validateFulfillmentTransition(
        { fulfillment_status: "shipped", delivery_method: "shipping" },
        "delivered",
      ),
      null,
    );
  });

  it("rejects delivered for unfulfilled shipping orders", () => {
    assert.match(
      validateFulfillmentTransition(
        { fulfillment_status: "unfulfilled", delivery_method: "shipping" },
        "delivered",
      ),
      /shipped orders/i,
    );
  });

  it("rejects delivered for pickup orders", () => {
    assert.match(
      validateFulfillmentTransition(
        { fulfillment_status: "shipped", delivery_method: "local_pickup" },
        "delivered",
      ),
      /shipping orders only/i,
    );
  });
});

describe("buildAdminOrderUpdateRow", () => {
  it("sets delivered_at when marking an order delivered", () => {
    const row = buildAdminOrderUpdateRow(
      { fulfillment_status: "delivered" },
      {
        fulfilled_at: "2026-06-01T00:00:00.000Z",
        shipped_at: "2026-06-02T00:00:00.000Z",
        delivered_at: null,
      },
    );

    assert.equal(row.fulfillment_status, "delivered");
    assert.equal(typeof row.delivered_at, "string");
    assert.equal("shipped_at" in row, false);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isShopPaymentCheckoutType } from "@/lib/shop/checkout-types";

describe("isShopPaymentCheckoutType", () => {
  it("accepts merch and reward cash checkout types", () => {
    assert.equal(isShopPaymentCheckoutType("merch"), true);
    assert.equal(isShopPaymentCheckoutType("reward_cash"), true);
    assert.equal(isShopPaymentCheckoutType("subscription"), false);
  });
});

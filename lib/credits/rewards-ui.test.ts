import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isBuyProductPurchasable } from "@/lib/credits/buy-product";
import type { CreditsRewardBuyProduct } from "@/lib/credits/rewards-api-types";
import { getRewardActionState } from "@/lib/credits/rewards-ui";

const buyProduct: CreditsRewardBuyProduct = {
  product_id: "merch-1",
  slug: "silent-movement-shirt",
  title: "Silent Movement Shirt",
  price: 48,
  requires_shirt_size: true,
  sizes: ["S", "M", "L"],
  size_inventory: {
    M: { total: 10, available: 5, reserved: 0, sold: 5 },
  },
  inventory_remaining: null,
};

describe("getRewardActionState", () => {
  it("returns redeem for Blackcard members with enough credits", () => {
    const action = getRewardActionState({
      canRedeem: true,
      balance: 500,
      creditCost: 200,
      rewardCategory: "community",
      monthlyCashUsed: 0,
      monthlyCashCap: 500,
      inventoryRemaining: 10,
      requiresShirtSize: false,
      selectedShirtSize: null,
      buyProduct,
    });

    assert.equal(action.kind, "redeem");
  });

  it("returns buy with insufficient credits message when linked merch exists", () => {
    const action = getRewardActionState({
      canRedeem: true,
      balance: 50,
      creditCost: 200,
      rewardCategory: "community",
      monthlyCashUsed: 0,
      monthlyCashCap: 500,
      inventoryRemaining: 10,
      requiresShirtSize: true,
      selectedShirtSize: "M",
      buyProduct,
    });

    assert.equal(action.kind, "buy");
    if (action.kind === "buy") {
      assert.equal(action.showInsufficientCredits, true);
      assert.equal(action.buyProduct.product_id, "merch-1");
    }
  });

  it("returns disabled when credits are insufficient and no buy product is linked", () => {
    const action = getRewardActionState({
      canRedeem: true,
      balance: 50,
      creditCost: 200,
      rewardCategory: "community",
      monthlyCashUsed: 0,
      monthlyCashCap: 500,
      inventoryRemaining: 10,
      requiresShirtSize: false,
      selectedShirtSize: null,
      buyProduct: null,
    });

    assert.equal(action.kind, "disabled");
    if (action.kind === "disabled") {
      assert.match(action.message, /Not enough credits/i);
    }
  });

  it("returns upgrade with buy product for non-Blackcard members when merch is linked", () => {
    const action = getRewardActionState({
      canRedeem: false,
      balance: 1000,
      creditCost: 200,
      rewardCategory: "community",
      monthlyCashUsed: 0,
      monthlyCashCap: 500,
      inventoryRemaining: 10,
      requiresShirtSize: true,
      selectedShirtSize: "M",
      buyProduct,
    });

    assert.equal(action.kind, "upgrade");
    if (action.kind === "upgrade") {
      assert.equal(action.buyProduct?.product_id, "merch-1");
    }
  });

  it("returns upgrade without buy product for non-Blackcard members when merch is not linked", () => {
    const action = getRewardActionState({
      canRedeem: false,
      balance: 1000,
      creditCost: 200,
      rewardCategory: "community",
      monthlyCashUsed: 0,
      monthlyCashCap: 500,
      inventoryRemaining: 10,
      requiresShirtSize: false,
      selectedShirtSize: null,
      buyProduct: null,
    });

    assert.equal(action.kind, "upgrade");
    if (action.kind === "upgrade") {
      assert.equal(action.buyProduct, null);
    }
  });
});

describe("isBuyProductPurchasable", () => {
  it("requires a selected size for sized merch products", () => {
    assert.equal(isBuyProductPurchasable(buyProduct, null), false);
    assert.equal(isBuyProductPurchasable(buyProduct, "M"), true);
  });
});

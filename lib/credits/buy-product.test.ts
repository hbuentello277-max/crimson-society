import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isBuyProductRowPurchasable,
  isCreditRewardDirectBuyable,
  mapCreditRewardToDirectBuyProduct,
  mapProductToBuyProduct,
  resolveRewardBuyProduct,
} from "@/lib/credits/buy-product";
import type { Product } from "@/lib/products";

describe("mapProductToBuyProduct", () => {
  it("maps purchasable merch rows", () => {
    const product = {
      id: "merch-1",
      slug: "shirt",
      name: "Shirt",
      price: 42,
      product_type: "cash_product",
      status: "in_stock",
      sizes: ["M"],
      requires_shirt_size: true,
      size_inventory: null,
      inventory_remaining: 5,
    } as Product;

    const mapped = mapProductToBuyProduct(product);
    assert.ok(mapped);
    assert.equal(mapped?.product_id, "merch-1");
    assert.equal(mapped?.price, 42);
    assert.equal(mapped?.purchase_mode, "linked_merch");
  });

  it("maps direct credit reward cash purchase rows", () => {
    const reward = {
      id: "reward-1",
      slug: "sticker",
      name: "CS Sticker",
      price: 4.99,
      product_type: "credit_reward",
      status: "in_stock",
      sizes: [],
      requires_shirt_size: false,
      size_inventory: null,
      inventory_remaining: 20,
    } as Product;

    assert.equal(isCreditRewardDirectBuyable(reward), true);
    const mapped = mapCreditRewardToDirectBuyProduct(reward);
    assert.ok(mapped);
    assert.equal(mapped?.purchase_mode, "direct_reward");
    assert.equal(mapped?.price, 4.99);
  });

  it("prefers linked merch over direct cash price", () => {
    const reward = {
      id: "reward-1",
      slug: "sticker",
      name: "CS Sticker",
      price: 4.99,
      product_type: "credit_reward",
      status: "in_stock",
      sizes: [],
      requires_shirt_size: false,
      size_inventory: null,
      inventory_remaining: 20,
      linked_merch_product_id: "merch-1",
    } as Product;

    const merch = {
      id: "merch-1",
      slug: "sticker-merch",
      name: "CS Sticker Merch",
      price: 5.99,
      product_type: "cash_product",
      status: "in_stock",
      sizes: [],
      requires_shirt_size: false,
      size_inventory: null,
      inventory_remaining: 10,
    } as Product;

    const resolved = resolveRewardBuyProduct(reward, merch);
    assert.equal(resolved?.product_id, "merch-1");
    assert.equal(resolved?.purchase_mode, "linked_merch");
  });

  it("rejects credit reward rows without cash price and zero-price merch", () => {
    assert.equal(
      isBuyProductRowPurchasable({
        product_type: "credit_reward",
        status: "in_stock",
        price: 0,
      }),
      false,
    );
    assert.equal(
      mapProductToBuyProduct({
        product_type: "cash_product",
        status: "in_stock",
        price: 0,
      } as Product),
      null,
    );
    assert.equal(
      mapCreditRewardToDirectBuyProduct({
        product_type: "credit_reward",
        status: "in_stock",
        price: 0,
      } as Product),
      null,
    );
  });
});

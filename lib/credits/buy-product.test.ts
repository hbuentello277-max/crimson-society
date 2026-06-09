import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isBuyProductRowPurchasable, mapProductToBuyProduct } from "@/lib/credits/buy-product";
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
  });

  it("rejects credit reward rows and zero-price merch", () => {
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
  });
});

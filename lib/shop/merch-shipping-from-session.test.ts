import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractMerchShippingFromCheckoutSession,
  mergeMerchShippingPatch,
} from "@/lib/shop/merch-shipping-from-session";

function shippingSession() {
  return {
    metadata: { checkout_type: "merch", delivery_method: "shipping" },
    customer_email: "buyer@example.com",
    customer_details: {
      email: "buyer@example.com",
      name: "Alex Rider",
      phone: "+15551234567",
      address: null,
    },
    shipping_details: {
      name: "Alex Rider",
      phone: "+15551234567",
      address: {
        line1: "123 Main St",
        line2: "Apt 4",
        city: "Austin",
        state: "TX",
        postal_code: "78701",
        country: "US",
      },
    },
  };
}

describe("extractMerchShippingFromCheckoutSession", () => {
  it("saves shipping address for shipping orders", () => {
    const extracted = extractMerchShippingFromCheckoutSession(shippingSession(), "shipping");

    assert.equal(extracted.shipping_name, "Alex Rider");
    assert.equal(extracted.shipping_email, "buyer@example.com");
    assert.equal(extracted.shipping_phone, "+15551234567");
    assert.deepEqual(extracted.shipping_address, {
      line1: "123 Main St",
      line2: "Apt 4",
      city: "Austin",
      state: "TX",
      postal_code: "78701",
      country: "US",
    });
    assert.equal(extracted.warnings.length, 0);
  });

  it("does not require a shipping address for pickup orders", () => {
    const extracted = extractMerchShippingFromCheckoutSession(
      {
        ...shippingSession(),
        metadata: { checkout_type: "merch", delivery_method: "local_pickup" },
        shipping_details: null,
      },
      "local_pickup",
    );

    assert.equal(extracted.shipping_email, "buyer@example.com");
    assert.equal(extracted.shipping_address, null);
    assert.equal(extracted.warnings.length, 0);
  });

  it("warns safely when a shipping order has no address", () => {
    const extracted = extractMerchShippingFromCheckoutSession(
      {
        metadata: { checkout_type: "merch", delivery_method: "shipping" },
        customer_email: "buyer@example.com",
        customer_details: {
          email: "buyer@example.com",
          name: "Alex Rider",
          phone: null,
          address: null,
        },
        shipping_details: null,
      },
      "shipping",
    );

    assert.equal(extracted.shipping_address, null);
    assert.match(extracted.warnings.join(" "), /missing from Stripe checkout session/i);
  });
});

describe("mergeMerchShippingPatch", () => {
  it("fills missing shipping fields without overwriting existing values", () => {
    const patch = mergeMerchShippingPatch(
      {
        shipping_email: "existing@example.com",
        shipping_address: null,
      },
      extractMerchShippingFromCheckoutSession(shippingSession(), "shipping"),
      "shipping",
    );

    assert.equal(patch.shipping_email, undefined);
    assert.equal(patch.shipping_name, "Alex Rider");
    assert.equal(patch.shipping_address?.line1, "123 Main St");
  });

  it("allows fulfillment to proceed when only warnings are present", () => {
    const extracted = extractMerchShippingFromCheckoutSession(
      {
        metadata: { checkout_type: "merch", delivery_method: "shipping" },
        customer_email: "buyer@example.com",
        customer_details: { email: "buyer@example.com", name: "Alex Rider" },
        shipping_details: null,
      },
      "shipping",
    );

    const patch = mergeMerchShippingPatch({}, extracted, "shipping");

    assert.equal(patch.shipping_name, "Alex Rider");
    assert.equal(patch.shipping_address, undefined);
    assert.equal(extracted.warnings.length, 1);
  });
});

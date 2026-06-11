import type Stripe from "stripe";
import type { ShopDeliveryMethod, ShopOrderShippingAddress } from "@/lib/shop/orders";
import { isShopDeliveryMethod } from "@/lib/shop/orders";

export type MerchShippingExtraction = {
  shipping_name: string | null;
  shipping_email: string | null;
  shipping_phone: string | null;
  shipping_address: ShopOrderShippingAddress | null;
  warnings: string[];
};

type CheckoutCustomerDetails = Stripe.Checkout.Session["customer_details"];
type CheckoutAddress = NonNullable<NonNullable<CheckoutCustomerDetails>["address"]>;

export type MerchCheckoutSessionShippingInput = {
  metadata?: Stripe.Metadata | null;
  customer_details?: CheckoutCustomerDetails;
  customer_email?: string | null;
  shipping_details?: {
    name?: string | null;
    phone?: string | null;
    address?: Stripe.Address | null;
  } | null;
};

type StripeAddress = Stripe.Address | CheckoutAddress | null | undefined;

function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeStripeAddress(address: StripeAddress): ShopOrderShippingAddress | null {
  if (!address) return null;

  const normalized: ShopOrderShippingAddress = {
    line1: trimOrNull(address.line1) ?? undefined,
    line2: trimOrNull(address.line2) ?? undefined,
    city: trimOrNull(address.city) ?? undefined,
    state: trimOrNull(address.state) ?? undefined,
    postal_code: trimOrNull(address.postal_code) ?? undefined,
    country: trimOrNull(address.country) ?? undefined,
  };

  if (!normalized.line1 && !normalized.city && !normalized.postal_code && !normalized.country) {
    return null;
  }

  return normalized;
}

function hasShippableAddress(address: ShopOrderShippingAddress | null): boolean {
  return Boolean(address?.line1?.trim());
}

export function merchCheckoutSessionShippingInput(
  session: Stripe.Checkout.Session,
): MerchCheckoutSessionShippingInput {
  const shippingDetails =
    "shipping_details" in session
      ? (session.shipping_details as MerchCheckoutSessionShippingInput["shipping_details"])
      : null;

  return {
    metadata: session.metadata,
    customer_details: session.customer_details,
    customer_email: session.customer_email,
    shipping_details: shippingDetails,
  };
}

export function resolveMerchDeliveryMethod(
  session: Pick<MerchCheckoutSessionShippingInput, "metadata">,
  fallback: ShopDeliveryMethod = "shipping",
): ShopDeliveryMethod {
  const fromMetadata = session.metadata?.delivery_method?.trim();
  if (fromMetadata && isShopDeliveryMethod(fromMetadata)) {
    return fromMetadata;
  }

  return fallback;
}

/**
 * Extract contact + shipping fields from a Stripe Checkout Session for merch fulfillment.
 * Pickup orders never require a shipping address.
 */
export function extractMerchShippingFromCheckoutSession(
  session: MerchCheckoutSessionShippingInput,
  deliveryMethod: ShopDeliveryMethod,
): MerchShippingExtraction {
  const warnings: string[] = [];
  const customerDetails = session.customer_details;
  const shippingDetails = session.shipping_details;

  const shippingEmail =
    trimOrNull(customerDetails?.email) ?? trimOrNull(session.customer_email);
  const shippingPhone =
    trimOrNull(shippingDetails?.phone) ?? trimOrNull(customerDetails?.phone);

  if (deliveryMethod === "local_pickup") {
    return {
      shipping_name: trimOrNull(customerDetails?.name) ?? trimOrNull(shippingDetails?.name),
      shipping_email: shippingEmail,
      shipping_phone: shippingPhone,
      shipping_address: null,
      warnings,
    };
  }

  const shippingAddress =
    normalizeStripeAddress(shippingDetails?.address) ??
    normalizeStripeAddress(customerDetails?.address);

  const shippingName =
    trimOrNull(shippingDetails?.name) ?? trimOrNull(customerDetails?.name);

  if (!hasShippableAddress(shippingAddress)) {
    warnings.push("Shipping address missing from Stripe checkout session.");
  }

  return {
    shipping_name: shippingName,
    shipping_email: shippingEmail,
    shipping_phone: shippingPhone,
    shipping_address: shippingAddress,
    warnings,
  };
}

export type MerchFulfillmentShippingPatch = {
  shipping_name?: string | null;
  shipping_email?: string | null;
  shipping_phone?: string | null;
  shipping_address?: ShopOrderShippingAddress | null;
};

/** Merge extracted shipping fields without overwriting existing non-empty order values. */
export function mergeMerchShippingPatch(
  existing: MerchFulfillmentShippingPatch,
  extracted: MerchShippingExtraction,
  deliveryMethod: ShopDeliveryMethod,
): MerchFulfillmentShippingPatch {
  const patch: MerchFulfillmentShippingPatch = {};

  if (!existing.shipping_name?.trim() && extracted.shipping_name) {
    patch.shipping_name = extracted.shipping_name;
  }

  if (!existing.shipping_email?.trim() && extracted.shipping_email) {
    patch.shipping_email = extracted.shipping_email;
  }

  if (!existing.shipping_phone?.trim() && extracted.shipping_phone) {
    patch.shipping_phone = extracted.shipping_phone;
  }

  if (deliveryMethod === "shipping" && extracted.shipping_address) {
    if (!existing.shipping_address?.line1?.trim()) {
      patch.shipping_address = extracted.shipping_address;
    }
  }

  return patch;
}

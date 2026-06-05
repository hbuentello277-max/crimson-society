import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import type { CheckoutCartItemPayload, ShopDeliveryMethod } from "@/lib/shop/orders";
import type { CheckoutCartValidationResult, ValidatedCheckoutLine } from "@/lib/shop/validate-checkout-cart";
import { resolveLineImageUrl } from "@/lib/shop/product-image-url";
import { validateCheckoutCart } from "@/lib/shop/validate-checkout-cart";

export const MERCH_CHECKOUT_RESERVATION_MINUTES = 15;

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export type ReservedCheckoutLine = ValidatedCheckoutLine & {
  reservation_id: string | null;
};

export type MerchCheckoutSessionResult =
  | { ok: true; url: string; order_id: string }
  | { ok: false; status: number; error: string; code?: string };

export async function releaseReservationIds(
  supabase: SupabaseClient,
  reservationIds: Array<string | null | undefined>,
) {
  for (const id of reservationIds) {
    if (!id) continue;
    const { error } = await supabase.rpc("product_inventory_release_reservation", {
      p_reservation_id: id,
    });
    if (error) {
      console.error("[merch-checkout] release reservation failed", id, error.message);
    }
  }
}

async function reserveCartLines(
  supabase: SupabaseClient,
  userId: string,
  items: ValidatedCheckoutLine[],
): Promise<{ ok: true; lines: ReservedCheckoutLine[] } | { ok: false; error: string }> {
  const reserved: ReservedCheckoutLine[] = [];
  const reservationIds: string[] = [];

  for (const line of items) {
    const { data, error } = await supabase.rpc("product_inventory_reserve", {
      p_product_id: line.product_id,
      p_size_label: line.size,
      p_quantity: line.quantity,
      p_reservation_type: "merch_checkout",
      p_user_id: userId,
      p_redemption_id: null,
      p_expires_minutes: MERCH_CHECKOUT_RESERVATION_MINUTES,
    });

    if (error) {
      await releaseReservationIds(supabase, reservationIds);
      return { ok: false, error: error.message };
    }

    const reservationId = typeof data === "string" ? data : null;
    if (reservationId) {
      reservationIds.push(reservationId);
    }

    reserved.push({ ...line, reservation_id: reservationId });
  }

  return { ok: true, lines: reserved };
}

async function getOrCreateStripeCustomerId(
  supabase: SupabaseClient,
  stripe: Stripe,
  userId: string,
  email: string | undefined,
): Promise<string> {
  const { data: existing, error } = await supabase
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email: email || undefined,
    metadata: { supabase_user_id: userId },
  });

  const { error: insertError } = await supabase.from("stripe_customers").insert({
    user_id: userId,
    stripe_customer_id: customer.id,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  return customer.id;
}

function buildStripeLineItems(validation: CheckoutCartValidationResult) {
  const lineItems = validation.items.map(
    (line) => ({
      quantity: line.quantity,
      price_data: {
        currency: "usd",
        unit_amount: line.unit_price_cents,
        product_data: {
          name: line.product_name,
          description: `Size ${line.size}`,
          ...(line.product_image_url ? { images: [line.product_image_url] } : {}),
        },
      },
    }),
  ) satisfies Stripe.Checkout.SessionCreateParams["line_items"];

  if (validation.shipping_cents > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: validation.shipping_cents,
        product_data: {
          name: "Shipping",
          description: "Standard shipping",
        },
      },
    });
  }

  return lineItems;
}

export async function createMerchCheckoutSession(input: {
  supabase: SupabaseClient;
  admin: SupabaseClient;
  userId: string;
  userEmail?: string | null;
  cartItems: CheckoutCartItemPayload[];
  deliveryMethod?: ShopDeliveryMethod;
}): Promise<MerchCheckoutSessionResult> {
  const deliveryMethod = input.deliveryMethod ?? "shipping";
  const validation = await validateCheckoutCart(input.supabase, input.cartItems, deliveryMethod);

  if (!validation.ok || validation.items.length === 0) {
    return {
      ok: false,
      status: 422,
      error: validation.errors[0]?.message ?? "Your bag could not be validated.",
      code: "validation_failed",
    };
  }

  if (validation.subtotal_cents <= 0 || validation.total_cents <= 0) {
    return {
      ok: false,
      status: 422,
      error: "Your bag total must be greater than $0 to checkout.",
      code: "zero_total",
    };
  }

  const reserveResult = await reserveCartLines(input.admin, input.userId, validation.items);
  if (!reserveResult.ok) {
    return {
      ok: false,
      status: 409,
      error: reserveResult.error,
      code: "reservation_failed",
    };
  }

  const reservationIds = reserveResult.lines
    .map((l) => l.reservation_id)
    .filter((id): id is string => Boolean(id));

  const orderMetadata = {
    checkout_type: "merch",
    delivery_method: deliveryMethod,
    reservation_ids: reservationIds,
    validated_at: new Date().toISOString(),
    cart_snapshot: reserveResult.lines.map((line) => ({
      product_id: line.product_id,
      size: line.size,
      quantity: line.quantity,
      unit_price_cents: line.unit_price_cents,
      reservation_id: line.reservation_id,
    })),
  };

  const pickupStatus = deliveryMethod === "local_pickup" ? "pending" : "not_applicable";

  const { data: order, error: orderError } = await input.admin
    .from("shop_orders")
    .insert({
      user_id: input.userId,
      status: "pending",
      subtotal_cents: validation.subtotal_cents,
      shipping_cents: validation.shipping_cents,
      total_cents: validation.total_cents,
      currency: "usd",
      shipping_email: input.userEmail ?? null,
      delivery_method: deliveryMethod,
      pickup_status: pickupStatus,
      metadata: orderMetadata,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    await releaseReservationIds(input.admin, reservationIds);
    return {
      ok: false,
      status: 500,
      error: orderError?.message ?? "Could not create order.",
      code: "order_create_failed",
    };
  }

  const orderId = order.id as string;

  const itemRows = reserveResult.lines.map((line) => ({
    order_id: orderId,
    product_id: line.product_id,
    product_name: line.product_name,
    product_image_url: resolveLineImageUrl(line) ?? line.product_image_url,
    size: line.size,
    quantity: line.quantity,
    unit_price_cents: line.unit_price_cents,
    line_total_cents: line.line_total_cents,
    reservation_id: line.reservation_id,
    metadata: {},
  }));

  const { error: itemsError } = await input.admin.from("shop_order_items").insert(itemRows);

  if (itemsError) {
    await input.admin.from("shop_orders").update({ status: "cancelled" }).eq("id", orderId);
    await releaseReservationIds(input.admin, reservationIds);
    return {
      ok: false,
      status: 500,
      error: itemsError.message,
      code: "order_items_failed",
    };
  }

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch (e) {
    await input.admin.from("shop_orders").update({ status: "cancelled" }).eq("id", orderId);
    await releaseReservationIds(input.admin, reservationIds);
    return {
      ok: false,
      status: 500,
      error: e instanceof Error ? e.message : "Stripe is not configured.",
      code: "stripe_config",
    };
  }

  let stripeCustomerId: string;
  try {
    stripeCustomerId = await getOrCreateStripeCustomerId(
      input.admin,
      stripe,
      input.userId,
      input.userEmail ?? undefined,
    );
  } catch (e) {
    await input.admin.from("shop_orders").update({ status: "cancelled" }).eq("id", orderId);
    await releaseReservationIds(input.admin, reservationIds);
    return {
      ok: false,
      status: 500,
      error: e instanceof Error ? e.message : "Could not create Stripe customer.",
      code: "stripe_customer_failed",
    };
  }

  try {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      customer: stripeCustomerId,
      line_items: buildStripeLineItems(validation),
      success_url: `${SITE_URL}/shop/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/shop/checkout?cancelled=1&order=${orderId}`,
      client_reference_id: orderId,
      metadata: {
        checkout_type: "merch",
        shop_order_id: orderId,
        supabase_user_id: input.userId,
        delivery_method: deliveryMethod,
        reservation_ids: reservationIds.join(","),
      },
    };

    if (deliveryMethod === "shipping") {
      sessionParams.shipping_address_collection = {
        allowed_countries: ["US"],
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    const { error: updateError } = await input.admin
      .from("shop_orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", orderId);

    if (updateError) {
      await input.admin.from("shop_orders").update({ status: "cancelled" }).eq("id", orderId);
      await releaseReservationIds(input.admin, reservationIds);
      return {
        ok: false,
        status: 500,
        error: updateError.message,
        code: "order_update_failed",
      };
    }

    return { ok: true, url: session.url, order_id: orderId };
  } catch (e) {
    await input.admin.from("shop_orders").update({ status: "cancelled" }).eq("id", orderId);
    await releaseReservationIds(input.admin, reservationIds);
    return {
      ok: false,
      status: 500,
      error: e instanceof Error ? e.message : "Failed to create Stripe checkout session.",
      code: "stripe_session_failed",
    };
  }
}

export async function cancelPendingMerchOrder(input: {
  admin: SupabaseClient;
  userId: string;
  orderId: string;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { data: order, error: orderError } = await input.admin
    .from("shop_orders")
    .select("id, user_id, status")
    .eq("id", input.orderId)
    .maybeSingle();

  if (orderError) {
    return { ok: false, status: 500, error: orderError.message };
  }

  if (!order) {
    return { ok: false, status: 404, error: "Order not found." };
  }

  if (order.user_id !== input.userId) {
    return { ok: false, status: 403, error: "Forbidden." };
  }

  if (order.status !== "pending") {
    return { ok: true };
  }

  const { data: items, error: itemsError } = await input.admin
    .from("shop_order_items")
    .select("reservation_id")
    .eq("order_id", input.orderId);

  if (itemsError) {
    return { ok: false, status: 500, error: itemsError.message };
  }

  await releaseReservationIds(
    input.admin,
    (items ?? []).map((row) => row.reservation_id as string | null),
  );

  const { error: cancelError } = await input.admin
    .from("shop_orders")
    .update({ status: "cancelled" })
    .eq("id", input.orderId)
    .eq("status", "pending");

  if (cancelError) {
    return { ok: false, status: 500, error: cancelError.message };
  }

  return { ok: true };
}

export async function cancelPendingMerchOrderById(input: {
  admin: SupabaseClient;
  orderId: string;
}): Promise<{ ok: true; reason?: string } | { ok: false; error: string }> {
  const { data: order, error: orderError } = await input.admin
    .from("shop_orders")
    .select("id, status")
    .eq("id", input.orderId)
    .maybeSingle();

  if (orderError) {
    return { ok: false, error: orderError.message };
  }

  if (!order) {
    return { ok: false, error: "Order not found." };
  }

  if (order.status !== "pending") {
    return { ok: true, reason: "not_pending" };
  }

  const { data: items, error: itemsError } = await input.admin
    .from("shop_order_items")
    .select("reservation_id")
    .eq("order_id", input.orderId);

  if (itemsError) {
    return { ok: false, error: itemsError.message };
  }

  await releaseReservationIds(
    input.admin,
    (items ?? []).map((row) => row.reservation_id as string | null),
  );

  const { error: cancelError } = await input.admin
    .from("shop_orders")
    .update({ status: "cancelled" })
    .eq("id", input.orderId)
    .eq("status", "pending");

  if (cancelError) {
    return { ok: false, error: cancelError.message };
  }

  return { ok: true };
}

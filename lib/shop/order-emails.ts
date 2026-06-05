import type { SupabaseClient } from "@supabase/supabase-js";
import { sendResendEmail } from "@/lib/email/resend";
import {
  orderConfirmationEmailHtml,
  readyForPickupEmailHtml,
  shippedEmailHtml,
  type OrderEmailLine,
} from "@/lib/shop/order-email-templates";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

import type { ShopOrderEmailType } from "@/lib/shop/orders";

export type { ShopOrderEmailType };

export type OrderEmailSendResult = {
  email_type: ShopOrderEmailType;
  sent: boolean;
  skipped?: boolean;
  skipped_reason?: string;
  sent_to?: string;
  error?: string;
  provider_message_id?: string;
};

type OrderRow = {
  id: string;
  user_id: string | null;
  status: string;
  delivery_method: string;
  pickup_status: string;
  fulfillment_status: string;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  shipping_email: string | null;
  tracking_carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  customer_note: string | null;
  pickup_note: string | null;
  shop_order_items: {
    product_name: string;
    size: string | null;
    quantity: number;
    line_total_cents: number;
  }[];
};

function orderDetailUrl(orderId: string) {
  return `${SITE_URL}/profile/orders/${orderId}`;
}

function isUniqueViolation(error: { code?: string } | null) {
  return error?.code === "23505";
}

async function resolveRecipientEmail(
  admin: SupabaseClient,
  order: { user_id: string | null; shipping_email: string | null },
): Promise<string | null> {
  if (order.shipping_email?.trim()) {
    return order.shipping_email.trim();
  }

  if (!order.user_id) return null;

  const { data, error } = await admin.auth.admin.getUserById(order.user_id);
  if (error) {
    console.warn("[order-email] could not load user email", error.message);
    return null;
  }

  return data.user?.email?.trim() ?? null;
}

async function loadOrder(admin: SupabaseClient, orderId: string): Promise<OrderRow | null> {
  const { data, error } = await admin
    .from("shop_orders")
    .select(
      `id, user_id, status, delivery_method, pickup_status, fulfillment_status,
       subtotal_cents, shipping_cents, total_cents, shipping_email,
       tracking_carrier, tracking_number, tracking_url, customer_note, pickup_note,
       shop_order_items (product_name, size, quantity, line_total_cents)`,
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    console.error("[order-email] order load failed", error.message);
    return null;
  }

  return data as OrderRow | null;
}

/**
 * Inserts idempotency row before send. Returns false if this email type was already sent.
 */
async function claimEmailSend(
  admin: SupabaseClient,
  orderId: string,
  emailType: ShopOrderEmailType,
  sentTo: string,
): Promise<{ claimed: boolean; eventId?: string }> {
  const { data, error } = await admin
    .from("shop_order_email_events")
    .insert({
      order_id: orderId,
      email_type: emailType,
      sent_to: sentTo,
      sent_at: new Date().toISOString(),
      metadata: { status: "pending" },
    })
    .select("id")
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      return { claimed: false };
    }
    console.error("[order-email] claim insert failed", error.message);
    return { claimed: false };
  }

  return { claimed: true, eventId: data.id as string };
}

async function finalizeEmailEvent(
  admin: SupabaseClient,
  eventId: string,
  result: { provider_message_id?: string; error?: string; skipped?: boolean },
) {
  const metadata: Record<string, unknown> = { status: result.error ? "failed" : "sent" };
  if (result.error) metadata.error = result.error;
  if (result.skipped) metadata.skipped = true;

  await admin
    .from("shop_order_email_events")
    .update({
      provider_message_id: result.provider_message_id ?? null,
      metadata,
    })
    .eq("id", eventId);
}

async function releaseEmailClaim(admin: SupabaseClient, eventId: string) {
  await admin.from("shop_order_email_events").delete().eq("id", eventId);
}

async function sendWithIdempotency(
  admin: SupabaseClient,
  orderId: string,
  emailType: ShopOrderEmailType,
  sentTo: string,
  build: () => { subject: string; html: string },
): Promise<OrderEmailSendResult> {
  const claim = await claimEmailSend(admin, orderId, emailType, sentTo);
  if (!claim.claimed || !claim.eventId) {
    return { email_type: emailType, sent: false, skipped: true, skipped_reason: "already_sent" };
  }

  const { subject, html } = build();
  const sendResult = await sendResendEmail({ to: sentTo, subject, html });

  if (sendResult.ok === false && sendResult.skipped) {
    await releaseEmailClaim(admin, claim.eventId);
    return {
      email_type: emailType,
      sent: false,
      skipped: true,
      skipped_reason: sendResult.reason,
      sent_to: sentTo,
    };
  }

  if (!sendResult.ok) {
    await finalizeEmailEvent(admin, claim.eventId, { error: sendResult.error });
    return {
      email_type: emailType,
      sent: false,
      sent_to: sentTo,
      error: sendResult.error,
    };
  }

  await finalizeEmailEvent(admin, claim.eventId, { provider_message_id: sendResult.id });
  return {
    email_type: emailType,
    sent: true,
    sent_to: sentTo,
    provider_message_id: sendResult.id,
  };
}

export async function sendOrderConfirmationEmail(
  admin: SupabaseClient,
  orderId: string,
): Promise<OrderEmailSendResult> {
  const order = await loadOrder(admin, orderId);
  if (!order) {
    return { email_type: "order_confirmation", sent: false, error: "order_not_found" };
  }

  if (order.status !== "paid") {
    return { email_type: "order_confirmation", sent: false, skipped: true, skipped_reason: "not_paid" };
  }

  const sentTo = await resolveRecipientEmail(admin, order);
  if (!sentTo) {
    return { email_type: "order_confirmation", sent: false, error: "no_recipient_email" };
  }

  const items: OrderEmailLine[] = (order.shop_order_items ?? []).map((item) => ({
    product_name: item.product_name,
    size: item.size,
    quantity: item.quantity,
    line_total_cents: item.line_total_cents,
  }));

  return sendWithIdempotency(admin, orderId, "order_confirmation", sentTo, () =>
    orderConfirmationEmailHtml({
      orderId,
      items,
      subtotal_cents: order.subtotal_cents,
      shipping_cents: order.shipping_cents,
      total_cents: order.total_cents,
      delivery_method: order.delivery_method,
      orderUrl: orderDetailUrl(orderId),
    }),
  );
}

export async function sendReadyForPickupEmail(
  admin: SupabaseClient,
  orderId: string,
): Promise<OrderEmailSendResult> {
  const order = await loadOrder(admin, orderId);
  if (!order) {
    return { email_type: "ready_for_pickup", sent: false, error: "order_not_found" };
  }

  if (order.delivery_method !== "local_pickup") {
    return {
      email_type: "ready_for_pickup",
      sent: false,
      skipped: true,
      skipped_reason: "not_local_pickup",
    };
  }

  if (order.pickup_status !== "ready") {
    return {
      email_type: "ready_for_pickup",
      sent: false,
      skipped: true,
      skipped_reason: "not_ready",
    };
  }

  const sentTo = await resolveRecipientEmail(admin, order);
  if (!sentTo) {
    return { email_type: "ready_for_pickup", sent: false, error: "no_recipient_email" };
  }

  return sendWithIdempotency(admin, orderId, "ready_for_pickup", sentTo, () =>
    readyForPickupEmailHtml({
      orderId,
      pickup_note: order.pickup_note,
      orderUrl: orderDetailUrl(orderId),
    }),
  );
}

export async function sendShippedEmail(
  admin: SupabaseClient,
  orderId: string,
): Promise<OrderEmailSendResult> {
  const order = await loadOrder(admin, orderId);
  if (!order) {
    return { email_type: "shipped", sent: false, error: "order_not_found" };
  }

  if (order.delivery_method !== "shipping") {
    return { email_type: "shipped", sent: false, skipped: true, skipped_reason: "not_shipping" };
  }

  if (order.fulfillment_status !== "shipped") {
    return { email_type: "shipped", sent: false, skipped: true, skipped_reason: "not_shipped" };
  }

  const sentTo = await resolveRecipientEmail(admin, order);
  if (!sentTo) {
    return { email_type: "shipped", sent: false, error: "no_recipient_email" };
  }

  return sendWithIdempotency(admin, orderId, "shipped", sentTo, () =>
    shippedEmailHtml({
      orderId,
      tracking_carrier: order.tracking_carrier,
      tracking_number: order.tracking_number,
      tracking_url: order.tracking_url,
      customer_note: order.customer_note,
      orderUrl: orderDetailUrl(orderId),
    }),
  );
}

export type ShopOrderEmailEventRow = {
  id: string;
  email_type: ShopOrderEmailType;
  sent_to: string;
  sent_at: string;
  provider_message_id: string | null;
  metadata: Record<string, unknown>;
};

export async function listOrderEmailEvents(
  admin: SupabaseClient,
  orderId: string,
): Promise<ShopOrderEmailEventRow[]> {
  const { data, error } = await admin
    .from("shop_order_email_events")
    .select("id, email_type, sent_to, sent_at, provider_message_id, metadata")
    .eq("order_id", orderId)
    .order("sent_at", { ascending: true });

  if (error) {
    console.error("[order-email] list events failed", error.message);
    return [];
  }

  return (data ?? []) as ShopOrderEmailEventRow[];
}

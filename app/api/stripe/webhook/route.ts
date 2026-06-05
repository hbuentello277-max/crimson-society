import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { awardReferralBlackcardConversion } from "@/lib/credits/award-referral-blackcard";
import { fulfillMerchOrderFromCheckoutSession } from "@/lib/shop/fulfill-merch-order";
import { cancelPendingMerchOrderById } from "@/lib/shop/merch-checkout";
import { syncBlackcardPublicForUser } from "@/lib/stripe/sync-blackcard-public";
import {
  claimStripeWebhookEvent,
  markStripeWebhookFailed,
  markStripeWebhookProcessed,
} from "@/lib/stripe/webhook-idempotency";
import { normalizeMembershipPlanType } from "@/lib/membership";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function toIso(unix: number | null | undefined) {
  return unix ? new Date(unix * 1000).toISOString() : null;
}

function getSubscriptionTimestamp(
  subscription: Stripe.Subscription,
  key: "current_period_start" | "current_period_end" | "cancel_at" | "canceled_at" | "trial_start" | "trial_end",
) {
  return (subscription as unknown as Record<string, number | null | undefined>)[key];
}

function getSubscriptionPeriodIso(
  subscription: Stripe.Subscription,
  item: Stripe.SubscriptionItem | undefined,
  key: "current_period_start" | "current_period_end",
) {
  const itemValue = item
    ? (item as unknown as Record<string, number | null | undefined>)[key]
    : null;
  const subscriptionValue = getSubscriptionTimestamp(subscription, key);

  return toIso(itemValue ?? subscriptionValue ?? Math.floor(Date.now() / 1000));
}

async function upsertStripeCustomer(userId: string, customerId: string) {
  const supabaseAdmin = getSupabaseAdmin();

  const { error } = await supabaseAdmin.from("stripe_customers").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw error;
  }
}

async function upsertSubscription(subscription: Stripe.Subscription) {
  const supabaseAdmin = getSupabaseAdmin();

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const metadata = subscription.metadata || {};
  let userId = metadata.supabase_user_id || metadata.user_id || null;
  let planType = normalizeMembershipPlanType(metadata.plan_type);
  let membershipPlanId = metadata.membership_plan_id || null;

  if (!userId && customerId) {
    const { data: customerRow, error: customerLookupError } = await supabaseAdmin
      .from("stripe_customers")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    if (customerLookupError) {
      throw customerLookupError;
    }

    userId = customerRow?.user_id ?? null;
  }

  if (!userId) {
    console.warn("No user_id found for subscription", subscription.id);
    return;
  }

  const item = subscription.items.data[0];
  const stripePriceId = item?.price?.id ?? null;

  if (!stripePriceId) {
    throw new Error(`Missing Stripe price ID for subscription ${subscription.id}`);
  }

  if (!membershipPlanId && planType) {
    const query = supabaseAdmin
      .from("membership_plans")
      .select("id")
      .eq("plan_type", planType)
      .limit(1);

    const { data: planRow, error: planLookupError } = stripePriceId
      ? await query.or(`stripe_price_id.eq.${stripePriceId},stripe_price_id.is.null`)
      : await query.maybeSingle();

    if (planLookupError) {
      throw planLookupError;
    }

    membershipPlanId = Array.isArray(planRow)
      ? planRow[0]?.id ?? null
      : planRow?.id ?? null;
  }

  if ((!membershipPlanId || !planType) && stripePriceId) {
    const { data: planRow, error: planLookupError } = await supabaseAdmin
      .from("membership_plans")
      .select("id, plan_type")
      .eq("stripe_price_id", stripePriceId)
      .maybeSingle();

    if (planLookupError) {
      throw planLookupError;
    }

    membershipPlanId = membershipPlanId ?? planRow?.id ?? null;
    planType = planType ?? normalizeMembershipPlanType(planRow?.plan_type);
  }

  const { error } = await supabaseAdmin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      price_id: stripePriceId,
      subscription_status: subscription.status,
      plan_type: planType,
      status: subscription.status,
      current_period_start: getSubscriptionPeriodIso(
        subscription,
        item,
        "current_period_start",
      ),
      current_period_end: getSubscriptionPeriodIso(
        subscription,
        item,
        "current_period_end",
      ),
      cancel_at_period_end: subscription.cancel_at_period_end,
      cancel_at: toIso(getSubscriptionTimestamp(subscription, "cancel_at")),
      canceled_at: toIso(getSubscriptionTimestamp(subscription, "canceled_at")),
      trial_start: toIso(getSubscriptionTimestamp(subscription, "trial_start")),
      trial_end: toIso(getSubscriptionTimestamp(subscription, "trial_end")),
      metadata: subscription.metadata ?? {},
      membership_plan_id: membershipPlanId,
    },
    { onConflict: "stripe_subscription_id" },
  );

  if (error) {
    throw error;
  }

  await syncBlackcardPublicForUser(supabaseAdmin, userId);

  if (subscription.status === "active" || subscription.status === "trialing") {
    await awardReferralBlackcardConversion(supabaseAdmin, userId);
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  if (session.metadata?.checkout_type === "merch") {
    const admin = getSupabaseAdmin();
    const result = await fulfillMerchOrderFromCheckoutSession(admin, session);
    if (!result.ok && result.reason !== "not_merch_checkout") {
      console.info("[stripe-webhook] merch fulfillment", result);
    }
    return;
  }

  if (session.mode !== "subscription") {
    return;
  }

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

  const userId = session.metadata?.supabase_user_id || session.metadata?.user_id || null;

  if (customerId && userId) {
    await upsertStripeCustomer(userId, customerId);
  }

  if (session.subscription) {
    const subscription = await getStripe().subscriptions.retrieve(
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id,
    );

    await upsertSubscription(subscription);
  }
}

async function handleCheckoutSessionFailedOrExpired(session: Stripe.Checkout.Session) {
  if (session.metadata?.checkout_type !== "merch") {
    return;
  }

  const orderId =
    session.metadata.shop_order_id?.trim() ||
    session.client_reference_id?.trim() ||
    null;

  if (!orderId) {
    console.warn("[stripe-webhook] merch checkout failure missing order id", session.id);
    return;
  }

  const admin = getSupabaseAdmin();
  const result = await cancelPendingMerchOrderById({ admin, orderId });
  if (!result.ok) {
    throw new Error(result.error);
  }
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId =
    typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;

  if (!paymentIntentId || charge.amount_refunded < charge.amount) {
    return;
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("shop_orders")
    .update({ status: "refunded" })
    .eq("stripe_payment_intent_id", paymentIntentId)
    .eq("status", "paid");

  if (error) {
    throw error;
  }
}

async function handleInvoiceSubscriptionSync(invoice: Stripe.Invoice) {
  const subscriptionRef = (invoice as unknown as {
    subscription?: string | { id?: string | null } | null;
  }).subscription;
  const subscriptionId =
    typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id ?? null;

  if (!subscriptionId) {
    return;
  }

  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  await upsertSubscription(subscription);
}

async function handleRefundUpdated(refund: Stripe.Refund) {
  const chargeId = typeof refund.charge === "string" ? refund.charge : refund.charge?.id;
  if (!chargeId || refund.status !== "succeeded") {
    return;
  }

  const charge = await getStripe().charges.retrieve(chargeId);
  await handleChargeRefunded(charge);
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return new NextResponse("Missing STRIPE_WEBHOOK_SECRET", { status: 500 });
  }

  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return new NextResponse("Missing stripe-signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  const admin = getSupabaseAdmin();

  try {
    const claim = await claimStripeWebhookEvent(admin, event.id, event.type);
    if (claim !== "claimed") {
      return NextResponse.json({
        received: true,
        duplicate: claim === "duplicate",
        processing: claim === "processing",
      });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionFailedOrExpired(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertSubscription(subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceSubscriptionSync(invoice);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
        break;
      }

      case "refund.updated": {
        const refund = event.data.object as Stripe.Refund;
        await handleRefundUpdated(refund);
        break;
      }

      default:
        break;
    }

    await markStripeWebhookProcessed(admin, event.id);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("STRIPE WEBHOOK ERROR", error);
    await markStripeWebhookFailed(
      admin,
      event.id,
      error instanceof Error ? error.message : "Webhook handler failed",
    ).catch((markError) => {
      console.error("STRIPE WEBHOOK MARK FAILED ERROR", markError);
    });
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}

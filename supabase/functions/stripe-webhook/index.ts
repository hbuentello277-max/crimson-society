import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function tsFromStripe(value: number | null | undefined): string | null {
  if (!value) return null;
  return new Date(value * 1000).toISOString();
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function logWebhookEvent(event: Stripe.Event) {
  const { error } = await supabaseAdmin.rpc("log_stripe_webhook_event", {
    p_stripe_event_id: event.id,
    p_event_type: event.type,
    p_livemode: event.livemode,
    p_payload: event as unknown as Record<string, unknown>,
  });

  if (error) throw new Error(`Failed to log webhook event: ${error.message}`);

  const { data, error: existsError } = await supabaseAdmin
    .from("billing_webhook_events")
    .select("processed")
    .eq("stripe_event_id", event.id)
    .single();

  if (existsError) {
    throw new Error(
      `Failed to check existing webhook event: ${existsError.message}`
    );
  }

  return data?.processed === true;
}

async function markProcessed(eventId: string) {
  const { error } = await supabaseAdmin.rpc("mark_stripe_webhook_processed", {
    p_stripe_event_id: eventId,
  });

  if (error) {
    throw new Error(`Failed marking webhook processed: ${error.message}`);
  }
}

async function markFailed(eventId: string, message: string) {
  await supabaseAdmin.rpc("mark_stripe_webhook_failed", {
    p_stripe_event_id: eventId,
    p_error_message: message,
  });
}

async function getUserIdByStripeCustomer(stripeCustomerId: string) {
  const { data, error } = await supabaseAdmin.rpc(
    "get_user_id_by_stripe_customer",
    {
      p_stripe_customer_id: stripeCustomerId,
    }
  );

  if (error) throw new Error(`Customer lookup failed: ${error.message}`);
  return data as string | null;
}

async function upsertBillingCustomer(params: {
  userId: string;
  email: string | null;
  stripeCustomerId: string;
}) {
  const { error } = await supabaseAdmin.rpc("upsert_billing_customer", {
    p_user_id: params.userId,
    p_email: params.email,
    p_stripe_customer_id: params.stripeCustomerId,
  });

  if (error) throw new Error(`upsert_billing_customer failed: ${error.message}`);
}

async function upsertBillingSubscription(params: {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  tier?: string | null;
  stripePriceId?: string | null;
  stripeProductId?: string | null;
  planCode?: string | null;
  cancelAtPeriodEnd?: boolean;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  trialStart?: string | null;
  trialEnd?: string | null;
  canceledAt?: string | null;
  endedAt?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin.rpc("upsert_billing_subscription", {
    p_user_id: params.userId,
    p_stripe_customer_id: params.stripeCustomerId,
    p_stripe_subscription_id: params.stripeSubscriptionId,
    p_status: params.status,
    p_tier: params.tier ?? "apex",
    p_stripe_price_id: params.stripePriceId ?? null,
    p_stripe_product_id: params.stripeProductId ?? null,
    p_plan_code: params.planCode ?? null,
    p_cancel_at_period_end: params.cancelAtPeriodEnd ?? false,
    p_current_period_start: params.currentPeriodStart ?? null,
    p_current_period_end: params.currentPeriodEnd ?? null,
    p_trial_start: params.trialStart ?? null,
    p_trial_end: params.trialEnd ?? null,
    p_canceled_at: params.canceledAt ?? null,
    p_ended_at: params.endedAt ?? null,
    p_metadata: params.metadata ?? {},
  });

  if (error) {
    throw new Error(`upsert_billing_subscription failed: ${error.message}`);
  }
}

async function cancelBillingSubscription(params: {
  stripeSubscriptionId: string;
  status?: string;
  canceledAt?: string | null;
  endedAt?: string | null;
}) {
  const { error } = await supabaseAdmin.rpc("cancel_billing_subscription", {
    p_stripe_subscription_id: params.stripeSubscriptionId,
    p_status: params.status ?? "canceled",
    p_canceled_at: params.canceledAt ?? null,
    p_ended_at: params.endedAt ?? null,
  });

  if (error) {
    throw new Error(`cancel_billing_subscription failed: ${error.message}`);
  }
}

async function upsertBillingInvoice(params: {
  userId: string | null;
  stripeInvoiceId: string;
  stripeSubscriptionId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  status?: string | null;
  currency?: string | null;
  subtotalCents?: number | null;
  totalCents?: number | null;
  amountPaidCents?: number | null;
  amountRemainingCents?: number | null;
  hostedInvoiceUrl?: string | null;
  invoicePdf?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  paidAt?: string | null;
  dueAt?: string | null;
  raw?: Record<string, unknown>;
}) {
  if (!params.userId) return;

  const { error } = await supabaseAdmin.rpc("upsert_billing_invoice", {
    p_user_id: params.userId,
    p_stripe_invoice_id: params.stripeInvoiceId,
    p_stripe_subscription_id: params.stripeSubscriptionId ?? null,
    p_stripe_payment_intent_id: params.stripePaymentIntentId ?? null,
    p_stripe_charge_id: params.stripeChargeId ?? null,
    p_status: params.status ?? null,
    p_currency: params.currency ?? "usd",
    p_subtotal_cents: params.subtotalCents ?? null,
    p_total_cents: params.totalCents ?? null,
    p_amount_paid_cents: params.amountPaidCents ?? null,
    p_amount_remaining_cents: params.amountRemainingCents ?? null,
    p_hosted_invoice_url: params.hostedInvoiceUrl ?? null,
    p_invoice_pdf: params.invoicePdf ?? null,
    p_period_start: params.periodStart ?? null,
    p_period_end: params.periodEnd ?? null,
    p_paid_at: params.paidAt ?? null,
    p_due_at: params.dueAt ?? null,
    p_raw: params.raw ?? {},
  });

  if (error) throw new Error(`upsert_billing_invoice failed: ${error.message}`);
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId =
    getString(session.metadata?.user_id) ??
    getString(session.client_reference_id);

  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : null;

  if (!userId || !stripeCustomerId) {
    throw new Error("checkout.session.completed missing user_id or customer");
  }

  const email =
    getString(session.customer_details?.email) ??
    getString(session.customer_email);

  await upsertBillingCustomer({
    userId,
    email,
    stripeCustomerId,
  });

  if (typeof session.subscription === "string") {
    const sub = await stripe.subscriptions.retrieve(session.subscription, {
      expand: ["items.data.price.product"],
    });

    const item = sub.items.data[0];
    const stripePriceId = item?.price?.id ?? null;
    const stripeProductId =
      typeof item?.price?.product === "string"
        ? item.price.product
        : item?.price?.product?.id ?? null;

    await upsertBillingSubscription({
      userId,
      stripeCustomerId,
      stripeSubscriptionId: sub.id,
      status: sub.status,
      tier: getString(sub.metadata?.tier) ?? "apex",
      stripePriceId,
      stripeProductId,
      planCode: getString(sub.metadata?.plan_code),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      trialStart: tsFromStripe(sub.trial_start),
      trialEnd: tsFromStripe(sub.trial_end),
      canceledAt: tsFromStripe(sub.canceled_at),
      endedAt: tsFromStripe(sub.ended_at),
      metadata: sub.metadata ?? {},
    });
  }
}

async function handleSubscriptionUpsert(subscription: Stripe.Subscription) {
  const stripeCustomerId =
    typeof subscription.customer === "string" ? subscription.customer : null;

  if (!stripeCustomerId) {
    throw new Error("Subscription missing stripe customer id");
  }

  const userId =
    getString(subscription.metadata?.user_id) ??
    (await getUserIdByStripeCustomer(stripeCustomerId));

  if (!userId) {
    throw new Error(`No user found for stripe customer ${stripeCustomerId}`);
  }

  const item = subscription.items.data[0];
  const stripePriceId = item?.price?.id ?? null;
  const stripeProductId =
    typeof item?.price?.product === "string"
      ? item.price.product
      : item?.price?.product?.id ?? null;

  await upsertBillingSubscription({
    userId,
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    tier: getString(subscription.metadata?.tier) ?? "apex",
    stripePriceId,
    stripeProductId,
    planCode: getString(subscription.metadata?.plan_code),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    trialStart: tsFromStripe(subscription.trial_start),
    trialEnd: tsFromStripe(subscription.trial_end),
    canceledAt: tsFromStripe(subscription.canceled_at),
    endedAt: tsFromStripe(subscription.ended_at),
    metadata: subscription.metadata ?? {},
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await handleSubscriptionUpsert(subscription);

  await cancelBillingSubscription({
    stripeSubscriptionId: subscription.id,
    status: subscription.status || "canceled",
    canceledAt: tsFromStripe(subscription.canceled_at) ?? new Date().toISOString(),
    endedAt: tsFromStripe(subscription.ended_at) ?? new Date().toISOString(),
  });
}

async function handleInvoiceEvent(invoice: Stripe.Invoice) {
  const stripeCustomerId =
    typeof invoice.customer === "string" ? invoice.customer : null;

  const userId = stripeCustomerId
    ? await getUserIdByStripeCustomer(stripeCustomerId)
    : null;

  const periodStart =
    (invoice.lines.data[0]?.period?.start
      ? tsFromStripe(invoice.lines.data[0].period.start)
      : null) ?? null;

  const periodEnd =
    (invoice.lines.data[0]?.period?.end
      ? tsFromStripe(invoice.lines.data[0].period.end)
      : null) ?? null;

  await upsertBillingInvoice({
    userId,
    stripeInvoiceId: invoice.id,
    stripeSubscriptionId:
      typeof invoice.subscription === "string" ? invoice.subscription : null,
    stripePaymentIntentId:
      typeof invoice.payment_intent === "string" ? invoice.payment_intent : null,
    stripeChargeId: typeof invoice.charge === "string" ? invoice.charge : null,
    status: invoice.status,
    currency: invoice.currency,
    subtotalCents: invoice.subtotal ?? null,
    totalCents: invoice.total ?? null,
    amountPaidCents: invoice.amount_paid ?? null,
    amountRemainingCents: invoice.amount_remaining ?? null,
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    invoicePdf: invoice.invoice_pdf ?? null,
    periodStart,
    periodEnd,
    paidAt: invoice.status_transitions?.paid_at
      ? tsFromStripe(invoice.status_transitions.paid_at)
      : null,
    dueAt: tsFromStripe(invoice.due_date),
    raw: invoice as unknown as Record<string, unknown>,
  });

  if (
    userId &&
    typeof invoice.subscription === "string" &&
    (invoice.billing_reason === "subscription_cycle" ||
      invoice.billing_reason === "subscription_create")
  ) {
    const subscription = await stripe.subscriptions.retrieve(
      invoice.subscription,
      {
        expand: ["items.data.price.product"],
      }
    );

    await handleSubscriptionUpsert(subscription);
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return json({ error: "Missing stripe-signature header" }, 400);
  }

  const body = await request.text();

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET")!,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return json({ error: `Webhook signature verification failed: ${message}` }, 400);
  }

  try {
    const alreadyProcessed = await logWebhookEvent(event);

    if (alreadyProcessed) {
      return json({ received: true, duplicate: true, eventId: event.id }, 200);
    }

    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.resumed":
      case "customer.subscription.paused": {
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription);
        break;
      }

      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed":
      case "invoice.finalized":
      case "invoice.updated": {
        await handleInvoiceEvent(event.data.object as Stripe.Invoice);
        break;
      }

      default: {
        break;
      }
    }

    await markProcessed(event.id);

    return json({ received: true, eventId: event.id, type: event.type }, 200);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Webhook processing failed";

    await markFailed(event.id, message);

    return json(
      {
        error: message,
        eventId: event.id,
        type: event.type,
      },
      500
    );
  }
});
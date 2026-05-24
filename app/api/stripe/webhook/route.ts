import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";

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

async function upsertStripeCustomer(userId: string, customerId: string) {
  const supabaseAdmin = getSupabaseAdmin();

  const { error } = await supabaseAdmin.from("stripe_customers").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
    },
    { onConflict: "user_id" }
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
  const planType = metadata.plan_type || null;
  const membershipPlanId = metadata.membership_plan_id || null;

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

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        plan_type: planType,
        status: subscription.status,
        current_period_start: toIso(item?.current_period_start),
        current_period_end: toIso(item?.current_period_end),
        cancel_at_period_end: subscription.cancel_at_period_end,
        membership_plan_id: membershipPlanId,
      },
      { onConflict: "stripe_subscription_id" }
    );

  if (error) {
    throw error;
  }
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
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode !== "subscription") {
          break;
        }

        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id ?? null;

        const userId =
          session.metadata?.supabase_user_id ||
          session.metadata?.user_id ||
          null;

        if (customerId && userId) {
          await upsertStripeCustomer(userId, customerId);
        }

        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id
          );

          await upsertSubscription(subscription);
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertSubscription(subscription);
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("STRIPE WEBHOOK ERROR", error);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}
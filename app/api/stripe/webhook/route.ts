import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2026-04-22.dahlia",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

function toIso(unix: number | null | undefined) {
  return unix ? new Date(unix * 1000).toISOString() : null;
}

async function upsertSubscription(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const subscriptionId = subscription.id;
  const status = subscription.status;
  const cancelAtPeriodEnd = subscription.cancel_at_period_end;

  const metadata = subscription.metadata || {};
  let userId = metadata.user_id || null;
  const planType = metadata.plan_type || null;
  const membershipPlanId = metadata.membership_plan_id || null;

  if (!userId && customerId) {
    const { data: customerRow } = await supabaseAdmin
      .from("stripe_customers")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    userId = customerRow?.user_id ?? null;
  }

  if (!userId) return;

  await supabaseAdmin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan_type: planType,
      status,
      current_period_start: toIso(subscription.items.data[0]?.current_period_start),
      current_period_end: toIso(subscription.items.data[0]?.current_period_end),
      cancel_at_period_end: cancelAtPeriodEnd,
      membership_plan_id: membershipPlanId,
    },
    { onConflict: "stripe_subscription_id" }
  );
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return new NextResponse("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err) {
    console.error("WEBHOOK SIGNATURE ERROR", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id
          );

          await upsertSubscription(subscription);

          const customerId =
            typeof session.customer === "string"
              ? session.customer
              : session.customer?.id ?? null;

          const userId = session.metadata?.user_id ?? null;

          if (customerId && userId) {
            await supabaseAdmin.from("stripe_customers").upsert({
              user_id: userId,
              stripe_customer_id: customerId,
            });
          }

          await supabaseAdmin.from("subscriptions").upsert(
            {
              user_id: session.metadata?.user_id ?? null,
              stripe_customer_id: customerId,
              stripe_subscription_id:
                typeof session.subscription === "string"
                  ? session.subscription
                  : session.subscription.id,
              stripe_checkout_session_id: session.id,
              plan_type: session.metadata?.plan_type ?? null,
              membership_plan_id: session.metadata?.membership_plan_id ?? null,
              status: "active",
            },
            { onConflict: "stripe_subscription_id" }
          );
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
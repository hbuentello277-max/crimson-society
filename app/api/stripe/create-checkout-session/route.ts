import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { normalizeMembershipPlanType } from "@/lib/membership";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const PLAN_TYPE_TO_FALLBACK_PRICE_ID: Record<string, string | undefined> = {
  monthly: process.env.STRIPE_APEX_MONTHLY_PRICE_ID,
  yearly: process.env.STRIPE_APEX_YEARLY_PRICE_ID,
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const planType = normalizeMembershipPlanType(body.planType as string | undefined);

    if (!planType) {
      return NextResponse.json(
        { error: "Missing or invalid planType" },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile || profile.status !== "active") {
      return NextResponse.json(
        { error: "Your account is not eligible for checkout." },
        { status: 403 }
      );
    }

    const { data: plan, error: planError } = await supabase
      .from("membership_plans")
      .select("id, plan_type, active, stripe_price_id")
      .eq("plan_type", planType)
      .maybeSingle();

    if (planError) {
      return NextResponse.json({ error: planError.message }, { status: 500 });
    }

    if (!plan?.active) {
      return NextResponse.json(
        { error: "This membership plan is not active." },
        { status: 400 }
      );
    }

    const priceId = plan.stripe_price_id || PLAN_TYPE_TO_FALLBACK_PRICE_ID[planType];

    if (!priceId) {
      return NextResponse.json(
        { error: `No Stripe price configured for ${planType}` },
        { status: 400 }
      );
    }

    const { data: existingCustomer, error: existingCustomerError } = await supabase
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingCustomerError) {
      return NextResponse.json(
        { error: existingCustomerError.message },
        { status: 500 }
      );
    }

    let stripeCustomerId = existingCustomer?.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: {
          supabase_user_id: user.id,
        },
      });

      stripeCustomerId = customer.id;

      const { error: insertCustomerError } = await supabase
        .from("stripe_customers")
        .insert({
          user_id: user.id,
          stripe_customer_id: customer.id,
        });

      if (insertCustomerError) {
        return NextResponse.json(
          { error: insertCustomerError.message },
          { status: 500 }
        );
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/blackcard?canceled=true`,
      allow_promotion_codes: true,
      metadata: {
        supabase_user_id: user.id,
        plan_type: planType,
        membership_plan_id: plan.id,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan_type: planType,
          membership_plan_id: plan.id,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("create-checkout-session error:", error);

    return NextResponse.json(
      { error: error?.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
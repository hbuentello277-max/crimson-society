import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { stripe } from "@/lib/stripe";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const PLAN_TYPE_TO_PRICE_ID: Record<string, string | undefined> = {
  apex_monthly: process.env.STRIPE_APEX_MONTHLY_PRICE_ID,
  apex_yearly: process.env.STRIPE_APEX_YEARLY_PRICE_ID,
};

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const planType = body.planType as string | undefined;

    if (!planType) {
      return NextResponse.json(
        { error: "Missing planType" },
        { status: 400 }
      );
    }

    const priceId = PLAN_TYPE_TO_PRICE_ID[planType];

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
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan_type: planType,
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
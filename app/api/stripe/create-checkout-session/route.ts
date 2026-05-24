import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: "2026-04-22.dahlia",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const planType = body?.planType as "monthly" | "yearly";

    if (!planType || !["monthly", "yearly"].includes(planType)) {
      return NextResponse.json({ error: "Invalid plan type." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const accessToken =
      cookieStore.get("sb-access-token")?.value ||
      cookieStore.get("supabase-auth-token")?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await anonClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: plan, error: planError } = await supabaseAdmin
      .from("membership_plans")
      .select("id, plan_type, title, stripe_price_id, active")
      .eq("plan_type", planType)
      .single();

    if (planError || !plan || !plan.active || !plan.stripe_price_id) {
      return NextResponse.json(
        { error: "This membership plan is not available." },
        { status: 400 }
      );
    }

    const { data: existingCustomer } = await supabaseAdmin
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let stripeCustomerId = existingCustomer?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: {
          user_id: user.id,
        },
      });

      stripeCustomerId = customer.id;

      await supabaseAdmin.from("stripe_customers").upsert({
        user_id: user.id,
        stripe_customer_id: stripeCustomerId,
      });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price: plan.stripe_price_id,
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/blackcard?checkout=success`,
      cancel_url: `${siteUrl}/blackcard?checkout=cancel`,
      allow_promotion_codes: true,
      metadata: {
        user_id: user.id,
        plan_type: plan.plan_type,
        membership_plan_id: plan.id,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_type: plan.plan_type,
          membership_plan_id: plan.id,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("CREATE CHECKOUT SESSION ERROR", error);
    return NextResponse.json(
      { error: "Unable to create checkout session." },
      { status: 500 }
    );
  }
}
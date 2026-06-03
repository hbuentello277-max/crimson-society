import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(_req: NextRequest) {
  try {
    const stripe = getStripe();
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
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
        { error: "Your account is not eligible for billing management." },
        { status: 403 },
      );
    }

    const { data: customerRow, error: customerError } = await supabase
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (customerError) {
      return NextResponse.json({ error: customerError.message }, { status: 500 });
    }

    if (!customerRow?.stripe_customer_id) {
      return NextResponse.json(
        {
          error:
            "No billing account found. Subscribe to Blackcard first, then return here to manage your subscription.",
        },
        { status: 404 },
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerRow.stripe_customer_id,
      return_url: `${SITE_URL}/blackcard`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Billing portal URL was not returned." },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error("billing-portal error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to open billing portal.",
      },
      { status: 500 },
    );
  }
}

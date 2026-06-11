import { NextResponse } from "next/server";
import { createAdminServiceClient } from "@/lib/admin-api";
import { isCreditRewardDirectBuyable } from "@/lib/credits/buy-product";
import { createMerchCheckoutSession } from "@/lib/shop/merch-checkout";
import { parseDeliveryMethod } from "@/lib/shop/shipping";
import { getAuthedSupabaseFromRequest } from "@/lib/supabase-route-auth";

export async function POST(request: Request) {
  const auth = await getAuthedSupabaseFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  let body: { product_id?: string; size?: string; delivery_method?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const productId = body.product_id?.trim();
  if (!productId) {
    return NextResponse.json({ error: "product_id is required." }, { status: 400 });
  }

  const { data: product, error: productError } = await auth.supabase
    .from("products")
    .select(
      "id, product_type, price, status, requires_shirt_size, sizes, linked_merch_product_id",
    )
    .eq("id", productId)
    .maybeSingle();

  if (productError) {
    return NextResponse.json({ error: productError.message }, { status: 500 });
  }

  if (!product) {
    return NextResponse.json({ error: "Reward not found." }, { status: 404 });
  }

  if (product.linked_merch_product_id) {
    return NextResponse.json(
      {
        error:
          "This reward uses a linked merch product for Buy Now. Add it to your bag from the shop instead.",
        code: "linked_merch_required",
      },
      { status: 422 },
    );
  }

  if (!isCreditRewardDirectBuyable(product)) {
    return NextResponse.json(
      { error: "This reward is not available for direct cash purchase." },
      { status: 422 },
    );
  }

  const requiresSize =
    Boolean(product.requires_shirt_size) || (product.sizes?.length ?? 0) > 0;
  const size = body.size?.trim() || (requiresSize ? "" : "One Size");

  if (!size) {
    return NextResponse.json({ error: "Select a size before checkout." }, { status: 400 });
  }

  const {
    data: { user: authUser },
  } = await auth.supabase.auth.getUser();

  const { data: profile, error: profileError } = await auth.supabase
    .from("profiles")
    .select("status")
    .eq("id", auth.userId)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile || profile.status !== "active") {
    return NextResponse.json(
      { error: "Your account is not eligible for checkout." },
      { status: 403 },
    );
  }

  const deliveryMethod = parseDeliveryMethod(body.delivery_method);
  const admin = createAdminServiceClient();

  const result = await createMerchCheckoutSession({
    admin,
    userId: auth.userId,
    userEmail: authUser?.email ?? null,
    cartItems: [
      {
        product_id: productId,
        size,
        quantity: 1,
      },
    ],
    deliveryMethod,
    allowCreditRewardCashPurchase: true,
    checkoutType: "reward_cash",
    successUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/shop/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/shop?tab=credit-rewards&cancelled=1`,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status },
    );
  }

  return NextResponse.json({
    url: result.url,
    order_id: result.order_id,
  });
}

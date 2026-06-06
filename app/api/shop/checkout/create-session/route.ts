import { NextResponse } from "next/server";
import { createAdminServiceClient } from "@/lib/admin-api";
import { createMerchCheckoutSession } from "@/lib/shop/merch-checkout";
import type { CheckoutCartItemPayload } from "@/lib/shop/orders";
import { parseDeliveryMethod } from "@/lib/shop/shipping";
import { getAuthedSupabaseFromRequest } from "@/lib/supabase-route-auth";

export async function POST(request: Request) {
  const auth = await getAuthedSupabaseFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  let body: { items?: CheckoutCartItemPayload[]; delivery_method?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  const deliveryMethod = parseDeliveryMethod(body.delivery_method);

  if (items.length === 0) {
    return NextResponse.json({ error: "Your bag is empty." }, { status: 400 });
  }

  if (items.length > 50) {
    return NextResponse.json({ error: "Too many line items." }, { status: 400 });
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

  const admin = createAdminServiceClient();

  const result = await createMerchCheckoutSession({
    admin,
    userId: auth.userId,
    userEmail: authUser?.email ?? null,
    cartItems: items,
    deliveryMethod,
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

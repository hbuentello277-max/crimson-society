import { NextResponse } from "next/server";
import { createAdminServiceClient } from "@/lib/admin-api";
import { createMerchCheckoutSession } from "@/lib/shop/merch-checkout";
import type { CheckoutCartItemPayload } from "@/lib/shop/orders";
import { getAuthedSupabaseFromRequest } from "@/lib/supabase-route-auth";

export async function POST(request: Request) {
  const auth = await getAuthedSupabaseFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  let body: { items?: CheckoutCartItemPayload[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "Your bag is empty." }, { status: 400 });
  }

  if (items.length > 50) {
    return NextResponse.json({ error: "Too many line items." }, { status: 400 });
  }

  const {
    data: { user: authUser },
  } = await auth.supabase.auth.getUser();

  const admin = createAdminServiceClient();

  const result = await createMerchCheckoutSession({
    supabase: auth.supabase,
    admin,
    userId: auth.userId,
    userEmail: authUser?.email ?? null,
    cartItems: items,
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

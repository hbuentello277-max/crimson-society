import { NextResponse } from "next/server";
import { createAdminServiceClient } from "@/lib/admin-api";
import type { CheckoutCartItemPayload } from "@/lib/shop/orders";
import { cleanupExpiredMerchReservations } from "@/lib/shop/reservation-cleanup";
import { parseDeliveryMethod } from "@/lib/shop/shipping";
import { validateCheckoutCart } from "@/lib/shop/validate-checkout-cart";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  let body: { items?: CheckoutCartItemPayload[]; delivery_method?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  const deliveryMethod = parseDeliveryMethod(body.delivery_method);

  if (items.length > 50) {
    return NextResponse.json({ error: "Too many line items" }, { status: 400 });
  }

  try {
    await cleanupExpiredMerchReservations(createAdminServiceClient());
  } catch (error) {
    console.warn(
      "[checkout-validate] stale reservation cleanup failed",
      error instanceof Error ? error.message : error,
    );
  }

  const supabase = await createServerSupabaseClient();
  const result = await validateCheckoutCart(supabase, items, deliveryMethod);

  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}

import { NextResponse } from "next/server";
import type { CheckoutCartItemPayload } from "@/lib/shop/orders";
import { validateCheckoutCart } from "@/lib/shop/validate-checkout-cart";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  let body: { items?: CheckoutCartItemPayload[] };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];

  if (items.length > 50) {
    return NextResponse.json({ error: "Too many line items" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const result = await validateCheckoutCart(supabase, items);

  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}

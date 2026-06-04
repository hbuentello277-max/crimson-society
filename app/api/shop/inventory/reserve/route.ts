import { NextResponse } from "next/server";
import { getAuthedSupabaseFromRequest } from "@/lib/supabase-route-auth";

export async function POST(request: Request) {
  const auth = await getAuthedSupabaseFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  let body: {
    productId?: string;
    size?: string;
    quantity?: number;
    expiresMinutes?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const productId = body.productId?.trim();
  if (!productId) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }

  const { data, error } = await auth.supabase.rpc("product_inventory_reserve", {
    p_product_id: productId,
    p_size_label: body.size?.trim() || null,
    p_quantity: body.quantity ?? 1,
    p_reservation_type: "merch_checkout",
    p_user_id: auth.userId,
    p_redemption_id: null,
    p_expires_minutes: body.expiresMinutes ?? 15,
  });

  if (error) {
    const status = error.message.toLowerCase().includes("insufficient") ? 409 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ reservation_id: data });
}

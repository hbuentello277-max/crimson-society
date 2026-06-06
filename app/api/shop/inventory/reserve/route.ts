import { NextResponse } from "next/server";
import { createAdminServiceClient } from "@/lib/admin-api";
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
      { error: "Your account is not eligible to reserve inventory." },
      { status: 403 },
    );
  }

  const admin = createAdminServiceClient();
  const quantity = Math.trunc(Number(body.quantity ?? 1));
  if (!Number.isFinite(quantity) || quantity < 1) {
    return NextResponse.json({ error: "quantity must be at least 1" }, { status: 400 });
  }

  const requestedExpires = Math.trunc(Number(body.expiresMinutes ?? 15));
  const expiresMinutes = Number.isFinite(requestedExpires)
    ? Math.min(Math.max(requestedExpires, 1), 30)
    : 15;

  const { data, error } = await admin.rpc("product_inventory_reserve", {
    p_product_id: productId,
    p_size_label: body.size?.trim() || null,
    p_quantity: quantity,
    p_reservation_type: "merch_checkout",
    p_user_id: auth.userId,
    p_redemption_id: null,
    p_expires_minutes: expiresMinutes,
  });

  if (error) {
    const status = error.message.toLowerCase().includes("insufficient") ? 409 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ reservation_id: data });
}

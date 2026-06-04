import { NextResponse } from "next/server";
import { getAuthedSupabaseFromRequest } from "@/lib/supabase-route-auth";
import { getSizeAvailable, parseSizeInventory } from "@/lib/shop/inventory";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId")?.trim();
  const size = searchParams.get("size")?.trim() ?? null;

  if (!productId) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }

  const auth = await getAuthedSupabaseFromRequest(request);
  const client = auth.ok ? auth.supabase : null;

  if (!client) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await client
    .from("products")
    .select("id, size_inventory, inventory_remaining, status, sizes")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const map = parseSizeInventory(data.size_inventory);
  const availableForSize = size ? getSizeAvailable(map, size) : data.inventory_remaining;

  return NextResponse.json({
    product_id: data.id,
    size,
    available: availableForSize,
    purchasable: availableForSize === null || availableForSize > 0,
    status: data.status,
  });
}

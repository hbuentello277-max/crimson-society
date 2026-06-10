import { NextResponse } from "next/server";
import { createAdminServiceClient, requireAdminSession } from "@/lib/admin-api";
import { notifyAdminLowInventory } from "@/lib/shop/inventory-notifications";
import { parseSizeInventory } from "@/lib/shop/inventory";

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  let body: { product_id?: string; size_inventory?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const productId = body.product_id?.trim();
  if (!productId) {
    return NextResponse.json({ error: "product_id is required" }, { status: 400 });
  }

  const inventory = body.size_inventory;
  const validInventory =
    inventory === null ||
    (typeof inventory === "object" && !Array.isArray(inventory));

  if (!validInventory) {
    return NextResponse.json(
      { error: "size_inventory must be an object or null" },
      { status: 400 },
    );
  }

  const admin = createAdminServiceClient();
  const { error } = await admin.rpc("product_inventory_apply_map", {
    p_product_id: productId,
    p_size_inventory: inventory,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data: product, error: fetchError } = await admin
    .from("products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const productName = String((product as { name?: string }).name ?? "Product");
  const sizeInventory = parseSizeInventory((product as { size_inventory?: unknown }).size_inventory);
  await notifyAdminLowInventory(admin, productId, productName, sizeInventory);

  return NextResponse.json({ ok: true, product });
}

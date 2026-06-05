import type { SupabaseClient } from "@supabase/supabase-js";

export async function archiveShopOrder(
  admin: SupabaseClient,
  orderId: string,
  archivedBy: string,
) {
  const { data, error } = await admin
    .from("shop_orders")
    .update({
      archived_at: new Date().toISOString(),
      archived_by: archivedBy,
    })
    .eq("id", orderId)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false as const, error: error.message };
  }

  if (!data) {
    return { ok: false as const, error: "Order not found or already archived." };
  }

  return { ok: true as const };
}

export async function unarchiveShopOrder(admin: SupabaseClient, orderId: string) {
  const { data, error } = await admin
    .from("shop_orders")
    .update({
      archived_at: null,
      archived_by: null,
    })
    .eq("id", orderId)
    .not("archived_at", "is", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false as const, error: error.message };
  }

  if (!data) {
    return { ok: false as const, error: "Order not found or not archived." };
  }

  return { ok: true as const };
}

export function shopOrderPermanentDeleteAllowed() {
  if (process.env.ALLOW_SHOP_ORDER_DELETE === "true") return true;
  return process.env.NODE_ENV !== "production";
}

/** Permanent delete — dev/local only. Does not reverse inventory. */
export async function permanentlyDeleteShopOrder(admin: SupabaseClient, orderId: string) {
  if (!shopOrderPermanentDeleteAllowed()) {
    return { ok: false as const, error: "Permanent delete is disabled in production." };
  }

  await admin.from("shop_order_email_events").delete().eq("order_id", orderId);
  await admin.from("shop_order_items").delete().eq("order_id", orderId);

  const { error } = await admin.from("shop_orders").delete().eq("id", orderId);
  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}

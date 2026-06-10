import type { SupabaseClient } from "@supabase/supabase-js";
import { loadActiveAdminUserIds } from "@/lib/admin/admin-user-ids";
import { adminShopPath } from "@/lib/notifications";
import { adminLowInventoryGroupKey } from "@/lib/notifications/grouping";
import {
  getInventoryBadgeLevel,
  sumInventory,
  type SizeInventoryMap,
} from "@/lib/shop/inventory";

/** Notify admins when product inventory drops to low or critical levels. */
export async function notifyAdminLowInventory(
  admin: SupabaseClient,
  productId: string,
  productName: string,
  sizeInventory: SizeInventoryMap | null,
) {
  const totals = sumInventory(sizeInventory);
  const level = getInventoryBadgeLevel(totals?.available ?? null);
  if (level !== "low_stock" && level !== "critical" && level !== "out_of_stock") {
    return { notified: 0 };
  }

  const adminIds = await loadActiveAdminUserIds(admin);
  if (adminIds.length === 0) {
    return { notified: 0 };
  }

  const label = productName.trim() || "A product";
  const body =
    level === "out_of_stock"
      ? `${label} is out of stock.`
      : level === "critical"
        ? `${label} is very low on stock.`
        : `${label} is running low on stock.`;

  const targetUrl = adminShopPath();
  let notified = 0;

  for (const adminId of adminIds) {
    const { error } = await admin.rpc("upsert_grouped_notification", {
      p_user_id: adminId,
      p_type: "admin_low_inventory",
      p_title: "Low inventory",
      p_body: body,
      p_notification_group_key: adminLowInventoryGroupKey(productId, adminId),
      p_actor_id: null,
      p_ride_id: null,
      p_conversation_id: null,
      p_post_id: null,
      p_comment_id: null,
      p_deletion_request_id: null,
      p_target_url: targetUrl,
      p_destination_url: targetUrl,
      p_metadata: {
        entity_type: "admin_low_inventory",
        entity_id: productId,
        product_id: productId,
        route: targetUrl,
      },
      p_preview_text: body,
      p_grouped_body_template: null,
    });

    if (!error) {
      notified += 1;
    }
  }

  return { notified };
}

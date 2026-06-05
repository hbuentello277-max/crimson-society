import type { SupabaseClient } from "@supabase/supabase-js";

const STALE_ORDER_SCAN_LIMIT = 50;
export const MERCH_CHECKOUT_RESERVATION_MINUTES = 15;

type PendingOrderRow = {
  id: string;
  created_at: string;
};

type OrderItemReservationRow = {
  reservation_id: string | null;
  product_inventory_reservations:
    | {
        status: string | null;
        expires_at: string | null;
      }
    | Array<{
        status: string | null;
        expires_at: string | null;
      }>
    | null;
};

export type MerchReservationCleanupResult = {
  released_count: number;
  cancelled_order_count: number;
};

function staleOrderCutoffIso() {
  return new Date(Date.now() - MERCH_CHECKOUT_RESERVATION_MINUTES * 60 * 1000).toISOString();
}

async function cancelStalePendingOrders(
  admin: SupabaseClient,
): Promise<{ cancelled_order_count: number }> {
  const { data: orders, error: ordersError } = await admin
    .from("shop_orders")
    .select("id, created_at")
    .eq("status", "pending")
    .lt("created_at", staleOrderCutoffIso())
    .order("created_at", { ascending: true })
    .limit(STALE_ORDER_SCAN_LIMIT);

  if (ordersError) {
    throw new Error(ordersError.message);
  }

  let cancelledOrderCount = 0;

  for (const order of (orders ?? []) as PendingOrderRow[]) {
    const { data: items, error: itemsError } = await admin
      .from("shop_order_items")
      .select(
        "reservation_id, product_inventory_reservations(status, expires_at)",
      )
      .eq("order_id", order.id);

    if (itemsError) {
      throw new Error(itemsError.message);
    }

    const rows = (items ?? []) as OrderItemReservationRow[];
    const hasActiveReservation = rows.some(
      (row) => {
        const reservation = Array.isArray(row.product_inventory_reservations)
          ? row.product_inventory_reservations[0]
          : row.product_inventory_reservations;

        return reservation?.status === "active";
      },
    );

    if (hasActiveReservation) {
      continue;
    }

    const { error: cancelError } = await admin
      .from("shop_orders")
      .update({
        status: "cancelled",
        fulfillment_status: "cancelled",
        pickup_status: "cancelled",
      })
      .eq("id", order.id)
      .eq("status", "pending");

    if (cancelError) {
      throw new Error(cancelError.message);
    }

    cancelledOrderCount += 1;
  }

  return { cancelled_order_count: cancelledOrderCount };
}

export async function cleanupExpiredMerchReservations(
  admin: SupabaseClient,
): Promise<MerchReservationCleanupResult> {
  const { data, error } = await admin.rpc("product_inventory_expire_stale_reservations");

  if (error) {
    throw new Error(error.message);
  }

  const staleOrders = await cancelStalePendingOrders(admin);

  return {
    released_count: typeof data === "number" ? data : 0,
    cancelled_order_count: staleOrders.cancelled_order_count,
  };
}

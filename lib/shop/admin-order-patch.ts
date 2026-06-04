import type { ShopFulfillmentStatus } from "@/lib/shop/orders";
import { isShopFulfillmentStatus } from "@/lib/shop/orders";

export type AdminShopOrderPatch = {
  fulfillment_status?: ShopFulfillmentStatus;
  tracking_carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  admin_fulfillment_note?: string | null;
  customer_note?: string | null;
};

export function sanitizeAdminShopOrderPatch(body: unknown): AdminShopOrderPatch {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }

  const input = body as Record<string, unknown>;
  const patch: AdminShopOrderPatch = {};

  if (input.fulfillment_status !== undefined) {
    const value = String(input.fulfillment_status);
    if (!isShopFulfillmentStatus(value)) {
      throw new Error("Invalid fulfillment_status");
    }
    patch.fulfillment_status = value;
  }

  if (input.tracking_carrier !== undefined) {
    patch.tracking_carrier =
      input.tracking_carrier == null || input.tracking_carrier === ""
        ? null
        : String(input.tracking_carrier).trim();
  }

  if (input.tracking_number !== undefined) {
    patch.tracking_number =
      input.tracking_number == null || input.tracking_number === ""
        ? null
        : String(input.tracking_number).trim();
  }

  if (input.tracking_url !== undefined) {
    patch.tracking_url =
      input.tracking_url == null || input.tracking_url === ""
        ? null
        : String(input.tracking_url).trim();
  }

  if (input.admin_fulfillment_note !== undefined) {
    patch.admin_fulfillment_note =
      input.admin_fulfillment_note == null || input.admin_fulfillment_note === ""
        ? null
        : String(input.admin_fulfillment_note).trim();
  }

  if (input.customer_note !== undefined) {
    patch.customer_note =
      input.customer_note == null || input.customer_note === ""
        ? null
        : String(input.customer_note).trim();
  }

  if (Object.keys(patch).length === 0) {
    throw new Error("No valid fields to update");
  }

  return patch;
}

export function buildAdminOrderUpdateRow(
  patch: AdminShopOrderPatch,
  existing?: { fulfilled_at?: string | null; shipped_at?: string | null },
): Record<string, unknown> {
  const row: Record<string, unknown> = { ...patch };

  if (patch.fulfillment_status === "fulfilled" && !existing?.fulfilled_at) {
    row.fulfilled_at = new Date().toISOString();
  }

  if (patch.fulfillment_status === "shipped") {
    row.shipped_at = existing?.shipped_at ?? new Date().toISOString();
    if (!existing?.fulfilled_at) {
      row.fulfilled_at = new Date().toISOString();
    }
  }

  return row;
}

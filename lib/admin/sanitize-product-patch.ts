import type { Product, ProductStatus, ProductType } from "@/lib/products";
import type { SizeInventoryMap } from "@/lib/shop/inventory";

const PRODUCT_STATUSES: ProductStatus[] = [
  "in_stock",
  "out_of_stock",
  "waitlist",
  "coming_soon",
  "archived",
];

const PRODUCT_TYPES: ProductType[] = ["cash_product", "credit_reward"];

/** Columns allowed on public.products — excludes reward mirror fields like is_active. */
export type ProductRowPatch = {
  name?: string;
  slug?: string;
  tagline?: string;
  description?: string;
  price?: number;
  category?: Product["category"];
  images?: string[];
  sizes?: string[];
  badge?: Product["badge"];
  status?: ProductStatus;
  sort_order?: number;
  product_type?: ProductType;
  credit_cost?: number | null;
  reward_category?: Product["reward_category"];
  reward_kind?: Product["reward_kind"];
  requires_shirt_size?: boolean;
  inventory_total?: number | null;
  inventory_remaining?: number | null;
  size_inventory?: SizeInventoryMap | null;
  linked_merch_product_id?: string | null;
};

function isProductStatus(value: unknown): value is ProductStatus {
  return typeof value === "string" && PRODUCT_STATUSES.includes(value as ProductStatus);
}

function isProductType(value: unknown): value is ProductType {
  return typeof value === "string" && PRODUCT_TYPES.includes(value as ProductType);
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function toNullableInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

/** USD dollars with up to 2 decimal places (matches products.price numeric(10,2)). */
function toPriceDollars(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(n * 100) / 100;
}

/**
 * Validates and whitelists product writes for Supabase.
 * Prevents accidental fields (e.g. is_active text) from reaching products.
 */
export function sanitizeProductPatch(
  patch: Partial<Product> & { is_active?: unknown },
): ProductRowPatch {
  const out: ProductRowPatch = {};

  if (patch.name !== undefined) out.name = String(patch.name).trim();
  if (patch.slug !== undefined) out.slug = String(patch.slug).trim();
  if (patch.tagline !== undefined) out.tagline = String(patch.tagline);
  if (patch.description !== undefined) out.description = String(patch.description);
  if (patch.price !== undefined) out.price = toPriceDollars(patch.price, 0);
  if (patch.category !== undefined) out.category = patch.category;
  if (patch.images !== undefined) out.images = Array.isArray(patch.images) ? patch.images : [];
  if (patch.sizes !== undefined) out.sizes = Array.isArray(patch.sizes) ? patch.sizes : [];
  if (patch.badge !== undefined) out.badge = patch.badge ?? null;
  if (patch.status !== undefined) {
    if (!isProductStatus(patch.status)) {
      throw new Error(`Invalid product status: ${String(patch.status)}`);
    }
    out.status = patch.status;
  }
  if (patch.sort_order !== undefined) out.sort_order = toInt(patch.sort_order, 0);
  if (patch.product_type !== undefined) {
    if (!isProductType(patch.product_type)) {
      throw new Error(`Invalid product type: ${String(patch.product_type)}`);
    }
    out.product_type = patch.product_type;
  }
  if (patch.credit_cost !== undefined) out.credit_cost = toNullableInt(patch.credit_cost);
  if (patch.reward_category !== undefined) {
    if (patch.reward_category !== null && patch.reward_category !== "cash" && patch.reward_category !== "community") {
      throw new Error(`Invalid reward category: ${String(patch.reward_category)}`);
    }
    out.reward_category = patch.reward_category;
  }
  if (patch.reward_kind !== undefined) out.reward_kind = patch.reward_kind;
  if (patch.requires_shirt_size !== undefined) {
    out.requires_shirt_size = toBoolean(patch.requires_shirt_size);
  }
  if (patch.inventory_total !== undefined) out.inventory_total = toNullableInt(patch.inventory_total);
  if (patch.inventory_remaining !== undefined) {
    out.inventory_remaining = toNullableInt(patch.inventory_remaining);
  }
  if (patch.size_inventory !== undefined) {
    out.size_inventory = patch.size_inventory;
  }
  if (patch.linked_merch_product_id !== undefined) {
    const value = patch.linked_merch_product_id;
    out.linked_merch_product_id =
      value === null || value === "" ? null : String(value).trim() || null;
  }

  return out;
}

export function buildProductInsertRow(
  patch: Partial<Product>,
  options: { sortOrderDefault: number },
): ProductRowPatch & { name: string; slug: string } {
  const isCreditReward = patch.product_type === "credit_reward";
  const sanitized = sanitizeProductPatch(patch);

  return {
    ...sanitized,
    name: sanitized.name?.trim() || "Untitled",
    slug:
      sanitized.slug?.trim() ||
      `${isCreditReward ? "reward" : "merch"}-${Date.now()}`,
    tagline: sanitized.tagline ?? "",
    description: sanitized.description ?? "",
    price: sanitized.price ?? 0,
    category: sanitized.category ?? (isCreditReward ? "accessories" : "tees"),
    status: sanitized.status ?? "coming_soon",
    badge: sanitized.badge ?? (isCreditReward ? null : "new"),
    sizes: sanitized.sizes ?? (isCreditReward ? [] : ["S", "M", "L", "XL"]),
    images: sanitized.images ?? [],
    sort_order: sanitized.sort_order ?? options.sortOrderDefault,
    product_type: sanitized.product_type ?? "cash_product",
    credit_cost: isCreditReward ? (sanitized.credit_cost ?? 100) : null,
    reward_category: isCreditReward ? (sanitized.reward_category ?? "community") : null,
    reward_kind: isCreditReward ? (sanitized.reward_kind ?? "physical") : null,
    requires_shirt_size: sanitized.requires_shirt_size ?? false,
    inventory_remaining: sanitized.inventory_remaining ?? null,
    inventory_total: sanitized.inventory_total ?? null,
    size_inventory: sanitized.size_inventory ?? null,
  };
}

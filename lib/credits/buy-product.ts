import type { CreditsRewardBuyProduct } from "@/lib/credits/rewards-api-types";
import type { Product } from "@/lib/products";
import { getSizeAvailable, parseSizeInventory, type SizeInventoryMap } from "@/lib/shop/inventory";

const BUYABLE_STATUSES = new Set(["in_stock", "waitlist"]);

export function isBuyProductRowPurchasable(
  row: Pick<Product, "product_type" | "status" | "price">,
): boolean {
  return (
    row.product_type === "cash_product" &&
    BUYABLE_STATUSES.has(row.status) &&
    Number(row.price) > 0
  );
}

export function mapProductToBuyProduct(row: Product): CreditsRewardBuyProduct | null {
  if (!isBuyProductRowPurchasable(row)) {
    return null;
  }

  return {
    product_id: row.id,
    slug: row.slug,
    title: row.name,
    price: Number(row.price),
    requires_shirt_size: Boolean(row.requires_shirt_size) || (row.sizes?.length ?? 0) > 0,
    sizes: row.sizes ?? [],
    size_inventory: parseSizeInventory(row.size_inventory),
    inventory_remaining: row.inventory_remaining,
  };
}

export function isBuyProductPurchasable(
  buyProduct: CreditsRewardBuyProduct,
  selectedShirtSize: string | null,
): boolean {
  if (buyProduct.price <= 0) {
    return false;
  }

  if (buyProduct.requires_shirt_size) {
    if (!selectedShirtSize) {
      return false;
    }
    if (buyProduct.size_inventory) {
      const available = getSizeAvailable(buyProduct.size_inventory, selectedShirtSize);
      if (available !== null && available <= 0) {
        return false;
      }
    }
    return true;
  }

  if (buyProduct.inventory_remaining !== null && buyProduct.inventory_remaining <= 0) {
    return false;
  }

  return true;
}

export function buyProductSizeInventory(
  buyProduct: CreditsRewardBuyProduct | null | undefined,
): SizeInventoryMap | null {
  return buyProduct?.size_inventory ?? null;
}

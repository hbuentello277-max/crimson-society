import type { CrimsonCreditRewardCategory, CrimsonCreditRedemptionStatus } from "@/lib/credits/types";
import type { CreditsRewardBuyProduct } from "@/lib/credits/rewards-api-types";
import { isBuyProductPurchasable } from "@/lib/credits/buy-product";
import { getSizeAvailable, type SizeInventoryMap } from "@/lib/shop/inventory";

export const CRIMSON_CREDIT_SHIRT_SIZES = ["S", "M", "L", "XL", "2XL"] as const;

export type CrimsonCreditShirtSize = (typeof CRIMSON_CREDIT_SHIRT_SIZES)[number];

export function isCrimsonCreditShirtSize(value: string): value is CrimsonCreditShirtSize {
  return (CRIMSON_CREDIT_SHIRT_SIZES as readonly string[]).includes(value);
}

export function formatRewardCategoryLabel(category: CrimsonCreditRewardCategory) {
  return category === "cash" ? "Store Credit" : "Community";
}

export function formatRedemptionStatusLabel(status: CrimsonCreditRedemptionStatus) {
  switch (status) {
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "fulfilled":
      return "Fulfilled";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export type RewardActionState =
  | { kind: "upgrade"; buyProduct?: CreditsRewardBuyProduct | null }
  | { kind: "redeem" }
  | { kind: "buy"; buyProduct: CreditsRewardBuyProduct; showInsufficientCredits?: boolean }
  | { kind: "disabled"; message: string };

export function getRewardActionState(input: {
  canRedeem: boolean;
  balance: number;
  creditCost: number;
  rewardCategory: CrimsonCreditRewardCategory;
  monthlyCashUsed: number;
  monthlyCashCap: number;
  inventoryRemaining: number | null;
  sizeInventory?: SizeInventoryMap | null;
  requiresShirtSize: boolean;
  selectedShirtSize: string | null;
  buyProduct?: CreditsRewardBuyProduct | null;
}): RewardActionState {
  const buyProduct = input.buyProduct ?? null;
  const buyReady =
    buyProduct !== null && isBuyProductPurchasable(buyProduct, input.selectedShirtSize);

  if (!input.canRedeem) {
    return { kind: "upgrade", buyProduct: buyReady ? buyProduct : null };
  }

  const sizeMap = input.sizeInventory ?? null;

  if (input.requiresShirtSize && input.selectedShirtSize && sizeMap) {
    const available = getSizeAvailable(sizeMap, input.selectedShirtSize);
    if (available !== null && available <= 0) {
      return { kind: "disabled", message: "Size out of stock" };
    }
  }

  if (input.inventoryRemaining !== null && input.inventoryRemaining <= 0) {
    return { kind: "disabled", message: "Out of stock" };
  }

  if (input.requiresShirtSize && !input.selectedShirtSize) {
    if (buyReady) {
      return { kind: "buy", buyProduct, showInsufficientCredits: input.balance < input.creditCost };
    }
    return { kind: "disabled", message: "Select a size" };
  }

  if (input.balance < input.creditCost) {
    if (buyReady) {
      return { kind: "buy", buyProduct, showInsufficientCredits: true };
    }
    return { kind: "disabled", message: "Not enough credits" };
  }

  if (
    input.rewardCategory === "cash" &&
    input.monthlyCashUsed + input.creditCost > input.monthlyCashCap
  ) {
    if (buyReady) {
      return { kind: "buy", buyProduct, showInsufficientCredits: true };
    }
    return { kind: "disabled", message: "Monthly store credit cap reached" };
  }

  return { kind: "redeem" };
}

/** Prefer buy-product size inventory when purchasing with cash. */
export function rewardSizeInventoryForAction(
  rewardSizeInventory: SizeInventoryMap | null | undefined,
  buyProduct: CreditsRewardBuyProduct | null | undefined,
): SizeInventoryMap | null {
  if (buyProduct?.size_inventory) {
    return buyProduct.size_inventory;
  }
  return rewardSizeInventory ?? null;
}

export function rewardRequiresShirtSizeForAction(
  rewardRequiresShirtSize: boolean,
  buyProduct: CreditsRewardBuyProduct | null | undefined,
  action: RewardActionState,
): boolean {
  if (action.kind === "buy" && buyProduct) {
    return buyProduct.requires_shirt_size;
  }
  return rewardRequiresShirtSize;
}

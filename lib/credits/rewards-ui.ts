import type { CrimsonCreditRewardCategory, CrimsonCreditRedemptionStatus } from "@/lib/credits/types";

export const CRIMSON_CREDIT_SHIRT_SIZES = ["S", "M", "L", "XL", "2XL"] as const;

export type CrimsonCreditShirtSize = (typeof CRIMSON_CREDIT_SHIRT_SIZES)[number];

export function isCrimsonCreditShirtSize(value: string): value is CrimsonCreditShirtSize {
  return (CRIMSON_CREDIT_SHIRT_SIZES as readonly string[]).includes(value);
}

export function formatRewardCategoryLabel(category: CrimsonCreditRewardCategory) {
  return category === "cash" ? "Cash" : "Community";
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
  | { kind: "upgrade" }
  | { kind: "redeem" }
  | { kind: "disabled"; message: string };

export function getRewardActionState(input: {
  canRedeem: boolean;
  balance: number;
  creditCost: number;
  rewardCategory: CrimsonCreditRewardCategory;
  monthlyCashUsed: number;
  monthlyCashCap: number;
  inventoryRemaining: number | null;
  requiresShirtSize: boolean;
  selectedShirtSize: string | null;
}): RewardActionState {
  if (!input.canRedeem) {
    return { kind: "upgrade" };
  }

  if (input.inventoryRemaining !== null && input.inventoryRemaining <= 0) {
    return { kind: "disabled", message: "Out of stock" };
  }

  if (input.balance < input.creditCost) {
    return { kind: "disabled", message: "Not enough credits" };
  }

  if (
    input.rewardCategory === "cash" &&
    input.monthlyCashUsed + input.creditCost > input.monthlyCashCap
  ) {
    return { kind: "disabled", message: "Monthly cash cap reached" };
  }

  if (input.requiresShirtSize && !input.selectedShirtSize) {
    return { kind: "disabled", message: "Select a size" };
  }

  return { kind: "redeem" };
}

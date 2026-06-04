import type {
  CrimsonCreditRewardCategory,
  CrimsonCreditRewardKind,
} from "@/lib/credits/types";

export function isRewardCategory(value: unknown): value is CrimsonCreditRewardCategory {
  return value === "cash" || value === "community";
}

export function isRewardKind(value: unknown): value is CrimsonCreditRewardKind {
  return value === "merch_discount" || value === "cash_value" || value === "physical";
}

export function slugifyRewardSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function defaultRewardKindForCategory(
  category: CrimsonCreditRewardCategory,
): CrimsonCreditRewardKind {
  return category === "cash" ? "merch_discount" : "physical";
}

export function isRedemptionStatus(value: unknown): value is "pending" | "approved" | "fulfilled" | "cancelled" {
  return (
    value === "pending" ||
    value === "approved" ||
    value === "fulfilled" ||
    value === "cancelled"
  );
}

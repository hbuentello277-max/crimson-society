import type {
  CrimsonCreditRedemptionRow,
  CrimsonCreditRewardKind,
  CrimsonCreditRewardCategory,
} from "@/lib/credits/types";
import type { SizeInventoryMap } from "@/lib/shop/inventory";

export type CreditsRewardsSummary = {
  credits_balance: number;
  stored_reward_value_usd: string;
  monthly_cash_redemption_used: number;
  monthly_cash_redemption_cap: number;
  can_redeem: boolean;
};

/** `id` is the crimson_credit_rewards row used by redeem RPC. */
export type CreditsRewardCatalogItem = {
  id: string;
  product_id: string;
  slug: string;
  title: string;
  description: string | null;
  credit_cost: number;
  reward_category: CrimsonCreditRewardCategory;
  reward_kind: CrimsonCreditRewardKind;
  metadata: Record<string, unknown>;
  image_url: string | null;
  inventory_total: number | null;
  inventory_remaining: number | null;
  size_inventory: SizeInventoryMap | null;
  requires_shirt_size: boolean;
  is_active: boolean;
  sort_order: number;
};

export type CreditsRewardsCatalogResponse = {
  rewards: CreditsRewardCatalogItem[];
  summary: CreditsRewardsSummary;
};

export type CreditsRedemptionsResponse = {
  redemptions: CrimsonCreditRedemptionRow[];
};

export type CreditsRedeemRewardRequest = {
  rewardId: string;
  shirtSize?: string | null;
};

export type CreditsRedeemRewardResponse = {
  ok: true;
  redemption_id: string;
  credits_spent: number;
  credits_balance: number;
  monthly_cash_redemption_used: number;
  monthly_cash_redemption_cap: number;
  reward_title: string;
};

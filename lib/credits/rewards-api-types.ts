import type {
  CrimsonCreditRedemptionRow,
  CrimsonCreditRewardRow,
} from "@/lib/credits/types";

export type CreditsRewardsSummary = {
  credits_balance: number;
  stored_reward_value_usd: string;
  monthly_cash_redemption_used: number;
  monthly_cash_redemption_cap: number;
  can_redeem: boolean;
};

export type CreditsRewardCatalogItem = CrimsonCreditRewardRow & {
  image_url: string | null;
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

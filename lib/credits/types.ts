export type CrimsonCreditsSummary = {
  credits_balance: number;
  lifetime_credits_earned: number;
  monthly_earned: number;
  monthly_cap: number;
};

export type CrimsonCreditsAccount = CrimsonCreditsSummary & {
  lifetime_credits_spent: number;
};

export type CrimsonCreditTransactionRow = {
  id: string;
  amount: number;
  transaction_type: string;
  reason: string | null;
  created_at: string;
};

export type OwnReferredUser = {
  id: string;
  username: string | null;
  display_name: string | null;
  signup_reward_awarded: boolean;
  blackcard_reward_awarded: boolean;
};

export type OwnReferralStats = {
  referral_code: string | null;
  total_referred: number;
  signup_rewards_earned: number;
  blackcard_rewards_earned: number;
  total_referral_credits_earned: number;
  referred_users: OwnReferredUser[];
};

export type AwardCrimsonCreditsResult = {
  awarded: number;
  duplicate?: boolean;
  capped?: boolean;
  monthly_earned: number;
  monthly_cap: number;
  credits_balance: number;
};

export type CrimsonCreditRewardCategory = "cash" | "community";

export type CrimsonCreditRewardKind = "merch_discount" | "cash_value" | "physical";

export type CrimsonCreditRedemptionStatus =
  | "pending"
  | "approved"
  | "fulfilled"
  | "cancelled";

export type CrimsonCreditRewardRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  credit_cost: number;
  reward_category: CrimsonCreditRewardCategory;
  reward_kind: CrimsonCreditRewardKind;
  metadata: Record<string, unknown>;
  image_path: string | null;
  inventory_total: number | null;
  inventory_remaining: number | null;
  requires_shirt_size: boolean;
  is_active: boolean;
  sort_order: number;
};

export type CrimsonCreditRedemptionRow = {
  id: string;
  user_id: string;
  reward_id: string;
  reward_slug: string;
  reward_title: string;
  reward_category: CrimsonCreditRewardCategory;
  reward_kind: CrimsonCreditRewardKind;
  credits_spent: number;
  status: CrimsonCreditRedemptionStatus;
  shirt_size: string | null;
  fulfillment_notes: string | null;
  debit_transaction_id: string | null;
  refund_transaction_id: string | null;
  created_at: string;
};

export type RedeemCrimsonCreditRewardResult = {
  ok: boolean;
  redemption_id: string;
  transaction_id: string;
  reward_id: string;
  reward_slug: string;
  credits_spent: number;
  status: CrimsonCreditRedemptionStatus;
  credits_balance: number;
  monthly_cash_redemption_used: number;
  monthly_cash_redemption_cap: number;
};

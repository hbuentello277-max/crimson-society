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

export type AdminCreditUserSnippet = {
  id: string;
  username: string | null;
  display_name: string | null;
  full_name?: string | null;
  email?: string | null;
  avatar_url: string | null;
  membership_label: string;
};

export type AdminCreditUserSummary = {
  user_id: string;
  credits_balance: number;
  lifetime_credits_earned: number;
  lifetime_credits_spent: number;
  monthly_earned: number;
  monthly_cap: number;
};

export type AdminCreditLedgerRow = {
  id: string;
  created_at: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  amount: number;
  transaction_type: string;
  reason: string | null;
  metadata: Record<string, unknown>;
  ride_id: string | null;
  referred_user_id: string | null;
  referred_username: string | null;
  referred_display_name: string | null;
};

export type AdminCreditBalanceRow = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  membership_label: string;
  credits_balance: number;
  lifetime_credits_earned: number;
  lifetime_credits_spent: number;
  monthly_earned: number;
  monthly_cap: number;
};

export type AdminCreditReferralRow = {
  referrer_id: string;
  referrer_username: string | null;
  referrer_display_name: string | null;
  referrer_avatar_url: string | null;
  referral_code: string | null;
  referred_user_id: string;
  referred_username: string | null;
  referred_display_name: string | null;
  referred_avatar_url: string | null;
  signup_reward_awarded: boolean;
  blackcard_reward_awarded: boolean;
  subscription_status: string | null;
  premium_tier: string | null;
};

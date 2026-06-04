export type CrimsonCreditsSummary = {
  credits_balance: number;
  lifetime_credits_earned: number;
  monthly_earned: number;
  monthly_cap: number;
};

export type AwardCrimsonCreditsResult = {
  awarded: number;
  duplicate?: boolean;
  capped?: boolean;
  monthly_earned: number;
  monthly_cap: number;
  credits_balance: number;
};
